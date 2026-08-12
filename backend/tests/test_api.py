import uuid
from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_parcels" in data
    assert "active_employees" in data
    assert "pending_deliveries" in data


def test_get_branches():
    response = client.get("/api/branches")
    assert response.status_code == 200
    branches = response.json()
    assert isinstance(branches, list)
    assert len(branches) > 0


def test_get_branch_by_id():
    branches_res = client.get("/api/branches")
    branch_id = branches_res.json()[0]["id"]
    response = client.get(f"/api/branches/{branch_id}")
    assert response.status_code == 200
    assert response.json()["id"] == branch_id


def test_get_employees():
    response = client.get("/api/employees")
    assert response.status_code == 200
    data = response.json()
    assert "employees" in data
    assert "total" in data


def test_get_employee_by_id():
    emp_res = client.get("/api/employees")
    employees = emp_res.json()["employees"]
    if employees:
        emp_id = employees[0]["id"]
        response = client.get(f"/api/employees/{emp_id}")
        assert response.status_code == 200
        assert response.json()["id"] == emp_id


def test_get_parcels():
    response = client.get("/api/parcels")
    assert response.status_code == 200
    data = response.json()
    assert "parcels" in data
    assert "total" in data


def test_get_parcel_by_id_and_tracking():
    parcels_res = client.get("/api/parcels")
    parcels = parcels_res.json()["parcels"]
    if parcels:
        target = parcels[0]
        parcel_id = target["id"]
        tracking_num = target["tracking_number"]

        res_id = client.get(f"/api/parcels/{parcel_id}")
        assert res_id.status_code == 200
        assert res_id.json()["id"] == parcel_id

        res_track = client.get(f"/api/parcels/tracking/{tracking_num}")
        assert res_track.status_code == 200
        assert res_track.json()["tracking_number"] == tracking_num


def test_create_and_update_branch():
    code = f"TB{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "branch_code": code,
        "branch_name": "Test Branch",
        "address": "123 Test St",
        "city": "Test City",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "phone": "9876543210",
        "status": "ACTIVE"
    }
    res = client.post("/api/branches", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["branch_code"] == code

    # Update
    update_res = client.put(f"/api/branches/{created['id']}", json={"branch_name": "Updated Test Branch"})
    assert update_res.status_code == 200
    assert update_res.json()["branch_name"] == "Updated Test Branch"


def test_create_and_update_employee():
    branches = client.get("/api/branches").json()
    branch_id = branches[0]["id"]
    code = f"EMP{uuid.uuid4().hex[:6].upper()}"
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "employee_code": code,
        "name": "Test Employee",
        "phone": "9876543210",
        "email": email,
        "branch_id": branch_id,
        "vehicle_type": "Bike",
        "status": "ACTIVE"
    }
    res = client.post("/api/employees", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["employee_code"] == code

    # Update
    update_res = client.put(f"/api/employees/{created['id']}", json={"name": "Updated Employee Name"})
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Employee Name"


def test_create_update_and_patch_parcel():
    branches = client.get("/api/branches").json()
    s_id = branches[0]["id"]
    d_id = branches[1]["id"]
    track_num = f"TRK{uuid.uuid4().hex[:8].upper()}"

    payload = {
        "tracking_number": track_num,
        "sender": "Alice",
        "receiver": "Bob",
        "source_branch_id": s_id,
        "destination_branch_id": d_id,
        "source_address": "Source Address 1",
        "destination_address": "Destination Address 2",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "service_type": "Express",
        "priority": "HIGH",
        "weight": 2.5,
        "status": "REGISTERED"
    }

    res = client.post("/api/parcels", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["tracking_number"] == track_num

    # Patch Status
    patch_res = client.patch(f"/api/parcels/{created['id']}/status?new_status=IN_TRANSIT")
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_TRANSIT"

    # Patch Status to DISPATCHED
    patch_res2 = client.patch(f"/api/parcels/{created['id']}/status?new_status=DISPATCHED")
    assert patch_res2.status_code == 200
    assert patch_res2.json()["status"] == "DISPATCHED"
