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
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS models_config (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        display_name TEXT,
                        api_key TEXT,
                        provider TEXT NOT NULL,
                        base_url TEXT,
                        is_visible BOOLEAN DEFAULT TRUE,
                        is_default BOOLEAN DEFAULT FALSE,
                        max_input_tokens INTEGER DEFAULT 128000,
                        supports_image_input BOOLEAN DEFAULT FALSE,
                        supports_reasoning BOOLEAN DEFAULT FALSE,
                        monthly_quota INTEGER DEFAULT 1000000,
                        quota_type TEXT DEFAULT 'monthly',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                # Seamlessly add monthly_quota if it doesn't exist
                try:
                    cursor.execute("ALTER TABLE models_config ADD COLUMN monthly_quota INTEGER DEFAULT 1000000;")
                except Exception:
                    conn.rollback() # Ignore if column already exists
                else:
                    conn.commit()
                # Seamlessly add quota_type if it doesn't exist
                try:
                    cursor.execute("ALTER TABLE models_config ADD COLUMN quota_type TEXT DEFAULT 'monthly';")
                except Exception:
                    conn.rollback() # Ignore if column already exists
                else:
                    conn.commit()
            conn.commit()
        logger.info(f"PostgreSQL database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL database: {e}")
        raise

def db_load_models() -> List[Dict[str, Any]]:
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, name, display_name, api_key, provider, base_url, is_visible, is_default, max_input_tokens, supports_image_input, supports_reasoning, monthly_quota, quota_type FROM models_config ORDER BY updated_at DESC")
                rows = cursor.fetchall()
                if not rows:
                    return []
                return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error loading models from PostgreSQL: {e}")
        return []

def db_save_models(models: List[Dict[str, Any]]) -> None:
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                for m in models:
                    cursor.execute("""
                        INSERT INTO models_config (id, name, display_name, api_key, provider, base_url, is_visible, is_default, max_input_tokens, supports_image_input, supports_reasoning, monthly_quota, quota_type, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                        ON CONFLICT (id) DO UPDATE SET
                            name = EXCLUDED.name,
                            display_name = EXCLUDED.display_name,
                            api_key = EXCLUDED.api_key,
                            provider = EXCLUDED.provider,
                            base_url = EXCLUDED.base_url,
                            is_visible = EXCLUDED.is_visible,
                            is_default = EXCLUDED.is_default,
                            max_input_tokens = EXCLUDED.max_input_tokens,
                            supports_image_input = EXCLUDED.supports_image_input,
                            supports_reasoning = EXCLUDED.supports_reasoning,
                            monthly_quota = EXCLUDED.monthly_quota,
                            quota_type = EXCLUDED.quota_type,
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        m.get("id"), m.get("name"), m.get("display_name"), m.get("api_key", ""),
                        m.get("provider", "groq"), m.get("base_url", ""), m.get("is_visible", True),
                        m.get("is_default", False), m.get("max_input_tokens", 128000),
                        m.get("supports_image_input", False), m.get("supports_reasoning", False),
                        m.get("monthly_quota", 1000000), m.get("quota_type", "monthly")
                    ))
            conn.commit()
    except Exception as e:
        logger.error(f"Error saving models to PostgreSQL: {e}")

def db_delete_model(model_id: str) -> None:
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM models_config WHERE id = %s OR name = %s", (model_id, model_id))
            conn.commit()
    except Exception as e:
        logger.error(f"Error deleting model from PostgreSQL: {e}")

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
