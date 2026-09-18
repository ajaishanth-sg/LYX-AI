import os
import re

files_to_update = {
    # Frontend
    "frontend-react/src/hooks/useWakeWord.js": [
        (r'hey lyx', 'hey kawaii'),
        (r'"lyx"', '"kawaii"')
    ],
    "frontend-react/src/hooks/useConversation.js": [
        (r'hey lyx', 'hey kawaii'),
        (r'Hey Lyx', 'Hey Kawaii')
    ],
    "frontend-react/src/components/SystemAgentModal.jsx": [
        (r'Lyx System Control', 'Kawaii System Control')
    ],
    "frontend-react/src/components/Sidebar.jsx": [
        (r'Lyx User', 'Kawaii User')
    ],
    "frontend-react/src/components/MemoryDashboard.jsx": [
        (r'Lyx AI Assistant', 'Kawaii AI Assistant')
    ],
    "frontend-react/src/components/ConnectorsView.jsx": [
        (r'want Lyx to automatically', 'want Kawaii to automatically')
    ],
    "frontend-react/src/components/ChatMode.jsx": [
        (r'Ask Lyx AI', 'Ask Kawaii AI'),
        (r'Lyx can make mistakes', 'Kawaii can make mistakes')
    ],
    "frontend-react/src/App.jsx": [
        (r'Lyx — Hands-Free Voice Agent', 'Kawaii — Hands-Free Voice Agent'),
        (r'Hey Lyx', 'Hey Kawaii')
    ],
    # Backend
    "app/services/llm_service.py": [
        (r'You are Lyx, a helpful AI assistant', 'You are Kawaii, a helpful AI assistant')
    ],
    "app/services/indexer.py": [
        (r'Lyx-AI-Agent', 'Kawaii-AI-Agent')
    ],
    "app/services/connectors/github.py": [
        (r'Lyx-AI-Agent', 'Kawaii-AI-Agent')
    ],
    "app/routes/conversation.py": [
        (r'"hey lyx"', '"hey kawaii"')
    ]
}

def update_files():
    base_dir = r"X:\Lyx AI"
    for rel_path, replacements in files_to_update.items():
        filepath = os.path.join(base_dir, rel_path)
        if not os.path.exists(filepath):
            # Try windows path sep
            filepath = os.path.join(base_dir, rel_path.replace("/", "\\"))
            if not os.path.exists(filepath):
                print(f"File not found: {filepath}")
                continue
                
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for old, new in replacements:
            content = re.sub(old, new, content, flags=re.IGNORECASE if old.lower() == old else 0)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {rel_path}")

update_files()
