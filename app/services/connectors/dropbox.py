import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

def execute_dropbox_connector(credentials: Dict[str, Any]) -> str:
    """
    A real-time integration for Dropbox.
    Uses the provided Access Token to list recent files.
    """
    token = credentials.get("token", "")
    
    if not token:
        return "Error: Dropbox requires an Access Token."
        
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Dropbox API to list files in root
        data = {
            "path": "",
            "recursive": False,
            "include_media_info": False,
            "include_deleted": False,
            "include_has_explicit_shared_members": False,
            "include_mounted_folders": True,
            "include_non_downloadable_files": True
        }
        
        response = requests.post("https://api.dropboxapi.com/2/files/list_folder", headers=headers, json=data, timeout=10)
        
        if response.status_code == 401:
            return "Error: Invalid Dropbox Access Token."
            
        response.raise_for_status()
        result = response.json()
        entries = result.get("entries", [])
        
        if not entries:
            return "Successfully connected to Dropbox, but no files were found in the root directory."
            
        # Get up to 5 items
        items = []
        for entry in entries[:5]:
            tag = entry.get(".tag", "unknown")
            name = entry.get("name", "Unknown File")
            
            items.append(f"- [{tag.capitalize()}] {name}")
            
        context = f"Successfully connected to Dropbox. Here are up to 5 items from the root folder:\n" + "\n".join(items)
        return context
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Dropbox Connector Error: {e}")
        return f"Error connecting to Dropbox: {str(e)}"
