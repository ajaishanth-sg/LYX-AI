import logging
import requests
import base64
from typing import Dict, Any

logger = logging.getLogger(__name__)

def execute_jira_connector(credentials: Dict[str, Any]) -> str:
    """
    A real-time integration for Jira.
    Uses the provided Domain, Email, and API Token to fetch recent issues.
    """
    domain = credentials.get("domain", "")
    email = credentials.get("email", "")
    token = credentials.get("token", "")
    
    if not domain or not email or not token:
        return "Error: Jira requires Domain, Email, and API Token."
        
    # Clean up domain
    if not domain.startswith("https://"):
        domain = f"https://{domain}"
    
    try:
        # Jira uses Basic Auth with email:token
        auth_string = f"{email}:{token}"
        auth_b64 = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')
        
        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Accept": "application/json"
        }
        
        # JQL to get recent issues assigned to the user or ordered by updated
        jql = "order by updated DESC"
        url = f"{domain}/rest/api/3/search?jql={jql}&maxResults=5"
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code in (401, 403):
            return "Error: Invalid Jira credentials or insufficient permissions."
            
        response.raise_for_status()
        data = response.json()
        issues = data.get("issues", [])
        
        if not issues:
            return "Successfully connected to Jira, but no recent issues were found."
            
        items = []
        for issue in issues:
            key = issue.get("key", "Unknown")
            fields = issue.get("fields", {})
            summary = fields.get("summary", "No summary")
            status_name = fields.get("status", {}).get("name", "Unknown Status")
            
            items.append(f"- [{key}] {summary} (Status: {status_name})")
            
        context = f"Successfully connected to Jira ({domain}). Here are the 5 most recently updated issues:\n" + "\n".join(items)
        return context
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Jira Connector Error: {e}")
        return f"Error connecting to Jira: {str(e)}"
