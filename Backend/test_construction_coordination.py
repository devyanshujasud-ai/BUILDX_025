"""
Test Suite for Vikasit Nagpur Multi-Agency Construction & Work Coordination
Verifies:
1. Listing registered utility agencies and contractors
2. Existing seeded projects detection:
   - PRJ-NGP-2026-001 (Water Pipeline) and PRJ-NGP-2026-002 (Electric Cable) on WHC Road
     must trigger 'POTENTIAL COORDINATION CONFLICT'
3. Creating a new project on an isolated road (no conflict)
4. Creating a colliding project (overlapping dates and spatial proximity) -> triggers immediate conflict
5. Listing global city conflicts via /api/construction/conflicts
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_construction_coordination_workflow():
    print("--- Starting Vikasit Nagpur Construction Coordination Test Suite ---")

    # 1. Check Agencies
    res = client.get("/api/construction/agencies")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    agencies = res.json()
    assert len(agencies) >= 3, f"Expected at least 3 agencies, got {len(agencies)}"
    print(f"[PASS] Registered agencies listed: {len(agencies)} agencies found.")

    water_agency = next((a for a in agencies if "Water" in a["name"]), agencies[0])
    elec_agency = next((a for a in agencies if "MSEDCL" in a["code"] or "Electric" in a["name"]), agencies[1])
    print(f"[PASS] Agencies verified: '{water_agency['name']}' & '{elec_agency['name']}'")

    # 2. Check Contractors
    res = client.get("/api/construction/contractors")
    assert res.status_code == 200
    contractors = res.json()
    assert len(contractors) >= 2
    print(f"[PASS] Registered contractors listed: {len(contractors)} contractors found.")

    # 3. Check Projects & Overlapping Conflict Detection
    res = client.get("/api/construction/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) >= 4, f"Expected at least 4 projects, got {len(projects)}"
    print(f"[PASS] Projects listed: {len(projects)} total projects.")

    # Verify WHC Road pair conflict
    whc_water = next((p for p in projects if p["project_id"] == "PRJ-NGP-2026-001"), None)
    whc_elec = next((p for p in projects if p["project_id"] == "PRJ-NGP-2026-002"), None)

    assert whc_water is not None, "PRJ-NGP-2026-001 not found"
    assert whc_elec is not None, "PRJ-NGP-2026-002 not found"

    assert whc_water["has_conflict"] is True, "Expected WHC water project to have conflict"
    assert whc_elec["has_conflict"] is True, "Expected WHC electric project to have conflict"
    assert len(whc_water["conflicts"]) > 0

    first_conflict = whc_water["conflicts"][0]
    assert "POTENTIAL COORDINATION CONFLICT" in first_conflict["conflict_message"]
    print(f"[PASS] Conflict correctly detected between PRJ-NGP-2026-001 and PRJ-NGP-2026-002!")
    print(f"       Message: {first_conflict['conflict_message']}")

    # 4. Check Global Conflicts Endpoint
    res_conflicts = client.get("/api/construction/conflicts")
    assert res_conflicts.status_code == 200
    all_conflicts = res_conflicts.json()
    assert len(all_conflicts) >= 1
    print(f"[PASS] Global city conflicts retrieved: {len(all_conflicts)} active clash(es).")

    # 5. Create a Non-Conflicting Project (Isolated location in Hingna)
    clean_project_payload = {
        "project_id": "PRJ-NGP-TEST-CLEAN",
        "location": "Hingna Industrial Area Road 5",
        "agency_id": water_agency["id"],
        "contractor_id": contractors[0]["id"],
        "work_type": "WATER_PIPELINE",
        "start_date": "2026-11-01",
        "end_date": "2026-11-30",
        "status": "PLANNED",
        "description": "Industrial feeder connection.",
        "latitude": 21.0950,
        "longitude": 78.9800,
    }
    res_clean = client.post("/api/construction/projects", json=clean_project_payload)
    assert res_clean.status_code == 200, f"Failed to create clean project: {res_clean.text}"
    clean_data = res_clean.json()
    assert clean_data["has_conflict"] is False
    assert len(clean_data["conflicts"]) == 0
    print("[PASS] Non-conflicting project created cleanly: has_conflict=False.")

    # 6. Create an Overlapping Project (Telecom Trenching on West High Court Road during October)
    telecom_agency = next((a for a in agencies if "Fiber" in a["name"] or "Telecom" in a["department"]), water_agency)
    colliding_payload = {
        "project_id": "PRJ-NGP-TEST-CLASH",
        "location": "West High Court Road, Dharampeth",
        "agency_id": telecom_agency["id"],
        "contractor_id": contractors[0]["id"],
        "work_type": "TELECOM",
        "start_date": "2026-10-05",
        "end_date": "2026-10-18",
        "status": "PLANNED",
        "description": "5G Optical fiber duct trenching.",
        "latitude": 21.1433,
        "longitude": 79.0622,
    }
    res_clash = client.post("/api/construction/projects", json=colliding_payload)
    assert res_clash.status_code == 200
    clash_data = res_clash.json()
    assert clash_data["has_conflict"] is True
    assert len(clash_data["conflicts"]) >= 1
    assert "POTENTIAL COORDINATION CONFLICT" in clash_data["conflicts"][0]["conflict_message"]
    print(f"[PASS] Real-time collision detected on project creation: {clash_data['conflicts'][0]['conflict_message']}")

    print("\n>>> ALL MULTI-AGENCY CONSTRUCTION COORDINATION TESTS PASSED! <<<\n")

if __name__ == "__main__":
    test_construction_coordination_workflow()
