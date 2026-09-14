import psycopg2
import psycopg2.extras
import logging
from typing import List, Dict, Any
from app.config import DATABASE_URL

logger = logging.getLogger(__name__)

def get_connection():
    # Connect using the DATABASE_URL and return a connection that yields Dict-like rows
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.DictCursor)

def init_db():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        session_id TEXT PRIMARY KEY,
                        persona_prompt TEXT,
                        started_at TEXT,
                        ended_at TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id SERIAL PRIMARY KEY,
                        session_id TEXT,
                        role TEXT,
                        content TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                    )
                """)
            conn.commit()
        logger.info(f"PostgreSQL database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL database: {e}")
        raise

def create_session(session_id: str, persona_prompt: str, started_at: str):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO sessions (session_id, persona_prompt, started_at) VALUES (%s, %s, %s)",
                (session_id, persona_prompt, started_at)
            )
        conn.commit()

def end_session(session_id: str, ended_at: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE sessions SET ended_at = %s WHERE session_id = %s",
                (ended_at, session_id)
            )
            rowcount = cursor.rowcount
        conn.commit()
        return rowcount > 0

def add_message(session_id: str, role: str, content: str):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (session_id, role, content)
            )
        conn.commit()

def get_history(session_id: str) -> List[Dict[str, str]]:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT role, content FROM messages WHERE session_id = %s ORDER BY id ASC",
                (session_id,)
            )
            return [{"role": row["role"], "content": row["content"]} for row in cursor.fetchall()]

def get_all_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT s.session_id, s.persona_prompt, s.started_at, s.ended_at
                FROM sessions s
                WHERE s.ended_at IS NOT NULL
                  AND EXISTS (SELECT 1 FROM messages m WHERE m.session_id = s.session_id)
                ORDER BY s.started_at DESC
                LIMIT %s
                """,
                (limit,)
            )
            sessions = [dict(row) for row in cursor.fetchall()]
            for session in sessions:
                session["history"] = get_history(session["session_id"])
            return sessions

def delete_session(session_id: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM messages WHERE session_id = %s", (session_id,))
            cursor.execute("DELETE FROM sessions WHERE session_id = %s", (session_id,))
            rowcount = cursor.rowcount
        conn.commit()
        return rowcount > 0
