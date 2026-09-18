import os
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Redis URL from environment or local default
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis_client = None
_redis_available = False
_redis_tested = False

def get_redis():
    global _redis_client, _redis_available, _redis_tested
    if _redis_tested:
        return _redis_client if _redis_available else None

    _redis_tested = True
    try:
        import redis
        client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=0.5)
        client.ping()
        _redis_client = client
        _redis_available = True
        logger.info(f"Connected to Redis successfully at {REDIS_URL}")
    except Exception as e:
        logger.warning(f"Redis not available ({e}). Using file-backed cache fallback.")
        _redis_client = None
        _redis_available = False
    return _redis_client if _redis_available else None


class RedisService:
    """Service to manage caching and storing sensitive credentials (models, API keys, connectors) in Redis."""

    @staticmethod
    def is_connected() -> bool:
        return get_redis() is not None

    @staticmethod
    def get(key: str) -> Optional[str]:
        client = get_redis()
        if not client:
            return None
        try:
            return client.get(key)
        except Exception as e:
            logger.error(f"Redis GET failed for key '{key}': {e}")
            return None

    @staticmethod
    def set(key: str, value: str, ttl: Optional[int] = None) -> bool:
        client = get_redis()
        if not client:
            return False
        try:
            if ttl:
                client.setex(key, ttl, value)
            else:
                client.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis SET failed for key '{key}': {e}")
            return False

    @staticmethod
    def get_json(key: str) -> Optional[Any]:
        raw = RedisService.get(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception as e:
            logger.error(f"Failed to decode JSON from Redis key '{key}': {e}")
            return None

    @staticmethod
    def set_json(key: str, data: Any, ttl: Optional[int] = None) -> bool:
        try:
            encoded = json.dumps(data)
            return RedisService.set(key, encoded, ttl=ttl)
        except Exception as e:
            logger.error(f"Failed to encode JSON for Redis key '{key}': {e}")
            return False

    @staticmethod
    def delete(key: str) -> bool:
        client = get_redis()
        if not client:
            return False
        try:
            client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE failed for key '{key}': {e}")
            return False

redis_service = RedisService()
