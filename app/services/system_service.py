import subprocess
import logging
import os

logger = logging.getLogger(__name__)

def open_application(app_name: str) -> str:
    """Opens an application on the user's computer (Windows)."""
    try:
        # On Windows, we can use the 'start' command which acts like Win+R
        # For store apps, it can sometimes be tricky, but start often works for known executables
        
        # Mapping common apps to their executables/uris
        app_map = {
            "whatsapp": "whatsapp:",
            "calculator": "calc",
            "notepad": "notepad",
            "chrome": "chrome",
            "edge": "msedge",
            "spotify": "spotify:",
            "explorer": "explorer",
        }
        
        target = app_map.get(app_name.lower(), app_name.lower())
        
        if target.endswith(":"):
            # URI handler
            os.startfile(target)
        else:
            # Try to start it using cmd /c start
            subprocess.Popen(f"cmd /c start {target}", shell=True)
            
        return f"Successfully executed command to open {app_name}."
    except Exception as e:
        logger.error(f"Failed to open application {app_name}: {e}")
        return f"Error: Failed to open {app_name}. {str(e)}"

def run_system_command(command: str) -> str:
    """Runs a safe system command and returns the output."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=10)
        out = result.stdout.strip()
        err = result.stderr.strip()
        if out:
            return f"Command executed. Output: {out[:500]}"
        elif err:
            return f"Command executed with error: {err[:500]}"
        return "Command executed successfully with no output."
    except Exception as e:
        return f"Failed to run command: {e}"
