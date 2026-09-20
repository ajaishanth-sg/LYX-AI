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

import urllib.parse
import requests
from fastapi.responses import RedirectResponse, HTMLResponse
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

@router.get("/google/login")
async def google_login():
    scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/photoslibrary.readonly"
    ]
    
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent"
    }
    
    url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@router.get("/gmail/callback")
async def google_callback(code: str):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }
    
    response = requests.post(token_url, data=data)
    if response.status_code != 200:
        return HTMLResponse(f"<h1>Failed to authenticate with Google</h1><p>{response.text}</p>")
        
    token_data = response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    
    # Return an HTML page that passes the tokens back to the main window
    html_content = f"""
    <html>
    <body>
        <h2>Authentication successful! You can close this window.</h2>
        <script>
            window.opener.postMessage({{
                type: 'OAUTH_SUCCESS',
                payload: {{
                    token: '{access_token}',
                    refreshToken: '{refresh_token}'
                }}
            }}, '*');
            window.close();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(html_content)
