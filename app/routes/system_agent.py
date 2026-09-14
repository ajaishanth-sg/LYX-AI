import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter

from app.models.schemas import ApiResponse, ErrorDetail
from app.services.system_agent import system_agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/system", tags=["system_agent"])

class SystemExecuteRequest(BaseModel):
    action: str  # "command" | "script" | "light_on" | "light_off" | "open_app"
    command: Optional[str] = None
    code: Optional[str] = None
    filename: Optional[str] = "script.py"
    app_name: Optional[str] = None

@router.post("/execute", response_model=ApiResponse[Dict[str, Any]])
async def execute_system_action(payload: SystemExecuteRequest) -> ApiResponse[Dict[str, Any]]:
    action = payload.action.lower().strip()
    
    if action == "light_on":
        res = system_agent.control_smart_light("on")
    elif action == "light_off":
        res = system_agent.control_smart_light("off")
    elif action == "open_app" and payload.app_name:
        res = system_agent.open_app(payload.app_name)
    elif action == "script" and payload.code:
        filename = payload.filename or "generated_script.py"
        res = system_agent.create_and_run_script(filename, payload.code)
    elif action == "command" and payload.command:
        res = system_agent.execute_command(payload.command)
    else:
        # Default smart detection: check if command looks like light control
        cmd_str = (payload.command or "").lower()
        if "light" in cmd_str and "off" in cmd_str:
            res = system_agent.control_smart_light("off")
        elif "light" in cmd_str and ("on" in cmd_str or "turn" in cmd_str):
            res = system_agent.control_smart_light("on")
        elif payload.command:
            res = system_agent.execute_command(payload.command)
        else:
            return ApiResponse(
                success=False,
                error=ErrorDetail(code="INVALID_ACTION", message="No valid action or command provided.")
            )

    return ApiResponse(success=True, data=res)

@router.get("/status", response_model=ApiResponse[Dict[str, Any]])
async def get_system_status() -> ApiResponse[Dict[str, Any]]:
    import platform
    info = {
        "os": platform.system(),
        "release": platform.release(),
        "python_version": platform.python_version(),
        "agent_status": "Ready & Listening",
    }
    return ApiResponse(success=True, data=info)
