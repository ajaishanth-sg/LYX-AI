import asyncio
import logging
from typing import Dict, Any
import requests

from app.services.document_store import DocumentStore
from app.services.connectors.web import scrape_url

logger = logging.getLogger(__name__)

async def run_connector_sync(connector_id: str, credential: Dict[str, Any], document_store: DocumentStore):
    """
    Background worker that fetches data from a connector and pushes it into the DocumentStore.
    """
    token = credential.get("token", "")
    
    if connector_id == "github":
        await _sync_github(token, document_store)
    elif connector_id == "web":
        await _sync_web(token, document_store)
    elif connector_id == "gmail":
        await _sync_gmail(credential, document_store)
    else:
        logger.warning(f"Background sync for connector '{connector_id}' is not yet implemented.")

async def _sync_github(token: str, document_store: DocumentStore):
    """
    Syncs the user's recent GitHub repositories and issues into the vector database.
    """
    doc_name = "GitHub Sync"
    doc = document_store.add_document_pending(doc_name, doc_type="document")
    
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Kawaii-AI-Agent"
        }
        
        # 1. Get User Info
        user_resp = requests.get("https://api.github.com/user", headers=headers, timeout=10)
        user_resp.raise_for_status()
        username = user_resp.json().get("login")
        
        # 2. Get Repositories (fetch up to 100 repos)
        repo_resp = requests.get("https://api.github.com/user/repos?sort=updated&per_page=100", headers=headers, timeout=10)
        repo_resp.raise_for_status()
        repos = repo_resp.json()
        
        document_store.set_total_pages(doc.doc_id, len(repos))
        
        # Add an overview chunk for aggregative queries (e.g. "how many repos?")
        table_rows = [f"| [{r['name']}]({r['html_url']}) | {r['full_name']} | {r.get('description') or 'No description'} | {r.get('language') or 'N/A'} | {r.get('stargazers_count', 0)} |" for r in repos]
        overview_text = (
            f"GitHub User Account Overview for {username}:\n"
            f"Total Repositories Count: {len(repos)}\n\n"
            f"| Repository Name | Full Name | Description | Language | Stars |\n"
            f"| --- | --- | --- | --- | --- |\n"
            + "\n".join(table_rows)
        )
        await document_store.add_text_batch(doc.doc_id, overview_text, pages_in_batch=0)
        
        for repo in repos:
            repo_name = repo['full_name']
            short_name = repo['name']
            repo_url = repo['html_url']
            
            # Index the repo description and metadata
            content = f"GitHub Repository Name: {short_name}\nFull Name: {repo_name}\nURL: {repo_url}\nDescription: {repo.get('description', 'No description')}\nLanguage: {repo.get('language')}\nStars: {repo.get('stargazers_count')}"
            
            # Check for a README
            readme_resp = requests.get(f"https://api.github.com/repos/{repo_name}/readme", headers=headers, timeout=10)
            if readme_resp.status_code == 200:
                readme_data = readme_resp.json()
                import base64
                if "content" in readme_data:
                    readme_text = base64.b64decode(readme_data["content"]).decode('utf-8', errors='ignore')
                    content += f"\n\nREADME Content for {short_name}:\n{readme_text}"
            
            # Push to the store
            await document_store.add_text_batch(doc.doc_id, content, pages_in_batch=1)
            # Sleep slightly to prevent rate limits
            await asyncio.sleep(0.5)
            
        document_store.mark_ready(doc.doc_id)
        logger.info("GitHub background sync complete.")
        
    except Exception as e:
        logger.error(f"GitHub Sync Error: {e}")
        document_store.mark_failed(doc.doc_id)

async def _sync_web(url: str, document_store: DocumentStore):
    doc = document_store.add_document_pending(f"Web Scrape: {url}", doc_type="document")
    try:
        document_store.set_total_pages(doc.doc_id, 1)
        # Use our existing web scraper
        text = scrape_url(url)
        if text.startswith("Error"):
            raise Exception(text)
            
        await document_store.add_text_batch(doc.doc_id, text, pages_in_batch=1)
        document_store.mark_ready(doc.doc_id)
    except Exception as e:
        logger.error(f"Web Sync Error: {e}")
        document_store.mark_failed(doc.doc_id)

async def _sync_gmail(credential: dict, document_store: DocumentStore):
    """
    Syncs the user's recent Gmail messages into the vector database.
    Uses the Google access token to fetch messages via the Gmail REST API.
    """
    import base64
    import re

    doc_name = "Gmail Sync"
    doc = document_store.add_document_pending(doc_name, doc_type="document")
    
    token = credential.get("token", "")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # 1. Get user profile
        profile_resp = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers=headers, timeout=10
        )
        profile_resp.raise_for_status()
        email_address = profile_resp.json().get("emailAddress", "Unknown")
        
        # 2. List recent messages (up to 50)
        list_resp = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox",
            headers=headers, timeout=10
        )
        list_resp.raise_for_status()
        message_list = list_resp.json().get("messages", [])
        
        document_store.set_total_pages(doc.doc_id, len(message_list))
        
        # Overview chunk
        overview = f"Gmail Inbox for {email_address}. Fetched {len(message_list)} recent messages.\n\n"
        await document_store.add_text_batch(doc.doc_id, overview, pages_in_batch=0)
        
        # 3. Fetch each message's metadata and snippet
        for msg_ref in message_list:
            msg_id = msg_ref["id"]
            msg_resp = requests.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date",
                headers=headers, timeout=10
            )
            if msg_resp.status_code != 200:
                await document_store.add_text_batch(doc.doc_id, "", pages_in_batch=1)
                continue
            
            msg_data = msg_resp.json()
            headers_list = msg_data.get("payload", {}).get("headers", [])
            
            subject = next((h["value"] for h in headers_list if h["name"] == "Subject"), "(No Subject)")
            sender  = next((h["value"] for h in headers_list if h["name"] == "From"), "Unknown Sender")
            date    = next((h["value"] for h in headers_list if h["name"] == "Date"), "Unknown Date")
            snippet = msg_data.get("snippet", "")
            
            content = (
                f"Email from Gmail Inbox:\n"
                f"Subject: {subject}\n"
                f"From: {sender}\n"
                f"Date: {date}\n"
                f"Preview: {snippet}\n"
            )
            
            await document_store.add_text_batch(doc.doc_id, content, pages_in_batch=1)
            await asyncio.sleep(0.1)
        
        document_store.mark_ready(doc.doc_id)
        logger.info(f"Gmail background sync complete for {email_address}.")
        
    except Exception as e:
        logger.error(f"Gmail Sync Error: {e}")
        document_store.mark_failed(doc.doc_id)

