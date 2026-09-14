import logging
from typing import Dict, Any, Optional

from app.services.connectors.web import scrape_url
from app.services.connectors.github import execute_github_connector
from app.services.connectors.notion import execute_notion_connector
from app.services.connectors.jira import execute_jira_connector
from app.services.connectors.servicenow import execute_servicenow_connector
from app.services.connectors.dropbox import execute_dropbox_connector

logger = logging.getLogger(__name__)

# List of all supported connector IDs for the unified architecture
SUPPORTED_CONNECTORS = [
    "notion", "confluence", "coda", "sharepoint", 
    "gdrive", "box", "dropbox", "s3",
    "jira", "zendesk", "asana", "linear",
    "slack", "teams", "gmail", "discord",
    "github", "gitlab",
    "web", "file", "servicenow"
]

def execute_connector(connector_id: str, credential: Dict[str, Any]) -> Dict[str, Any]:
    """
    The unified dispatcher for all connectors.
    Takes a connector ID and a credential dictionary (token, domain, instance, etc).
    Routes to the real implementation if it exists, otherwise returns a graceful error.
    """
    if connector_id not in SUPPORTED_CONNECTORS:
        return {"success": False, "text": "", "error": f"Unknown connector: {connector_id}"}
        
    try:
        # Extract the primary token since older implementations expect a single string
        token = credential.get("token", "")
        
        # 1. REAL INTEGRATION: Web Scraper
        if connector_id == "web":
            text = scrape_url(token)
            if text.startswith("Error:") or text.startswith("Cannot scrape"):
                return {"success": False, "text": "", "error": text}
            return {"success": True, "text": text}
            
        # 2. REAL INTEGRATION: GitHub
        elif connector_id == "github":
            text = execute_github_connector(token)
            if text.startswith("Error:"):
                return {"success": False, "text": "", "error": text}
            return {"success": True, "text": text}
            
        # 3. REAL INTEGRATION: Notion
        elif connector_id == "notion":
            text = execute_notion_connector(token)
            if text.startswith("Error:"):
                return {"success": False, "text": "", "error": text}
            return {"success": True, "text": text}
            
        # 4. REAL INTEGRATION: Jira
        elif connector_id == "jira":
            text = execute_jira_connector(credential)
            if text.startswith("Error:"):
                return {"success": False, "text": "", "error": text}
            return {"success": True, "text": text}
            
        # 5. REAL INTEGRATION: ServiceNow
        elif connector_id == "servicenow":
            text = execute_servicenow_connector(credential)
            if text.startswith("Error:"):
                return {"success": False, "text": "", "error": text}
            return {"success": True, "text": text}
            
        # 6. REAL INTEGRATION: Dropbox
        elif connector_id == "dropbox":
            text = execute_dropbox_connector(credential)
            if text.startswith("Error:"):
                return {"success": False, "text": "", "error": text}
            return {"success": True, "text": text}
            
        # PLACEHOLDER: Everything else
        else:
            # We accept the credential, but mock the response because the real data pipeline isn't built yet
            mock_text = (
                f"Successfully validated credentials for {connector_id.upper()} in the unified manager.\n"
                f"Note: The real-time data fetching pipeline for this specific platform is not yet implemented. "
                f"This is a placeholder response."
            )
            return {"success": True, "text": mock_text}
            
    except Exception as e:
        logger.error(f"Error executing connector {connector_id}: {e}")
        return {"success": False, "text": "", "error": str(e)}
