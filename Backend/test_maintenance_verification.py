import os
import sys
from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import get_db, SessionLocal
from app.models.worker import Worker, MaintenanceTask
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue, IssueStatusEnum

client = TestClient(app)

def test_maintenance_verification_workflow():
    db = SessionLocal()
    print("--- Starting End-to-End Maintenance Verification Test Suite ---")

    # 1. Ensure worker exists
    worker = db.query(Worker).filter(Worker.rfid_uid == "RFID-NGP-7701").first()
    assert worker is not None, "Seeded worker Ramesh Patil must exist"

    # 2. Ensure asset exists
    asset = db.query(Asset).filter(Asset.id == 1).first()
    assert asset is not None, "Asset 1 must exist"

    # Clear any leftover in-progress tasks on this asset for clean test
    db.query(MaintenanceTask).filter(
        MaintenanceTask.worker_id == worker.id,
        MaintenanceTask.asset_id == asset.id,
        MaintenanceTask.status.in_(["IN_PROGRESS", "PENDING_VERIFICATION"])
    ).delete()
    db.commit()

    # STEP 1: 1st Scan (Worker Check-In / Start Maintenance)
    print("\n[Step 1] Worker scans RFID tag to START maintenance...")
    scan1_payload = {
        "rfid_uid": "RFID-NGP-7701",
        "asset_id": 1,
        "latitude": 21.1458,
        "longitude": 79.0882,
        "before_image": "/uploads/sample_pothole_1.jpg",
        "notes": "Arrived on-site with cold mix asphalt truck and tamper tool."
    }
    res1 = client.post("/api/rfid/scan", json=scan1_payload)
    assert res1.status_code == 200, f"Scan 1 failed: {res1.text}"
    data1 = res1.json()
    assert data1["action"] == "STARTED", f"Expected STARTED, got {data1['action']}"
    assert data1["task_status"] == "IN_PROGRESS"
    assert data1["before_image"] == "/uploads/sample_pothole_1.jpg"
    task_id = data1["task_id"]
    print(f"[PASS] 1st scan started task #{task_id}: {data1['message']}")

    # Verify task in DB has start coordinates and before image
    task_db = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    assert task_db is not None
    assert task_db.status == "IN_PROGRESS"
    assert task_db.start_latitude == 21.1458
    assert task_db.start_longitude == 79.0882
    assert task_db.before_image == "/uploads/sample_pothole_1.jpg"
    print(f"[PASS] Recorded: worker={task_db.worker_id}, asset={task_db.asset_id}, start_lat={task_db.start_latitude}, before_image={task_db.before_image}")

    # STEP 2: 2nd Scan (Worker Check-Out / Complete Maintenance -> PENDING_VERIFICATION)
    print("\n[Step 2] Worker scans RFID tag to COMPLETE maintenance with after photo & notes...")
    scan2_payload = {
        "rfid_uid": "RFID-NGP-7701",
        "asset_id": 1,
        "latitude": 21.1460,
        "longitude": 79.0885,
        "after_image": "/uploads/repair_pothole_1_fixed.jpg",
        "notes": "Pothole filled with IRC Grade cold emulsion asphalt, compacted to road grade."
    }
    res2 = client.post("/api/rfid/scan", json=scan2_payload)
    assert res2.status_code == 200, f"Scan 2 failed: {res2.text}"
    data2 = res2.json()
    assert data2["action"] == "COMPLETED"
    assert data2["task_status"] == "PENDING_VERIFICATION", f"Expected PENDING_VERIFICATION, got {data2['task_status']}"
    assert data2["after_image"] == "/uploads/repair_pothole_1_fixed.jpg"
    assert data2["notes"] == "Pothole filled with IRC Grade cold emulsion asphalt, compacted to road grade."
    print(f"[PASS] 2nd scan completed task #{task_id}: Status transitioned to PENDING_VERIFICATION!")

    # Verify task in DB
    db.refresh(task_db)
    assert task_db.status == "PENDING_VERIFICATION"
    assert task_db.completed_at is not None
    assert task_db.duration > 0
    assert task_db.end_latitude == 21.1460
    assert task_db.after_image == "/uploads/repair_pothole_1_fixed.jpg"

    # STEP 3: Authority Action: REQUEST_REWORK
    print("\n[Step 3] Civic Authority inspects task and REQUESTS REWORK...")
    rework_payload = {
        "action": "REQUEST_REWORK",
        "notes": "Edges not properly sealed with emulsion binder. Loose gravel observed.",
        "verified_by": "Er. Sunil Deshmukh (NMC Ward 12 Inspector)"
    }
    rework_res = client.post(f"/api/rfid/tasks/{task_id}/verify", json=rework_payload)
    assert rework_res.status_code == 200, f"Rework request failed: {rework_res.text}"
    rework_data = rework_res.json()
    assert rework_data["status"] == "REWORK_REQUESTED"
    assert "Edges not properly sealed" in rework_data["verification_notes"]
    assert rework_data["verified_by"] == "Er. Sunil Deshmukh (NMC Ward 12 Inspector)"
    print(f"[PASS] Authority REQUEST_REWORK executed successfully: Status is {rework_data['status']}")

    # STEP 4: Technician re-completes and Authority Action: VERIFY
    print("\n[Step 4] Technician fixes edges, and Civic Authority approves with VERIFY...")
    verify_payload = {
        "action": "VERIFY",
        "notes": "Bitumen tack coat applied, edges flushed smooth and rolled. Verified 100% compliant.",
        "verified_by": "Er. Sunil Deshmukh (NMC Ward 12 Inspector)"
    }
    verify_res = client.post(f"/api/rfid/tasks/{task_id}/verify", json=verify_payload)
    assert verify_res.status_code == 200, f"Verify failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data["status"] == "RESOLVED", f"Expected RESOLVED, got {verify_data['status']}"
    assert verify_data["verified_at"] is not None
    print(f"[PASS] Authority VERIFY executed successfully: Status transitioned to RESOLVED!")

    # Verify Asset is back to OPERATIONAL
    db.refresh(asset)
    assert asset.status == "OPERATIONAL", f"Asset status should be OPERATIONAL, got {asset.status}"
    print(f"[PASS] Target asset is back to status: {asset.status}")

    # STEP 5: Verify Stats Endpoint
    print("\n[Step 5] Checking RFID & Verification dashboard metrics...")
    stats_res = client.get("/api/rfid/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "pending_verification" in stats
    assert "resolved_tasks" in stats
    assert "rework_tasks" in stats
    print(f"[PASS] Dashboard stats verified: {stats}")

    print("\n>>> ALL END-TO-END MAINTENANCE VERIFICATION TESTS PASSED! <<<")
    db.close()

if __name__ == "__main__":
    test_maintenance_verification_workflow()
