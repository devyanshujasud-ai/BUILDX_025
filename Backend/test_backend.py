from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_system():
    # 1. Test Root
    res = client.get("/")
    assert res.status_code == 200
    print("[PASS] Root healthcheck:", res.json()["system"])

    # 2. Test Authorities
    res = client.get("/api/authorities")
    assert res.status_code == 200
    authorities = res.json()
    assert len(authorities) > 0
    print(f"[PASS] Authorities fetched: {len(authorities)} bodies registered.")

    # 3. Test Potholes listing & filtering
    res = client.get("/api/potholes")
    assert res.status_code == 200
    potholes = res.json()
    assert len(potholes) > 0
    print(f"[PASS] Potholes list: {len(potholes)} potholes found.")

    # 4. Test Stats Summary
    res = client.get("/api/potholes/stats/summary")
    assert res.status_code == 200
    stats = res.json()
    print(f"[PASS] Stats summary: {stats['total_potholes']} total, Resolution rate: {stats['resolution_rate_percent']}%")

    # 5. Test PDF Report Download
    sample_ticket = potholes[0]["ticket_code"]
    res = client.get(f"/api/tickets/{sample_ticket}/download-pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    print(f"[PASS] PDF Incident Report generated successfully ({len(res.content)} bytes).")

    # 6. Test Authority Lookup by GPS
    res = client.post("/api/authorities/lookup?lat=28.5398&lng=77.1232&road_type=NATIONAL_HIGHWAY")
    assert res.status_code == 200
    lookup = res.json()
    print(f"[PASS] GPS Geo-routing: mapped to {lookup['authority']['name']}")

    print("\n>>> ALL BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_system()
