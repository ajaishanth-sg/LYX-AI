import json
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

MEMORY_FILE = Path("app/data/memories.json")

def load_memories() -> List[Dict[str, Any]]:
    if not MEMORY_FILE.exists():
        return []
    try:
        return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error("Failed to load memories: %s", e)
        return []

def save_memories(memories: List[Dict[str, Any]]):
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(memories, indent=2), encoding="utf-8")

def add_memory(category: str, content: str) -> str:
    """Saves a piece of critical user information to the persistent memory core."""
    memories = load_memories()
    import uuid
    new_memory = {
        "id": uuid.uuid4().hex[:8],
        "category": category,
        "content": content,
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }
    memories.append(new_memory)
    save_memories(memories)
    logger.info("Saved new memory: [%s] %s", category, content)
    return f"Memory successfully captured and persisted in connections core: {content}"

def get_memory_context() -> str:
    memories = load_memories()
    if not memories:
        return ""
    
    formatted = ["SYSTEM MEMORY CORE (Persisted Facts):"]
    for m in memories:
        formatted.append(f"- [{m.get('category', 'general').upper()}] {m.get('content', '')}")
    return "\n".join(formatted) + "\n"
