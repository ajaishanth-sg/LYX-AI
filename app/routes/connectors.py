from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.services.connectors_manager import execute_connector
from app.services.indexer import run_connector_sync

router = APIRouter(prefix="/api/connectors", tags=["connectors"])

class ConnectorExecuteRequest(BaseModel):
    connector_id: str
    credential: Dict[str, Any]

class ConnectorExecuteResponse(BaseModel):
    success: bool
    text: str
    error: Optional[str] = None

@router.post("/execute", response_model=ConnectorExecuteResponse)
async def execute_connector_endpoint(request: ConnectorExecuteRequest):
    """
    Unified endpoint for all connectors. 
    Routes to the real implementation in the connectors manager.
    """
    result = execute_connector(request.connector_id, request.credential)
    return ConnectorExecuteResponse(**result)

@router.post("/sync")
async def sync_connector_endpoint(request: ConnectorExecuteRequest, req: Request, background_tasks: BackgroundTasks):
    """
    Triggers a background indexing job for a connector.
    """
    document_store = req.app.state.document_store
    background_tasks.add_task(run_connector_sync, request.connector_id, request.credential, document_store)
    return {"success": True, "message": f"Background sync started for {request.connector_id}"}
