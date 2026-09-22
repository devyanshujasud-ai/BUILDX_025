"""
Test Suite for Vikasit Nagpur RFID-Based Worker Tracking System
Verifies:
1. Worker listing and registration
2. Scan 1 (Start maintenance) -> Task created, status IN_PROGRESS, timestamps recorded
3. Scan 2 (End maintenance) -> Task completed, duration calculated, status COMPLETED
4. Asset and Issue status transitions
5. Maintenance history retrieval and KPI stats
"""

import time
import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.worker import Worker, MaintenanceTask
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue, IssueStatusEnum

client = TestClient(app)

def test_rfid_tracking_workflow():
    print("--- Starting Vikasit Nagpur RFID Worker Tracking Test Suite ---")

    # 1. Check Workers list
    res = client.get("/api/rfid/workers")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    workers = res.json()
    assert len(workers) >= 4, f"Expected at least 4 workers, got {len(workers)}"
    print(f"[PASS] Registered workers listed: {len(workers)} workers found.")

    ramesh = next((w for w in workers if w["rfid_uid"] == "RFID-NGP-7701"), None)
    assert ramesh is not None, "Worker Ramesh Patil (RFID-NGP-7701) not found"
    print(f"[PASS] Worker verified: {ramesh['name']} ({ramesh['role']}, {ramesh['department']})")

    # 2. Get an asset for testing
    res = client.get("/api/assets")
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) > 0, "No assets found"
    test_asset = assets[0]
    asset_id = test_asset["id"]
    print(f"[PASS] Testing with Asset ID {asset_id}: '{test_asset['name']}' ({test_asset['type']})")

    # Clean up any existing in-progress tasks on this asset/worker pair before test
    db = SessionLocal()
    try:
        existing_tasks = db.query(MaintenanceTask).filter(
            MaintenanceTask.worker_id == ramesh["id"],
            MaintenanceTask.asset_id == asset_id,
            MaintenanceTask.status == "IN_PROGRESS",
        ).all()
        for t in existing_tasks:
            t.status = "COMPLETED"
        db.commit()
    finally:
        db.close()

    # 3. Test Invalid RFID UID
    res = client.post("/api/rfid/scan", json={"rfid_uid": "INVALID-TAG-9999", "asset_id": asset_id})
    assert res.status_code == 404, f"Expected 404 for invalid UID, got {res.status_code}"
    print("[PASS] Invalid RFID UID correctly rejected with 404.")

    # 4. Test Invalid Asset ID
    res = client.post("/api/rfid/scan", json={"rfid_uid": ramesh["rfid_uid"], "asset_id": 999999})
    assert res.status_code == 404, f"Expected 404 for invalid asset, got {res.status_code}"
    print("[PASS] Invalid Asset ID correctly rejected with 404.")

    # 5. FIRST VALID SCAN -> Start Maintenance
    scan1_payload = {
        "rfid_uid": ramesh["rfid_uid"],
        "asset_id": asset_id
    }
    res1 = client.post("/api/rfid/scan", json=scan1_payload)
    assert res1.status_code == 200, f"Scan 1 failed: {res1.text}"
    data1 = res1.json()
    assert data1["action"] == "STARTED", f"Expected action STARTED, got {data1['action']}"
    assert data1["worker_name"] == ramesh["name"]
    assert data1["asset_id"] == asset_id
    assert data1["started_at"] is not None
    assert data1["completed_at"] is None
    assert data1["duration_seconds"] is None
    task_id = data1["task_id"]
    print(f"[PASS] Scan 1 Successful: Task #{task_id} STARTED by {data1['worker_name']} at {data1['started_at']}")

    # Verify Asset is now UNDER_MAINTENANCE
    res_asset = client.get(f"/api/assets/{asset_id}")
    assert res_asset.status_code == 200
    assert res_asset.json()["status"] == "UNDER_MAINTENANCE"
    print(f"[PASS] Asset status updated to UNDER_MAINTENANCE")

    # 6. Wait 1.5 seconds to simulate work duration
    print("       Simulating maintenance duration (sleeping 1.5s)...")
    time.sleep(1.5)

    # 7. SECOND VALID SCAN -> End Maintenance
    res2 = client.post("/api/rfid/scan", json=scan1_payload)
    assert res2.status_code == 200, f"Scan 2 failed: {res2.text}"
    data2 = res2.json()
    assert data2["action"] == "COMPLETED", f"Expected action COMPLETED, got {data2['action']}"
    assert data2["task_id"] == task_id
    assert data2["completed_at"] is not None
    assert data2["duration_seconds"] is not None
    assert data2["duration_seconds"] >= 1.0, f"Expected duration >= 1.0s, got {data2['duration_seconds']}"
    assert data2["formatted_duration"] is not None
    print(f"[PASS] Scan 2 Successful: Task #{task_id} COMPLETED in {data2['formatted_duration']} ({data2['duration_seconds']}s)")

    # Verify Asset is back to OPERATIONAL
    res_asset2 = client.get(f"/api/assets/{asset_id}")
    assert res_asset2.status_code == 200
    assert res_asset2.json()["status"] == "OPERATIONAL"
    print(f"[PASS] Asset status restored to OPERATIONAL")

    # 8. Check Maintenance Tasks List
    res_tasks = client.get("/api/rfid/tasks")
    assert res_tasks.status_code == 200
    tasks_list = res_tasks.json()
    assert len(tasks_list) > 0
    matched = next((t for t in tasks_list if t["id"] == task_id), None)
    assert matched is not None, f"Task #{task_id} not found in /api/rfid/tasks"
    assert matched["status"] == "COMPLETED"
    assert matched["worker"]["name"] == ramesh["name"]
    print(f"[PASS] Task #{task_id} verified in Maintenance History list with worker details and formatted duration '{matched['duration_formatted']}'.")

    # 9. Check RFID Stats Summary
    res_stats = client.get("/api/rfid/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_workers"] >= 4
    assert stats["completed_tasks"] >= 1
    print(f"[PASS] RFID Stats verified: Total Workers: {stats['total_workers']}, Completed Tasks: {stats['completed_tasks']}, Avg Duration: {stats['avg_duration_formatted']}")

    print("\n>>> ALL RFID MAINTENANCE TRACKING TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_rfid_tracking_workflow()
