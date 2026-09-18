import json
import logging
import urllib.parse
import httpx
from typing import Optional
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

IMAGE_CLASSIFICATION_PROMPT = """
You are an image request classifier.
The user's message might be asking to generate, show, or retrieve an image.
Analyze the user's message and return a JSON object with the following fields:
- "is_image_request": true if the user wants an image, false otherwise.
- "type": "retrieve" if it's a request for a real-world entity, animal, place, or existing concept. "generate" if it's a request for a surreal, imaginary, creative, or complex scene that requires AI generation.
- "search_query": A clean, concise search term or prompt for the image (without conversational filler like "show me").

Example 1:
User: "Show me a Siberian Husky"
Output: {"is_image_request": true, "type": "retrieve", "search_query": "Siberian Husky"}

Example 2:
User: "Create a realistic cat astronaut walking on Mars"
Output: {"is_image_request": true, "type": "generate", "search_query": "realistic cat astronaut walking on Mars"}

Example 3:
User: "Hello, how are you?"
Output: {"is_image_request": false, "type": null, "search_query": null}

Return ONLY valid JSON.
"""

class ImageService:
    async def check_and_process_image_request(
        self, user_prompt: str, llm_service: LLMService, model_id: Optional[str]
    ) -> Optional[str]:
        """
        Checks if the user prompt is an image request. 
        If yes, processes it via Retrieval or AI Generation and returns a Markdown response.
        If no, returns None.
        """
        try:
            # 1. Classify the intent
            response_json_str = await llm_service.generate_reply_async(
                persona_prompt=IMAGE_CLASSIFICATION_PROMPT,
                history=[],
                user_message=user_prompt,
                model_id=model_id,
            )
            
            # Clean up response in case LLM added markdown formatting around JSON
            clean_str = response_json_str.strip()
            if clean_str.startswith("```json"):
                clean_str = clean_str[7:-3].strip()
            elif clean_str.startswith("```"):
                clean_str = clean_str[3:-3].strip()
                
            data = json.loads(clean_str)
            
            if not data.get("is_image_request"):
                return None
                
            req_type = data.get("type", "generate")
            search_query = data.get("search_query", user_prompt)
            
            # 2. Process based on classification
            if req_type == "retrieve":
                logger.info(f"Image request classified as RETRIEVE for: {search_query}")
                return await self._retrieve_image(search_query)
            else:
                logger.info(f"Image request classified as GENERATE for: {search_query}")
                return await self._generate_image(search_query)
                
        except json.JSONDecodeError:
            logger.warning("Failed to decode LLM response for image classification.", exc_info=True)
            return None
        except Exception as e:
            logger.error(f"Error processing image request: {e}")
            return None

    async def _retrieve_image(self, query: str) -> str:
        """Retrieves a real image from Wikipedia or falls back to LoremFlickr."""
        try:
            encoded_query = urllib.parse.quote(query)
            # Try Wikipedia API first
            wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={encoded_query}&gsrnamespace=0&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json"
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(wiki_url)
                if response.status_code == 200:
                    data = response.json()
                    pages = data.get("query", {}).get("pages", {})
                    if pages:
                        page = list(pages.values())[0]
                        image_info = page.get("thumbnail")
                        if image_info and "source" in image_info:
                            source_url = image_info["source"]
                            return f"Here is the image you requested (Source: Wikimedia Commons):\n\n![{query}]({source_url})"
        except Exception as e:
            logger.warning(f"Wikipedia image retrieval failed: {e}")
            
        # Fallback to a placeholder stock service
        encoded_query = urllib.parse.quote(query)
        fallback_url = f"https://loremflickr.com/800/600/{encoded_query}"
        return f"Here is the retrieved image:\n\n![{query}]({fallback_url})"

    async def _generate_image(self, query: str) -> str:
        """Uses Hugging Face free Inference API to generate an image."""
        import os
        import uuid
        from app.config import MEDIA_DIR
        
        hf_token = os.getenv("HF_TOKEN")
        if not hf_token:
            return "⚠️ API Key missing: Please add HF_TOKEN to your .env file."
            
        url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
        headers = {"Authorization": f"Bearer {hf_token}"}
        payload = {"inputs": query}
        
        images_dir = MEDIA_DIR / "images"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{uuid.uuid4().hex}.jpg"
        filepath = images_dir / filename
        
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 503:
                    # Model loading usually triggers 503 with estimated time
                    logger.warning(f"HF API Model Loading: {response.text}")
                    return "⚠️ The AI image model is currently waking up on Hugging Face. Please try again in about 30 seconds!"
                elif response.status_code != 200:
                    logger.error(f"HF API Error: {response.text}")
                    return f"⚠️ Failed to generate image (Status {response.status_code}). Try again in a few moments."
                    
                with open(filepath, "wb") as f:
                    f.write(response.content)
                    
                # The media endpoint in main.py mounts MEDIA_DIR at /media/responses
                return f"Here is the AI-generated image (No Watermark):\n\n![AI Generated {query}](/media/responses/images/{filename})"
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return "⚠️ Failed to connect to the image generation service."

image_service = ImageService()
