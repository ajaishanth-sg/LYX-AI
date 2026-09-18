import os
import sys

sys.path.insert(0, os.path.abspath(".")) 

from fastapi.testclient import TestClient
from app.main import app

def test_image_generation_api():
    print("Testing /api/v1/conversation/message-text with an image query...")
    
    with TestClient(app) as client:
        # We need a dummy session start first
        start_res = client.post("/api/v1/conversation/start")
    start_data = start_res.json()
    session_id = start_data["data"]["session_id"]
    
    payload = {
        "session_id": session_id,
        "message": "Generate an image of a red sports car driving in the futuristic city",
        "model_id": "meta-llama/llama-3.1-8b-instruct" 
    }
    
    res = client.post("/api/v1/conversation/message-text", json=payload)
    print("Status Code:", res.status_code)
    try:
        response_data = res.json()
        print("Response JSON:")
        print(response_data)
        if "![AI Generated" in response_data.get("data", {}).get("response_text", ""):
            print("\n✅ SUCCESS: The API correctly returned a Markdown image for generation!")
        else:
            print("\n❌ FAILED: The API did not return the expected Markdown image format.")
    except Exception as e:
        print("Error parsing response:", e)

if __name__ == "__main__":
    test_image_generation_api()
