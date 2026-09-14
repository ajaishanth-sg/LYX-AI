import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

def execute_servicenow_connector(credentials: Dict[str, Any]) -> str:
    """
    A real-time integration for ServiceNow.
    Uses the provided Instance URL, Username, and Password to fetch recent incidents.
    """
    instance = credentials.get("instance", "")
    username = credentials.get("username", "")
    password = credentials.get("password", "")
    
    if not instance or not username or not password:
        return "Error: ServiceNow requires Instance URL, Username, and Password."
        
    # Clean up instance URL
    if not instance.startswith("https://"):
        instance = f"https://{instance}"
    instance = instance.rstrip("/")
    
    try:
        # ServiceNow REST API for incidents
        url = f"{instance}/api/now/table/incident?sysparm_limit=5&sysparm_query=ORDERBYDESCsys_updated_on"
        
        headers = {
            "Accept": "application/json"
        }
        
        response = requests.get(url, auth=(username, password), headers=headers, timeout=10)
        
        if response.status_code in (401, 403):
            return "Error: Invalid ServiceNow credentials or insufficient permissions."
            
        response.raise_for_status()
        data = response.json()
        incidents = data.get("result", [])
        
        if not incidents:
            return "Successfully connected to ServiceNow, but no recent incidents were found."
            
        items = []
        for inc in incidents:
            number = inc.get("number", "Unknown")
            desc = inc.get("short_description", "No description")
            state = inc.get("state", "Unknown")
            
            items.append(f"- [{number}] {desc} (State: {state})")
            
        context = f"Successfully connected to ServiceNow ({instance}). Here are the 5 most recently updated incidents:\n" + "\n".join(items)
        return context
        
    except requests.exceptions.RequestException as e:
        logger.error(f"ServiceNow Connector Error: {e}")
        return f"Error connecting to ServiceNow: {str(e)}"
