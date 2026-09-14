import logging
import requests

logger = logging.getLogger(__name__)

def execute_github_connector(token: str) -> str:
    """
    A real-time integration for GitHub.
    Uses the provided Personal Access Token to fetch the user's recent repositories.
    """
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Lyx-AI-Agent"
        }
        
        # Fetch the authenticated user's info
        user_resp = requests.get("https://api.github.com/user", headers=headers, timeout=10)
        
        if user_resp.status_code == 401:
            return "Error: Invalid GitHub Personal Access Token or Token has expired."
        
        user_resp.raise_for_status()
        user_data = user_resp.json()
        username = user_data.get("login", "Unknown User")
        profile_url = user_data.get("html_url", "https://github.com")

        # Fetch recent repos
        repo_resp = requests.get("https://api.github.com/user/repos?sort=updated&per_page=3", headers=headers, timeout=10)
        repo_names = []
        if repo_resp.status_code == 200:
            repos = repo_resp.json()
            repo_names = [f"- [{repo['full_name']}]({repo['html_url']}) (Stars: {repo['stargazers_count']})" for repo in repos]

        context = f"Successfully connected to GitHub as **{username}**.\n\n"
        if repo_names:
            context += "Here are their most recently updated repositories:\n" + "\n".join(repo_names)
        else:
            context += "No repositories found or token lacks 'repo' scope."

        # Add instructions for the LLM to include the citation
        context += f"\n\n[INSTRUCTION TO LLM: You MUST append this exact citation link at the end of your response: [Data from GitHub](citation:github:{profile_url})]"
        
        return context
        
    except requests.exceptions.RequestException as e:
        logger.error(f"GitHub Connector Error: {e}")
        return f"Error connecting to GitHub: Please check your token and internet connection."
