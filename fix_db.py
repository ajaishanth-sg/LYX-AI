from app.services.db import get_connection

with get_connection() as conn:
    with conn.cursor() as cur:
        # Delete old broken models
        cur.execute("DELETE FROM models_config WHERE id IN ('meta-llama/llama-3.1-8b-instruct', 'gemini-3-flash-preview:cloud')")
        
        # Insert the correct Nemotron model with right base_url
        cur.execute("""
            INSERT INTO models_config (id, name, display_name, api_key, provider, base_url, is_visible, is_default, max_input_tokens, supports_image_input, supports_reasoning)
            VALUES ('nemotron-3-nano:30b', 'nemotron-3-nano:30b', 'Nemotron 3 Nano 30B (Ollama Cloud)',
                    'cb862cb0b8204a2aa8288345a9f15c7e.RJZx1x-q6K4_QDOJZwWVLw0-',
                    'ollama', 'https://ollama.com/v1',
                    TRUE, FALSE, 128000, FALSE, FALSE)
            ON CONFLICT (id) DO UPDATE SET base_url = EXCLUDED.base_url, api_key = EXCLUDED.api_key
        """)
        
    conn.commit()
    print('DB updated successfully')

# Verify
with get_connection() as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT id, provider, base_url FROM models_config')
        for r in cur.fetchall():
            print(dict(r))
