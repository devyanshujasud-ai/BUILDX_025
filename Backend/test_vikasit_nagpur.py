from fastapi.testclient import TestClient
from app.main import app
from app.services.priority_service import priority_service

client = TestClient(app)

def test_vikasit_nagpur_models_and_apis():
    print("--- Starting Vikasit Nagpur Automatic Priority & Routing Test Suite ---")

    # 1. Test Assets Listing
    res = client.get("/api/assets")
    assert res.status_code == 200, res.text
    assets = res.json()
    assert len(assets) > 0, "No assets found"
    print(f"[PASS] Assets listed: {len(assets)} assets present.")

    # 2. Test Asset Creation
    new_asset_payload = {
        "type": "HOSPITAL_ZONE",
        "name": "GMC Hospital Access Corridor #H-01",
        "latitude": 21.1350,
        "longitude": 79.0980,
        "department": "Roads/PWD",
        "status": "OPERATIONAL"
    }
    res = client.post("/api/assets", json=new_asset_payload)
    assert res.status_code == 201, res.text
    created_asset = res.json()
    asset_id = created_asset["id"]
    print(f"[PASS] Asset created with ID: {asset_id} (Type: {created_asset['type']})")

    # 3. Test Department Routing Rules
    routing_expectations = {
        "POTHOLE": "Roads/PWD",
        "ROAD_DAMAGE": "Roads/PWD",
        "STREETLIGHT": "Electrical",
        "DUSTBIN": "Sanitation",
        "CONSTRUCTION": "Works",
        "OTHER": "General Civic",
    }

    created_issue_ids = []

    for itype, expected_dept in routing_expectations.items():
        payload = {
            "type": itype,
            "source": "CITIZEN",
            "description": f"Testing routing for {itype}",
            "latitude": 21.1450,
            "longitude": 79.0880,
            "severity": "MEDIUM",
        }
        res = client.post("/api/issues", json=payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["department"] == expected_dept, f"Expected {expected_dept}, got {data['department']}"
        assert data["priority"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")
        assert data["priority_reason"] is not None and len(data["priority_reason"]) > 0
        created_issue_ids.append(data["id"])
        print(f"[PASS] Routing: {itype} -> {data['department']} | Priority: {data['priority']} | Reason: {data['priority_reason']}")

    # 4. Test Priority Calculation Inputs
    # 4a. High severity + Near Hospital (GMC lat 21.1350, lng 79.0980) + Multiple reports
    high_priority_payload = {
        "type": "ROAD_DAMAGE",
        "source": "CITIZEN",
        "description": "Cracked road right outside GMC Emergency gate",
        "latitude": 21.1352, # ~25m from GMC Hospital
        "longitude": 79.0981,
        "severity": "CRITICAL",
        "report_count": 5,
        "asset_id": asset_id,
    }
    res = client.post("/api/issues", json=high_priority_payload)
    assert res.status_code == 201, res.text
    high_data = res.json()
    assert high_data["priority"] == "CRITICAL", f"Expected CRITICAL, got {high_data['priority']}"
    assert "Nearby" in high_data["priority_reason"], "Reason should detect nearby hospital"
    assert "Public Reports: 5" in high_data["priority_reason"]
    created_issue_ids.append(high_data["id"])
    print(f"[PASS] Priority Engine: Critical severity + Nearby Hospital + 5 reports => {high_data['priority']}")
    print(f"       Reason: {high_data['priority_reason']}")

    # 4b. Low severity + Remote location + 1 report
    low_priority_payload = {
        "type": "STREETLIGHT",
        "source": "CITIZEN",
        "description": "Minor dim light in open field",
        "latitude": 21.3000,
        "longitude": 79.3000,
        "severity": "LOW",
        "report_count": 1,
    }
    res = client.post("/api/issues", json=low_priority_payload)
    assert res.status_code == 201, res.text
    low_data = res.json()
    assert low_data["priority"] == "LOW", f"Expected LOW, got {low_data['priority']}"
    created_issue_ids.append(low_data["id"])
    print(f"[PASS] Priority Engine: Low severity + Remote + 1 report => {low_data['priority']}")

    # 5. Test Automatic Re-routing & Re-scoring on Update
    update_id = low_data["id"]
    # Change type to DUSTBIN and severity to CRITICAL and report count to 6
    update_res = client.put(f"/api/issues/{update_id}", json={
        "type": "DUSTBIN",
        "severity": "CRITICAL",
        "report_count": 6,
    })
    assert update_res.status_code == 200, update_res.text
    updated_data = update_res.json()
    assert updated_data["department"] == "Sanitation", f"Expected Sanitation, got {updated_data['department']}"
    assert updated_data["priority"] in ("HIGH", "CRITICAL")
    assert "Sanitation" in updated_data["department"]
    print(f"[PASS] Auto re-routing on PUT: Changed to DUSTBIN -> Routed to {updated_data['department']}, Priority escalated to {updated_data['priority']}")

    # 6. Test Status Transition Workflow
    status_res = client.patch(f"/api/issues/{update_id}/status", json={"status": "RESOLVED", "notes": "Repaired and cleared"})
    assert status_res.status_code == 200, status_res.text
    resolved_data = status_res.json()
    assert resolved_data["status"] == "RESOLVED"
    assert resolved_data["resolved_at"] is not None
    print(f"[PASS] Status transition to RESOLVED recorded with resolved_at timestamp.")

    # 7. Test Issues Stats Summary
    stats_res = client.get("/api/issues/stats/summary")
    assert stats_res.status_code == 200, stats_res.text
    stats = stats_res.json()
    assert "by_department" in stats
    assert "Roads/PWD" in stats["by_department"] or "Electrical" in stats["by_department"]
    print(f"[PASS] Stats Summary: {stats['total_issues']} total issues, departments: {list(stats['by_department'].keys())}")

    # 8. Clean up created test items
    for i_id in created_issue_ids:
        client.delete(f"/api/issues/{i_id}")
    client.delete(f"/api/assets/{asset_id}")
    print("[PASS] Test cleanup completed.")

    print("\n>>> ALL AUTOMATIC PRIORITY & ROUTING TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_vikasit_nagpur_models_and_apis()
