import asyncio
import hashlib
import json
import logging
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Thread pool for running sync DuckDuckGo calls without blocking the async event loop
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ddg-search")

WEB_SEARCH_CACHE_TTL = 600  # 10 minutes

# Keywords that strongly suggest the user wants general knowledge / factual web info
_WEB_SEARCH_SIGNALS = [
    "latest", "recent", "current", "today", "news", "2024", "2025",
    "who is", "what is", "what are", "when did", "where is", "how does",
    "how to", "explain", "define", "price of", "cost of", "buy",
    "release", "update", "version", "review", "compare", "difference between",
    "weather", "stock", "rate", "score", "result", "winner",
    "youtube", "video", "link", "search", "find",
]

# Keywords that mean we should NOT web search
_NO_SEARCH_SIGNALS = [
    "generate image", "create image", "draw", "make image",
    "joke", "tell me a joke", "poem", "write a poem", "story",
    "hello", "hi", "thanks", "help me", "what can you do",
]


def _should_web_search(query: str) -> bool:
    """Fast heuristic to decide if the query benefits from a web search."""
    q = query.lower().strip()
    for skip in _NO_SEARCH_SIGNALS:
        if skip in q:
            return False
    for signal in _WEB_SEARCH_SIGNALS:
        if signal in q:
            return True
    # If the query is a question (ends with ?) and is reasonably long, search
    if q.endswith("?") and len(q) > 20:
        return True
    return False


def _ddg_search_sync(query: str, max_results: int) -> List[Dict]:
    """Run DuckDuckGo search synchronously (to be called in executor)."""
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))

        # Normalize result fields
        normalized = []
        for r in results:
            normalized.append({
                "title": r.get("title", ""),
                "url": r.get("href", r.get("url", "")),
                "snippet": r.get("body", r.get("snippet", "")),
            })
        return normalized
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
        return []


async def web_search(query: str, max_results: int = 5) -> List[Dict]:
    """
    Perform a web search with Redis caching.
    Returns list of {title, url, snippet} dicts.
    """
    try:
        from app.services.redis_service import redis_service
        cache_key = f"lyx:websearch:{hashlib.md5(query.encode()).hexdigest()}"

        # Check Redis cache first
        cached = redis_service.get_json(cache_key)
        if cached:
            logger.info(f"Web search cache HIT for: {query[:50]}")
            return cached

        # Run sync DDG search in thread pool (non-blocking)
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(_executor, _ddg_search_sync, query, max_results)

        if results:
            redis_service.set_json(cache_key, results, ttl=WEB_SEARCH_CACHE_TTL)
            logger.info(f"Web search found {len(results)} results for: {query[:50]}")
        else:
            logger.warning(f"Web search returned no results for: {query[:50]}")

        return results
    except Exception as e:
        logger.error(f"Web search error: {e}")
        return []


def should_web_search(query: str) -> bool:
    """Public helper to determine if a query should trigger web search."""
    return _should_web_search(query)


def results_to_context(results: List[Dict]) -> str:
    """Format web results as a context string for the LLM prompt."""
    if not results:
        return ""
    lines = ["--- WEB SEARCH RESULTS (use these to answer accurately) ---"]
    for i, r in enumerate(results, 1):
        lines.append(f"[{i}] {r['title']}\nURL: {r['url']}\n{r['snippet']}")
    lines.append("--- END WEB SEARCH RESULTS ---")
    lines.append("IMPORTANT: If the user asks for a YouTube video or link, and it is in the results above, you MUST provide the link in markdown format, e.g. [Watch Video](https://www.youtube.com/watch?v=...) so it can be rendered correctly.")
    return "\n\n".join(lines)
