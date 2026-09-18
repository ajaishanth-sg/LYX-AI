import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

MODELS_FILE = Path("app/data/models.json")
REDIS_MODELS_KEY = "lyx:models_config"

# Provider Available Models Catalog (Onyx-aligned dynamic models)
PROVIDER_MODELS_MAP: Dict[str, List[Dict[str, str]]] = {
    "groq": [
        {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B Versatile"},
        {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant"},
        {"id": "llama3-8b-8192", "name": "Llama 3 8B"},
    ],
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o (Latest)"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
    ],
    "gemini": [
        {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash"},
        {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
        {"id": "gemini-2.0-flash-exp", "name": "Gemini 2.0 Flash (Experimental)"},
    ],
    "ollama": [
        {"id": "llama3.2", "name": "Llama 3.2 (Local)"},
        {"id": "mistral", "name": "Mistral 7B (Local)"},
        {"id": "phi3", "name": "Phi 3 (Local)"},
        {"id": "gemma2", "name": "Gemma 2 (Local)"},
    ],
    "aws": [
        {"id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "name": "Claude 3.5 Sonnet (Bedrock)"},
        {"id": "anthropic.claude-3-haiku-20240307-v1:0", "name": "Claude 3 Haiku (Bedrock)"},
    ],
    "local": [
        {"id": "local-model", "name": "Custom / Local Model"}
    ]
}

DEFAULT_ONYX_MODELS: List[Dict[str, Any]] = []

def get_provider_available_models(provider: str) -> List[Dict[str, str]]:
    p = (provider or "groq").lower()
    return PROVIDER_MODELS_MAP.get(p, PROVIDER_MODELS_MAP["groq"])

from app.services.db import db_load_models, db_save_models

def _ensure_default_models(models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    existing_ids = {m.get("id") for m in models if m.get("id")}
    added = False
    for default_m in DEFAULT_ONYX_MODELS:
        if default_m["id"] not in existing_ids:
            models.insert(0, default_m)
            added = True
    if added:
        # Re-save updated catalog
        redis_service.set_json(REDIS_MODELS_KEY, models)
        try:
            db_save_models(models)
        except Exception:
            pass
        try:
            MODELS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(MODELS_FILE, "w", encoding="utf-8") as f:
                json.dump(models, f, indent=2)
        except Exception:
            pass
    return models

def load_models() -> List[Dict[str, Any]]:
    # 1. Try loading from Redis cache first
    cached_models = redis_service.get_json(REDIS_MODELS_KEY)
    if cached_models and isinstance(cached_models, list) and len(cached_models) > 0:
        return cached_models

    # 2. Try loading from PostgreSQL database
    db_models = db_load_models()
    if db_models and len(db_models) > 0:
        redis_service.set_json(REDIS_MODELS_KEY, db_models)
        return db_models

    # 3. Try loading from local file
    if MODELS_FILE.exists():
        try:
            with open(MODELS_FILE, "r", encoding="utf-8") as f:
                models = json.load(f)
                if models and isinstance(models, list) and len(models) > 0:
                    redis_service.set_json(REDIS_MODELS_KEY, models)
                    db_save_models(models)
                    return models
        except Exception as e:
            logger.error(f"Error loading models from {MODELS_FILE}: {e}")

    # 4. Fallback to Onyx default models catalog
    save_models(DEFAULT_ONYX_MODELS)
    return DEFAULT_ONYX_MODELS

def save_models(models: List[Dict[str, Any]]) -> None:
    # 1. Save to Redis
    redis_service.set_json(REDIS_MODELS_KEY, models)

    # 2. Save to PostgreSQL database
    try:
        db_save_models(models)
    except Exception as e:
        logger.error(f"Failed to sync models to PostgreSQL: {e}")

    # 3. Save to file
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

    if model_id:
        for m in models:
            if m.get("id") == model_id or m.get("name") == model_id:
                return m

    # Return the most recently added model by default
    return models[-1]

def add_model(
    name: str, 
    api_key: str, 
    provider: str = "groq", 
    base_url: str = "",
    display_name: Optional[str] = None,
    is_visible: bool = True,
    max_input_tokens: Optional[int] = 128000,
    supports_image_input: bool = False,
    supports_reasoning: bool = False
) -> Dict[str, Any]:
    models = load_models()
    target_id = name.lower().replace(" ", "-")
    
    updated = False
    target_model = None
    for m in models:
        if m.get("name") == name or m.get("id") == target_id:
            m["api_key"] = api_key
            m["provider"] = provider
            m["base_url"] = base_url
            if display_name:
                m["display_name"] = display_name
            m["is_visible"] = is_visible
            if max_input_tokens:
                m["max_input_tokens"] = max_input_tokens
            m["supports_image_input"] = supports_image_input
            m["supports_reasoning"] = supports_reasoning
            updated = True
            target_model = m
            break

    if not updated:
        target_model = {
            "id": target_id,
            "name": name,
            "display_name": display_name or name,
            "api_key": api_key,
            "provider": provider,
            "base_url": base_url,
            "is_visible": is_visible,
            "is_default": False,
            "max_input_tokens": max_input_tokens,
            "supports_image_input": supports_image_input,
            "supports_reasoning": supports_reasoning
        }
        models.append(target_model)

    save_models(models)
    
    # Cache individual model and provider API key in Redis
    redis_service.set_json(f"lyx:model:{target_id}", target_model)
    if api_key and api_key.strip():
        redis_service.set(f"lyx:api_key:{provider}", api_key.strip())
        redis_service.set("lyx:global_api_key", api_key.strip())

    return target_model

def delete_model(model_id: str) -> bool:
    import urllib.parse
    models = load_models()
    clean_target = urllib.parse.unquote(model_id or "").strip().lower()
    
    filtered = [
        m for m in models 
        if (m.get("id") or "").strip().lower() != clean_target 
        and (m.get("name") or "").strip().lower() != clean_target
    ]

    if len(filtered) < len(models):
        # 1. Update Redis cache with remaining models
        redis_service.set_json(REDIS_MODELS_KEY, filtered)
        redis_service.delete(f"lyx:model:{model_id}")
        redis_service.delete(f"lyx:model:{clean_target}")

        # 2. Delete row from PostgreSQL database
        try:
            from app.services.db import db_delete_model
            db_delete_model(model_id)
            db_delete_model(clean_target)
        except Exception as e:
            logger.error(f"Error deleting model from PostgreSQL: {e}")

        # 3. Save remaining list to local file
        MODELS_FILE.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(MODELS_FILE, "w", encoding="utf-8") as f:
                json.dump(filtered, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving models to {MODELS_FILE}: {e}")
            raise e

        return True
    return False
