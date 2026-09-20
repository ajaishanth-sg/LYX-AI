import logging
import requests

logger = logging.getLogger(__name__)

def execute_gmail_connector(token: str) -> str:
    """
    Validates the Google access token and returns user's Gmail profile.
    """
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Verify token by fetching user's Gmail profile
        profile_resp = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers=headers,
            timeout=10
        )
        
        if profile_resp.status_code == 401:
            return "Error: Google access token is invalid or expired."
        
        profile_resp.raise_for_status()
        profile = profile_resp.json()
        email = profile.get("emailAddress", "Unknown")
        total_messages = profile.get("messagesTotal", 0)
        
        context = (
            f"Successfully connected to Gmail as **{email}**.\\n\\n"
            f"Total messages in inbox: {total_messages}\\n\\n"
            f"Use the Sync button to index your recent emails into the AI context."
        )
        return context
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Gmail Connector Error: {e}")
        return f"Error connecting to Gmail: {str(e)}"
