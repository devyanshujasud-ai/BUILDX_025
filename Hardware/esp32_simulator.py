"""
ESP32 Smart City Hardware — Live Emulator / Streamer
Emulates the exact behavior and JSON telemetry payload sent by the ESP32 firmware
(Hardware/smart_city_wifi.ino) every 3 seconds to http://localhost:8000/api/hardware/sync.
"""

import time
import random
import requests
import sys

SERVER_URL = "http://localhost:8000/api/hardware/sync"
DEVICE_ID = "ESP32-NAGPUR-001"

print(f"==================================================")
print(f"[START] ESP32 Hardware Emulator Started")
print(f"[TARGET] Syncing to: {SERVER_URL}")
print(f"[DEVICE] Device ID: {DEVICE_ID}")
print(f"==================================================")

rfid_cards = [
    {"uid": "B3:3D:02:04", "worker_id": "RFID-NGP-7701", "name": "Ramesh Patil", "dept": "Roads/PWD"},
    {"uid": "CD:3E:C8:01", "worker_id": "RFID-NGP-8802", "name": "Sunil Deshmukh", "dept": "Electrical"},
]

uptime_sec = 0
step = 0

while True:
    try:
        step += 1
        uptime_sec += 3

        # Simulate day/night cycle (toggles every 30s)
        is_night = (step % 20) > 6
        # Simulate streetlight fault occasionally at night
        streetlight_fault = is_night and ((step % 15) == 0)
        led_on = is_night and not streetlight_fault

        # Simulate dustbin filling up then emptying
        fill_pct = min(100.0, 30.0 + (step * 4) % 75)
        dist_cm = max(2.0, 30.0 - (fill_pct * 0.28))
        bin_full = fill_pct > 80.0

        # Simulate occasional pothole impact
        pothole_event = (step % 8) == 0
        vib = random.uniform(15.0, 22.0) if pothole_event else random.uniform(0.8, 3.2)
        ax = random.uniform(-0.3, 0.3)
        ay = random.uniform(-0.3, 0.3)
        az = 9.8 + (random.uniform(5.0, 12.0) if pothole_event else random.uniform(-0.5, 0.5))

        # Simulate occasional RFID swipe
        rfid_swipe = (step % 10) == 0
        card = random.choice(rfid_cards) if rfid_swipe else None

        payload = {
            "device_id": DEVICE_ID,
            "uptime_ms": uptime_sec * 1000,
            "free_heap": random.randint(185000, 210000),
            "wifi_rssi": random.randint(-68, -55),
            "timestamp": int(time.time()),
            "streetlight": {
                "status": "FAULT" if streetlight_fault else ("ON" if led_on else "OFF"),
                "is_night": is_night,
                "ldr_module": is_night,
                "ldr_feedback": led_on,
                "led_pin_state": led_on,
                "current_draw_valid": led_on and not streetlight_fault
            },
            "dustbin": {
                "distance_cm": round(dist_cm, 1),
                "fill_level_percent": round(fill_pct, 1),
                "is_full": bin_full,
                "bin_id": "BIN-DHAN-01"
            },
            "pothole": {
                "vibration_level": round(vib, 1),
                "severe_pothole_detected": pothole_event,
                "mild_pothole_detected": False,
                "ir_obstacle": pothole_event,
                "accel": {"x": round(ax, 2), "y": round(ay, 2), "z": round(az, 2)},
                "gyro": {"x": round(random.uniform(-0.05, 0.05), 3), "y": round(random.uniform(-0.05, 0.05), 3), "z": round(random.uniform(-0.05, 0.05), 3)}
            },
            "rfid": {
                "card_present": rfid_swipe,
                "card_uid": card["uid"] if card else "",
                "auth_status": "AUTHORIZED" if card else "NO_CARD",
                "worker_id": card["worker_id"] if card else "",
                "worker_name": card["name"] if card else "",
                "department": card["dept"] if card else "",
                "action": "MAINTENANCE_LOGGED" if card else "IDLE"
            }
        }

        resp = requests.post(SERVER_URL, json=payload, timeout=2.5)
        status_code = resp.status_code
        data = resp.json() if status_code == 200 else {}
        events_cnt = data.get("events_created", 0)
        anomalies = data.get("anomalies_detected", 0)

        alert_str = ""
        if streetlight_fault: alert_str += " [STREETLIGHT FAULT]"
        if bin_full: alert_str += " [BIN FULL]"
        if pothole_event: alert_str += " [POTHOLE IMPACT]"
        if rfid_swipe: alert_str += f" [RFID SCAN: {card['name']}]"

        print(f"[{time.strftime('%X')}] Sync # {step:03d} | Status: {status_code} | RSSI: {payload['wifi_rssi']}dBm | Events: {events_cnt}{alert_str}")
        sys.stdout.flush()

    except Exception as e:
        print(f"[{time.strftime('%X')}] Error syncing: {e}")
        sys.stdout.flush()

    time.sleep(3)
