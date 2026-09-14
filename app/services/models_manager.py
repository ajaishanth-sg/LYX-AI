import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

MODELS_FILE = Path("app/data/models.json")

def load_models() -> List[Dict[str, Any]]:
    if not MODELS_FILE.exists():
        return []
    try:
        with open(MODELS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading models from {MODELS_FILE}: {e}")
        return []

def save_models(models: List[Dict[str, Any]]) -> None:
    MODELS_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        with open(MODELS_FILE, "w", encoding="utf-8") as f:
            json.dump(models, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving models to {MODELS_FILE}: {e}")
        raise e

def get_model(model_id: Optional[str]) -> Optional[Dict[str, Any]]:
    models = load_models()
    if not models:
        return None
    if not model_id:
        return models[0]
    for m in models:
        if m["id"] == model_id or m["name"] == model_id:
            return m
    return None

def add_model(name: str, api_key: str, provider: str = "groq", base_url: str = "") -> Dict[str, Any]:
    models = load_models()
    target_id = name.lower().replace(" ", "-")
    # Check if a model with the same name or id already exists
    for m in models:
        if m["name"] == name or m["id"] == target_id:
            m["api_key"] = api_key
            m["provider"] = provider
            m["base_url"] = base_url
            save_models(models)
            return m
            
    # Add new model
    new_model = {
        "id": target_id,
        "name": name,
        "api_key": api_key,
        "provider": provider,
        "base_url": base_url
    }
    models.append(new_model)
    save_models(models)
    return new_model

def delete_model(model_id: str) -> bool:
    models = load_models()
    filtered = [m for m in models if m["id"] != model_id and m["name"] != model_id]
    if len(filtered) < len(models):
        save_models(filtered)
        return True
    return False
