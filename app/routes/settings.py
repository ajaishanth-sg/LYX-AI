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
from app.services.models_manager import load_models, add_model, delete_model

@router.get("/models", response_model=ApiResponse[List[CustomModel]])
async def get_models() -> ApiResponse[List[CustomModel]]:
    models = load_models()
    return ApiResponse(success=True, data=models)

@router.post("/models", response_model=ApiResponse[CustomModel])
async def create_model(payload: CustomModelRequest) -> ApiResponse[CustomModel]:
    model = add_model(payload.name, payload.api_key, payload.provider, payload.base_url)
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