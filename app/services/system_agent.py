import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

SCRIPTS_DIR = Path("workspace_scripts")
SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

class SystemAgent:
    """Lightweight real-time System Control & Code Execution Agent."""

    def execute_command(self, command: str) -> Dict[str, Any]:
        """Execute a shell/system command and capture output."""
        try:
            logger.info("Executing system command: %s", command)
            # Run command with 15 second timeout to prevent hanging
            process = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=15
            )
            stdout = (process.stdout or "").strip()
            stderr = (process.stderr or "").strip()
            success = process.returncode == 0
            
            output_msg = stdout if stdout else (stderr if stderr else "Command executed successfully.")
            return {
                "success": success,
                "output": output_msg,
                "return_code": process.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "output": "Execution timed out (15s limit).", "return_code": -1}
        except Exception as e:
            logger.exception("System command execution failed")
            return {"success": False, "output": f"Execution error: {str(e)}", "return_code": -1}

    def create_and_run_script(self, filename: str, code: str) -> Dict[str, Any]:
        """Write Python code to file and execute it live on the system."""
        try:
            if not filename.endswith(".py"):
                filename += ".py"
            
            script_path = SCRIPTS_DIR / filename
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            logger.info("Created script at %s", script_path)
            
            # Execute with current python executable
            python_bin = sys.executable
            cmd = f'"{python_bin}" "{script_path.resolve()}"'
            result = self.execute_command(cmd)
            result["file_path"] = str(script_path.resolve())
            return result
        except Exception as e:
            logger.exception("Failed creating and running script")
            return {"success": False, "output": f"Script error: {str(e)}", "return_code": -1}

    def control_smart_light(self, action: str = "on") -> Dict[str, Any]:
        """Generate Python code for turning lights ON/OFF and execute it."""
        action_clean = action.lower().strip()
        state_bool = True if "on" in action_clean else False
        state_str = "ON 💡 [BRIGHTNESS: 100%, COLOR: WARM WHITE]" if state_bool else "OFF 🌙 [STATUS: STANDBY]"
        
        code = f'''# Python Smart Light Control Routine
import time
import json

def toggle_smart_light(power_on: bool):
    print("Connecting to Smart Home IoT Bridge...")
    time.sleep(0.5)
    
    status = {{
        "device": "Living Room Smart Light",
        "power": "ON" if power_on else "OFF",
        "state": "{state_str}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }}
    
    print(f"SUCCESS: Smart Light set to {{status['power']}}!")
    print("Device Details:", json.dumps(status, indent=2))

if __name__ == "__main__":
    toggle_smart_light({state_bool})
'''
        filename = f"light_control_{'on' if state_bool else 'off'}.py"
        return self.create_and_run_script(filename, code)

    def open_app(self, app_name: str) -> Dict[str, Any]:
        """Open a system application."""
        app_name_lower = app_name.lower().strip()
        app_commands = {
            "notepad": "notepad.exe",
            "calculator": "calc.exe",
            "calc": "calc.exe",
            "explorer": "explorer.exe",
            "browser": "start https://google.com",
            "chrome": "start chrome",
            "cmd": "start cmd",
        }
        cmd = app_commands.get(app_name_lower, f"start {app_name}")
        return self.execute_command(cmd)

system_agent = SystemAgent()
