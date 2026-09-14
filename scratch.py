import os, re
tamil_pattern = re.compile(r'[\u0B80-\u0BFF]')
for root, dirs, files in os.walk(r'x:\Tamil-LLM-vishnu-Dev'):
    if 'node_modules' in root or '.venv' in root or '.git' in root or 'data' in root or '__pycache__' in root:
        continue
    for f in files:
        if not f.endswith(('.py', '.js', '.jsx', '.html', '.md')): continue
        path = os.path.join(root, f)
        try:
            with open(path, 'r', encoding='utf-8') as file:
                lines = file.readlines()
                for i, line in enumerate(lines):
                    if tamil_pattern.search(line):
                        print(f'{path}:{i+1}: {line.strip()}')
        except Exception:
            pass
