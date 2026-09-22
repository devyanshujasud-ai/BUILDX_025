"""
Test Suite for Vikasit Nagpur Generic ESP32 IoT Telemetry Pipeline
Verifies:
1. STREETLIGHT:
   - Normal reading: lux=40, motion=0, current=0.0 -> no anomaly
   - Abnormal reading (lamp failure): lux=10, motion=1, current=0.0 -> ANOMALY, creates/updates Electrical issue
2. POTHOLE_NODE:
   - Normal reading: ir_distance=4.0cm, acceleration=0.2g -> no anomaly
   - Abnormal reading (impact shock): acceleration=3.8g, ir_distance=18.0cm -> ANOMALY, creates/updates Roads/PWD issue with GPS
3. DUSTBIN:
   - Normal reading: fill_level=35% -> no anomaly
   - Abnormal reading (overflow): fill_level=92% -> ANOMALY, creates/updates Sanitation issue
4. Telemetry retrieval and stats
"""

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue
from app.models.iot_telemetry import IoTTelemetry

client = TestClient(app)

def test_iot_telemetry_workflow():
    print("--- Starting Vikasit Nagpur ESP32 IoT Telemetry Test Suite ---")

    # Fetch Assets
    res = client.get("/api/assets")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assets = res.json()
    assert len(assets) > 0, "No assets found in database"

    # Locate sample assets by type
    streetlight_asset = next((a for a in assets if a["type"] == "STREETLIGHT"), assets[0])
    dustbin_asset = next((a for a in assets if a["type"] == "DUSTBIN"), assets[0])
    road_asset = next((a for a in assets if a["type"] in ["ROAD_SEGMENT", "HIGHWAY_CORRIDOR"]), assets[0])

    print(f"[Setup] Streetlight Asset ID {streetlight_asset['id']}: {streetlight_asset['name']}")
    print(f"[Setup] Dustbin Asset ID {dustbin_asset['id']}: {dustbin_asset['name']}")
    print(f"[Setup] Road Asset ID {road_asset['id']}: {road_asset['name']}")

    # ==========================================
    # TEST 1: STREETLIGHT TELEMETRY
    # ==========================================
    print("\n--- Testing STREETLIGHT Telemetry ---")
    # 1.1 Normal Streetlight Telemetry (Daytime, off)
    normal_light_payload = {
        "device_id": "ESP32-STREET-01",
        "asset_id": streetlight_asset["id"],
        "device_type": "STREETLIGHT",
        "data": {"lux": 150.0, "motion": 0, "current": 0.0}
    }
    res = client.post("/api/iot/telemetry", json=normal_light_payload)
    assert res.status_code == 200, f"Normal streetlight failed: {res.text}"
    data = res.json()
    assert data["is_anomaly"] is False
    assert data["issue_id"] is None
    print("[PASS] Normal Streetlight telemetry recorded: is_anomaly=False")

    # 1.2 Abnormal Streetlight Telemetry (Lamp Failure: Night/motion, 0.0A)
    bad_light_payload = {
        "device_id": "ESP32-STREET-01",
        "asset_id": streetlight_asset["id"],
        "device_type": "STREETLIGHT",
        "data": {"lux": 10.0, "motion": 1, "current": 0.0}
    }
    res = client.post("/api/iot/telemetry", json=bad_light_payload)
    assert res.status_code == 200, f"Abnormal streetlight failed: {res.text}"
    data = res.json()
    assert data["is_anomaly"] is True
    assert data["issue_id"] is not None
    print(f"[PASS] Lamp Failure detected: is_anomaly=True | Reason: {data['anomaly_reason']}")
    print(f"       Generated Issue ID: {data['issue_id']}")

    # Verify Issue details in database
    db = SessionLocal()
    try:
        issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == data["issue_id"]).first()
        assert issue is not None
        assert issue.department == "Electrical"
        assert issue.source == "IOT_SENSOR"
        print(f"[PASS] Verified Issue: Type={issue.type}, Dept={issue.department}, Priority={issue.priority}")
    finally:
        db.close()

    # ==========================================
    # TEST 2: POTHOLE_NODE TELEMETRY
    # ==========================================
    print("\n--- Testing POTHOLE_NODE Telemetry ---")
    # 2.1 Normal Pothole Node (Smooth driving)
    normal_pothole_payload = {
        "device_id": "ESP32-POTHOLE-NODE-07",
        "asset_id": road_asset["id"],
        "device_type": "POTHOLE_NODE",
        "data": {
            "acceleration": 0.25,
            "ir_distance": 4.5,
            "latitude": road_asset["latitude"],
            "longitude": road_asset["longitude"]
        }
    }
    res = client.post("/api/iot/telemetry", json=normal_pothole_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_anomaly"] is False
    print("[PASS] Normal Road telemetry recorded: is_anomaly=False")

    # 2.2 Abnormal Pothole Node (Impact shock spike 3.6g + 19cm cavity)
    bad_pothole_payload = {
        "device_id": "ESP32-POTHOLE-NODE-07",
        "asset_id": road_asset["id"],
        "device_type": "POTHOLE_NODE",
        "data": {
            "acceleration": 3.6,
            "ir_distance": 19.0,
            "latitude": 21.1458,
            "longitude": 79.0882
        }
    }
    res = client.post("/api/iot/telemetry", json=bad_pothole_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_anomaly"] is True
    assert data["issue_id"] is not None
    print(f"[PASS] Pothole Impact detected: is_anomaly=True | Reason: {data['anomaly_reason']}")

    # Verify Issue details
    db = SessionLocal()
    try:
        issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == data["issue_id"]).first()
        assert issue is not None
        assert issue.department == "Roads/PWD"
        assert issue.severity == "CRITICAL"
        print(f"[PASS] Verified Issue: Type={issue.type}, Dept={issue.department}, Severity={issue.severity}, Priority={issue.priority}")
    finally:
        db.close()

    # ==========================================
    # TEST 3: DUSTBIN TELEMETRY
    # ==========================================
    print("\n--- Testing DUSTBIN Telemetry ---")
    # 3.1 Normal Dustbin (35% fill level)
    normal_bin_payload = {
        "device_id": "ESP32-BIN-04",
        "asset_id": dustbin_asset["id"],
        "device_type": "DUSTBIN",
        "data": {"fill_level": 35.0}
    }
    res = client.post("/api/iot/telemetry", json=normal_bin_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_anomaly"] is False
    print("[PASS] Normal Dustbin telemetry recorded: is_anomaly=False (35% fill)")

    # 3.2 Abnormal Dustbin (92% overflow)
    overflow_bin_payload = {
        "device_id": "ESP32-BIN-04",
        "asset_id": dustbin_asset["id"],
        "device_type": "DUSTBIN",
        "data": {"fill_level": 92.0}
    }
    res = client.post("/api/iot/telemetry", json=overflow_bin_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["is_anomaly"] is True
    assert data["issue_id"] is not None
    print(f"[PASS] Dustbin Overflow detected: is_anomaly=True | Reason: {data['anomaly_reason']}")

    # Verify Issue details
    db = SessionLocal()
    try:
        issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == data["issue_id"]).first()
        assert issue is not None
        assert issue.department == "Sanitation"
        assert issue.type == "DUSTBIN"
        print(f"[PASS] Verified Issue: Type={issue.type}, Dept={issue.department}, Priority={issue.priority}")
    finally:
        db.close()

    # ==========================================
    # TEST 4: RETRIEVAL & STATS
    # ==========================================
    print("\n--- Testing IoT Telemetry Log Retrieval & Network Stats ---")
    res_logs = client.get("/api/iot/telemetry?limit=10")
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) >= 6
    print(f"[PASS] Retrieved {len(logs)} telemetry log items.")

    res_stats = client.get("/api/iot/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_readings"] >= 6
    assert stats["total_anomalies"] >= 3
    assert stats["active_devices"] >= 3
    print(f"[PASS] Network Stats: Total Readings={stats['total_readings']}, Anomalies={stats['total_anomalies']}, Active Devices={stats['active_devices']}, Breakdown={stats['device_breakdown']}")

    print("\n>>> ALL ESP32 IOT TELEMETRY TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_iot_telemetry_workflow()
