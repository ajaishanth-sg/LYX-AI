import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.services import db
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 20  # keep last N messages (user+assistant) to control token usage
MAX_ARCHIVED_CONVERSATIONS = 50  # cap how many past conversations we keep
SESSION_CACHE_TTL = 86400  # 24 hours caching for active sessions

@dataclass
class ConversationSession:
    session_id: str
    persona_prompt: str = ""
    history: List[Dict[str, str]] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None


class ConversationManager:
    """Store for active conversation sessions, with a SQLite backend for 
    archived conversations so past history is persistent across restarts."""

    def __init__(self) -> None:
        self._sessions: Dict[str, ConversationSession] = {}
        self._active_persona_prompt: str = ""

    # ---- Persona (global setting, applied to new sessions) ----

    def set_persona(self, persona_prompt: str) -> None:
        self._active_persona_prompt = persona_prompt.strip()
        logger.info("Persona prompt updated (%d chars)", len(self._active_persona_prompt))

    def get_persona(self) -> str:
        return self._active_persona_prompt

    # ---- Session lifecycle ----

    def start_session(self) -> ConversationSession:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        session = ConversationSession(session_id=session_id, persona_prompt=self._active_persona_prompt)
        self._sessions[session_id] = session
        
        # Cache to Redis
        redis_service.set_json(
            f"lyx:session:{session_id}", 
            {"history": session.history, "persona": session.persona_prompt}, 
            ttl=SESSION_CACHE_TTL
        )
        
        db.create_session(session_id, self._active_persona_prompt, session.started_at.isoformat())
        logger.info("Started conversation session %s", session_id)
        return session

    def get_session(self, session_id: str) -> Optional[ConversationSession]:
        session = self._sessions.get(session_id)
        if session:
            return session
            
        # Try to restore active session from Redis Cache
        cached = redis_service.get_json(f"lyx:session:{session_id}")
        if cached:
            restored_session = ConversationSession(
                session_id=session_id, 
                persona_prompt=cached.get("persona", "")
            )
            restored_session.history = cached.get("history", [])
            self._sessions[session_id] = restored_session
            logger.info("Restored conversation session %s from Redis cache", session_id)
            return restored_session
            
        return None

    def end_session(self, session_id: str) -> bool:
        session = self._sessions.pop(session_id, None)
        if session is None:
            return False

        session.ended_at = datetime.now(timezone.utc)
        db.end_session(session_id, session.ended_at.isoformat())
        logger.info("Ended conversation session %s", session_id)
        
        # Remove from Redis cache since it's ended
        redis_service.delete(f"lyx:session:{session_id}")
        
        # If no history, clean it up from DB
        if not session.history:
            db.delete_session(session_id)
            
        return True

    # ---- History management ----

    def append_exchange(self, session_id: str, user_message: str, assistant_reply: str) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            return

        session.history.append({"role": "user", "content": user_message})
        session.history.append({"role": "assistant", "content": assistant_reply})
        
        db.add_message(session_id, "user", user_message)
        db.add_message(session_id, "assistant", assistant_reply)

        # trim to last MAX_HISTORY_MESSAGES to avoid unbounded growth / token blowup
        if len(session.history) > MAX_HISTORY_MESSAGES:
            session.history = session.history[-MAX_HISTORY_MESSAGES:]
            
        # Update Redis Cache
        redis_service.set_json(
            f"lyx:session:{session_id}", 
            {"history": session.history, "persona": session.persona_prompt}, 
            ttl=SESSION_CACHE_TTL
        )

    def get_history(self, session_id: str) -> List[Dict[str, str]]:
        session = self.get_session(session_id)
        if session:
            return session.history
            
        # Try DB as last resort
        return db.get_history(session_id)

    # ---- Past conversations (for the history popup) ----

    def get_all_conversations(self) -> List[ConversationSession]:
        """Ended conversations, most recent first, fetched from SQLite DB."""
        db_sessions = db.get_all_sessions(limit=MAX_ARCHIVED_CONVERSATIONS)
        sessions = []
        for s in db_sessions:
            cs = ConversationSession(
                session_id=s["session_id"],
                persona_prompt=s["persona_prompt"],
                history=s["history"]
            )
            cs.started_at = datetime.fromisoformat(s["started_at"])
            if s["ended_at"]:
                cs.ended_at = datetime.fromisoformat(s["ended_at"])
            sessions.append(cs)
        return sessions

    def delete_conversation(self, session_id: str) -> bool:
        """Remove one archived conversation from the database."""
        deleted = db.delete_session(session_id)
        if deleted:
            logger.info("Deleted archived conversation %s", session_id)
        return deleted