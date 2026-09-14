import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

# Basic headers to bypass simple bot protection
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def clean_html(html_content: str) -> str:
    """Extract clean text from HTML using BeautifulSoup, ignoring scripts and styles."""
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        script.extract()
        
    # Get text
    text = soup.get_text(separator='\n')
    
    # Break into lines and remove leading and trailing space on each
    lines = (line.strip() for line in text.splitlines())
    
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    return text

def scrape_url(url: str) -> str:
    """Fetches a URL and returns its cleaned text content."""
    try:
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url
            
        logger.info(f"Web scraping: Fetching {url}")
        
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        # Check if it's HTML
        content_type = response.headers.get("content-type", "").lower()
        if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
            return f"Cannot scrape non-HTML content type: {content_type}"
            
        cleaned_text = clean_html(response.text)
        
        # Truncate to avoid blowing up the LLM context if it's a massive page
        # Usually ~10,000 characters is a safe bet for a single article
        max_chars = 15000
        if len(cleaned_text) > max_chars:
            logger.info(f"Web scraping: Truncating text from {len(cleaned_text)} to {max_chars} chars")
            cleaned_text = cleaned_text[:max_chars] + "... [Content truncated]"
            
        return cleaned_text
        
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else -1
        if status_code == 403:
            return f"Error: The website actively blocked the scraper (HTTP 403 Forbidden). It likely has bot-detection."
        return f"HTTP Error fetching {url}: {e}"
    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
        return f"Error scraping {url}: {e}"
