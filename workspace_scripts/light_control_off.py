# Python Smart Light Control Routine
import time
import json

def toggle_smart_light(power_on: bool):
    print("Connecting to Smart Home IoT Bridge...")
    time.sleep(0.5)
    
    status = {
        "device": "Living Room Smart Light",
        "power": "ON" if power_on else "OFF",
        "state": "OFF 🌙 [STATUS: STANDBY]",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    print(f"SUCCESS: Smart Light set to {status['power']}!")
    print("Device Details:", json.dumps(status, indent=2))

if __name__ == "__main__":
    toggle_smart_light(False)
