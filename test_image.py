import asyncio
import os
import sys

# Ensure the root directory is in sys.path
sys.path.insert(0, os.path.abspath(".")) 

from app.services.image_service import image_service
from app.services.llm_service import LLMService
from app.config import GROQ_MODEL, GROQ_API_KEY
from dotenv import load_dotenv

load_dotenv()

async def run_tests():
    llm_service = LLMService(api_key=os.getenv("GROQ_API_KEY", "dummy"), model=os.getenv("GROQ_MODEL", "meta-llama/llama-3.1-8b-instruct"))
    
    print("\n--- Test 1: Normal Query ---")
    res1 = await image_service.check_and_process_image_request("hello how are you", llm_service, None)
    print("Result:", res1)
    
    print("\n--- Test 2: Retrieval ---")
    res2 = await image_service.check_and_process_image_request("show me a siberian husky", llm_service, None)
    print("Result:", res2)
    
    print("\n--- Test 3: AI Generation ---")
    res3 = await image_service.check_and_process_image_request("generate an image of a futuristic pharmaceutical laboratory", llm_service, None)
    print("Result:", res3)

if __name__ == "__main__":
    asyncio.run(run_tests())
