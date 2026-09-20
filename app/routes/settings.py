import logging

from fastapi import APIRouter, Request

from app.models.schemas import ApiResponse, ErrorDetail, PersonaSettingsRequest, PersonaSettingsData
from app.services.conversation_manager import ConversationManager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.post("/persona", response_model=ApiResponse[PersonaSettingsData])
async def set_persona(request: Request, payload: PersonaSettingsRequest) -> ApiResponse[PersonaSettingsData]:
    conversation_manager: ConversationManager = request.app.state.conversation_manager

    # Empty string is valid — it means "no custom persona / default assistant".
    conversation_manager.set_persona(payload.persona_prompt or "")
    return ApiResponse(success=True, data=PersonaSettingsData(saved=True, persona_prompt=payload.persona_prompt))


@router.get("/persona", response_model=ApiResponse[PersonaSettingsData])
async def get_persona(request: Request) -> ApiResponse[PersonaSettingsData]:
    conversation_manager: ConversationManager = request.app.state.conversation_manager
    persona = conversation_manager.get_persona()
    return ApiResponse(success=True, data=PersonaSettingsData(saved=True, persona_prompt=persona))

from app.models.schemas import CustomModel, CustomModelRequest
from typing import List, Dict
from app.services.models_manager import load_models, add_model, delete_model, get_provider_available_models

@router.get("/provider-models/{provider}", response_model=ApiResponse[List[Dict[str, str]]])
async def get_provider_models(provider: str) -> ApiResponse[List[Dict[str, str]]]:
    models = get_provider_available_models(provider)
    return ApiResponse(success=True, data=models)

@router.get("/models", response_model=ApiResponse[List[CustomModel]])
async def get_models() -> ApiResponse[List[CustomModel]]:
    from app.services.redis_service import redis_service
    from datetime import datetime
    today = datetime.now()
    today_str = today.strftime('%Y-%m-%d')
    month_str = today.strftime('%Y-%m')
    models = load_models()
    for m in models:
        model_id = m.get('id')
        total = redis_service.get(f"lyx:usage:{model_id}:tokens")
        daily = redis_service.get(f"lyx:usage:{model_id}:daily:{today_str}")
        monthly = redis_service.get(f"lyx:usage:{model_id}:monthly:{month_str}")
        
        m["tokens_used_total"] = int(total) if total else 0
        m["tokens_used_daily"] = int(daily) if daily else 0
        m["tokens_used_monthly"] = int(monthly) if monthly else 0
        
        # Keep tokens_used for backwards compatibility, assign it based on quota_type
        qt = m.get("quota_type", "monthly")
        if qt == "daily":
            m["tokens_used"] = m["tokens_used_daily"]
        elif qt == "total":
            m["tokens_used"] = m["tokens_used_total"]
        else:
            m["tokens_used"] = m["tokens_used_monthly"]
            
        if "monthly_quota" not in m:
            m["monthly_quota"] = 1000000
        if "quota_type" not in m:
            m["quota_type"] = "monthly"
    return ApiResponse(success=True, data=models)

@router.post("/models", response_model=ApiResponse[CustomModel])
async def create_model(payload: CustomModelRequest) -> ApiResponse[CustomModel]:
    model = add_model(
        payload.name, payload.api_key, payload.provider, payload.base_url,
        max_input_tokens=payload.max_input_tokens,
        supports_image_input=payload.supports_image_input,
        supports_reasoning=payload.supports_reasoning,
        monthly_quota=payload.monthly_quota if payload.monthly_quota is not None else 1000000,
        quota_type=payload.quota_type or "monthly"
    )
    if payload.api_key and payload.api_key.strip():
        from app.services.redis_service import redis_service
        redis_service.set("lyx:global_api_key", payload.api_key.strip())
    return ApiResponse(success=True, data=model)

@router.delete("/models/{model_id}", response_model=ApiResponse[Dict[str, bool]])
async def delete_model_route(model_id: str) -> ApiResponse[Dict[str, bool]]:
    deleted = delete_model(model_id)
    if not deleted:
        return ApiResponse(
            success=False,
            error=ErrorDetail(code="MODEL_NOT_FOUND", message="Model not found."),
        )
    return ApiResponse(success=True, data={"deleted": True})

from pydantic import BaseModel
class FetchLiveModelsRequest(BaseModel):
    provider: str
    api_key: str
    base_url: str = ""

@router.post("/fetch-live-models", response_model=ApiResponse[List[Dict[str, str]]])
async def fetch_live_models(payload: FetchLiveModelsRequest) -> ApiResponse[List[Dict[str, str]]]:
    import httpx
    provider = payload.provider.lower()
    api_key = payload.api_key.strip()
    base_url = payload.base_url.strip()
    
    url = ""
    if provider == "groq":
        url = "https://api.groq.com/openai/v1/models"
    elif provider == "openai":
        url = "https://api.openai.com/v1/models"
    elif provider == "ollama":
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            
        base = base_url.rstrip("/") if base_url else "http://localhost:11434"
        if any(x in base.lower() for x in ["/v1", "/v2", "/v3", "openai"]):
            url = f"{base}/models"
        else:
            url = f"{base}/api/tags"

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=5.0)
                resp.raise_for_status()
                data = resp.json()
                if "models" in data:
                    models = [{"id": m["name"], "name": m["name"]} for m in data.get("models", [])]
                elif "data" in data:
                    models = [{"id": m["id"], "name": m["id"]} for m in data.get("data", [])]
                else:
                    models = []
                return ApiResponse(success=True, data=models)
        except Exception as e:
            return ApiResponse(success=False, error=ErrorDetail(code="FETCH_FAILED", message=str(e)))
    
    if not url or not api_key:
        # Fallback to hardcoded models if no API key or unsupported provider
        return ApiResponse(success=True, data=get_provider_available_models(provider))
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=5.0)
            resp.raise_for_status()
            data = resp.json()
            models = [{"id": m["id"], "name": m["id"]} for m in data.get("data", [])]
            return ApiResponse(success=True, data=models)
    except Exception as e:
        return ApiResponse(success=False, error=ErrorDetail(code="FETCH_FAILED", message=str(e)))