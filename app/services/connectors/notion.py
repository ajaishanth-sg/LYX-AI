import logging
import requests

logger = logging.getLogger(__name__)

def execute_notion_connector(token: str) -> str:
    """
    A real-time integration for Notion.
    Uses the provided Internal Integration Secret to fetch accessible pages/databases.
    """
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }
        
        # Search for all accessible pages and databases (limited to 5 for context window safety)
        payload = {
            "page_size": 5,
            "sort": {
                "direction": "descending",
                "timestamp": "last_edited_time"
            }
        }
        
        response = requests.post("https://api.notion.com/v1/search", headers=headers, json=payload, timeout=10)
        
        if response.status_code == 401:
            return "Error: Invalid Notion Internal Integration Secret. Make sure your token starts with 'secret_'."
            
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            return "Successfully connected to Notion, but no pages or databases were found that this integration has access to. Make sure you have shared pages with your integration connection!"
            
        items = []
        for item in results:
            item_type = item.get("object", "unknown")
            # Extract title (Notion's title properties can be deeply nested)
            title = "Untitled"
            
            try:
                if item_type == "page":
                    properties = item.get("properties", {})
                    # Find the property of type 'title'
                    for prop_name, prop_val in properties.items():
                        if prop_val.get("type") == "title":
                            title_array = prop_val.get("title", [])
                            if title_array:
                                title = title_array[0].get("plain_text", "Untitled")
                            break
                elif item_type == "database":
                    title_array = item.get("title", [])
                    if title_array:
                        title = title_array[0].get("plain_text", "Untitled")
            except Exception:
                pass # Fallback to "Untitled" if parsing fails
                
            url = item.get("url", "No URL")
            items.append(f"- [{item_type.capitalize()}] {title} ({url})")
        
        context = "Successfully connected to Notion. Here are the 5 most recently edited pages/databases this integration has access to:\n" + "\n".join(items)
        return context
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Notion Connector Error: {e}")
        return f"Error connecting to Notion: {str(e)}"
