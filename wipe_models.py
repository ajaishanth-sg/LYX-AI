import json
from pathlib import Path
import os
import sys

# Append the directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

try:
    from app.services.redis_service import redis_service
    redis_service.delete('lyx:models_config')
    print('Redis wiped')
except Exception as e:
    print('Redis Wipe Error:', e)

try:
    from app.services.db import get_connection
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM models_config")
        conn.commit()
    print('Postgres wiped completely')
except Exception as e:
    print('Postgres Wipe Error:', e)

try:
    with open('app/data/models.json', 'w') as f:
        f.write('[]')
    print('Local file wiped')
except Exception as e:
    print('Local file Wipe Error:', e)

print('Wipe complete')
