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
        "status": "ACTIVE",
    }
    res = client.post("/api/branches", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["branch_code"] == code

    # Update
    update_res = client.put(
        f"/api/branches/{created['id']}",
        json={"branch_name": "Updated Test Branch"},
    )
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
        "status": "ACTIVE",
    }
    res = client.post("/api/employees", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["employee_code"] == code

    # Update
    update_res = client.put(
        f"/api/employees/{created['id']}",
        json={"name": "Updated Employee Name"},
    )
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
        "status": "REGISTERED",
    }

    res = client.post("/api/parcels", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["tracking_number"] == track_num

    # Patch Status
    patch_res = client.patch(
        f"/api/parcels/{created['id']}/status?new_status=IN_TRANSIT"
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_TRANSIT"

    # Patch Status to DISPATCHED
    patch_res2 = client.patch(
        f"/api/parcels/{created['id']}/status?new_status=DISPATCHED"
    )
    assert patch_res2.status_code == 200
    assert patch_res2.json()["status"] == "DISPATCHED"


# ============================================================
# DELIVERY ASSIGNMENT TESTS (Tests 1 - 10)
# ============================================================


def _create_helper_parcel(status="REGISTERED"):
    branches = client.get("/api/branches").json()
    s_id = branches[0]["id"]
    d_id = branches[1]["id"]
    track_num = f"TRK{uuid.uuid4().hex[:8].upper()}"
    payload = {
        "tracking_number": track_num,
        "sender": "Sender Test",
        "receiver": "Receiver Test",
        "source_branch_id": s_id,
        "destination_branch_id": d_id,
        "source_address": "Addr 1",
        "destination_address": "Addr 2",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "service_type": "STANDARD",
        "priority": "NORMAL",
        "weight": 1.5,
        "status": status,
    }
    res = client.post("/api/parcels", json=payload)
    assert res.status_code == 201
    return res.json()


def _create_helper_employee(status="ACTIVE"):
    branches = client.get("/api/branches").json()
    branch_id = branches[0]["id"]
    code = f"EMP{uuid.uuid4().hex[:6].upper()}"
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "employee_code": code,
        "name": f"Employee {code}",
        "phone": "9876543210",
        "email": email,
        "branch_id": branch_id,
        "vehicle_type": "VAN",
        "status": status,
    }
    res = client.post("/api/employees", json=payload)
    assert res.status_code == 201
    return res.json()


def test_delivery_assignment_test1_success():
    parcel = _create_helper_parcel(status="REGISTERED")
    employee = _create_helper_employee(status="ACTIVE")

    payload = {
        "parcel_id": parcel["id"],
        "employee_id": employee["id"],
        "notes": "Assigned from admin dashboard",
    }
    res = client.post("/api/delivery-assignments", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["assignment_code"].startswith("DA")
    assert data["parcel_id"] == parcel["id"]
    assert data["employee_id"] == employee["id"]
    assert data["status"] == "ASSIGNED"


def test_delivery_assignment_test2_invalid_employee():
    parcel = _create_helper_parcel(status="REGISTERED")
    payload = {
        "parcel_id": parcel["id"],
        "employee_id": 9999999,
        "notes": "Testing invalid employee",
    }
    res = client.post("/api/delivery-assignments", json=payload)
    assert res.status_code == 404
    assert "Employee not found" in res.json()["detail"]


def test_delivery_assignment_test3_inactive_employee():
    parcel = _create_helper_parcel(status="REGISTERED")
    inactive_emp = _create_helper_employee(status="INACTIVE")

    payload = {
        "parcel_id": parcel["id"],
        "employee_id": inactive_emp["id"],
        "notes": "Testing inactive employee",
    }
    res = client.post("/api/delivery-assignments", json=payload)
    assert res.status_code == 409
    assert "Only ACTIVE employees can be assigned" in res.json()["detail"]


def test_delivery_assignment_test4_duplicate_active_assignment():
    parcel = _create_helper_parcel(status="REGISTERED")
    emp1 = _create_helper_employee(status="ACTIVE")
    emp2 = _create_helper_employee(status="ACTIVE")

    payload1 = {"parcel_id": parcel["id"], "employee_id": emp1["id"]}
    res1 = client.post("/api/delivery-assignments", json=payload1)
    assert res1.status_code == 201

    payload2 = {"parcel_id": parcel["id"], "employee_id": emp2["id"]}
    res2 = client.post("/api/delivery-assignments", json=payload2)
    assert res2.status_code == 409
    assert "already has an active delivery assignment" in res2.json()["detail"]


def test_delivery_assignment_test5_delivered_parcel():
    parcel = _create_helper_parcel(status="DELIVERED")
    emp = _create_helper_employee(status="ACTIVE")

    payload = {"parcel_id": parcel["id"], "employee_id": emp["id"]}
    res = client.post("/api/delivery-assignments", json=payload)
    assert res.status_code == 409
    assert "Cannot assign parcel with status 'DELIVERED'" in res.json()["detail"]


def test_delivery_assignment_test6_cancelled_parcel():
    parcel = _create_helper_parcel(status="CANCELLED")
    emp = _create_helper_employee(status="ACTIVE")

    payload = {"parcel_id": parcel["id"], "employee_id": emp["id"]}
    res = client.post("/api/delivery-assignments", json=payload)
    assert res.status_code == 409
    assert "Cannot assign parcel with status 'CANCELLED'" in res.json()["detail"]


def test_delivery_assignment_test7_reassignment():
    parcel = _create_helper_parcel(status="REGISTERED")
    emp_ravi = _create_helper_employee(status="ACTIVE")
    emp_kumar = _create_helper_employee(status="ACTIVE")

    create_res = client.post(
        "/api/delivery-assignments",
        json={"parcel_id": parcel["id"], "employee_id": emp_ravi["id"]},
    )
    assert create_res.status_code == 201
    assignment_id = create_res.json()["id"]

    # Reassign to Kumar
    update_res = client.put(
        f"/api/delivery-assignments/{assignment_id}",
        json={
            "employee_id": emp_kumar["id"],
            "notes": "Reassigned due to employee availability",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["employee_id"] == emp_kumar["id"]


def test_delivery_assignment_test8_status_flow():
    parcel = _create_helper_parcel(status="REGISTERED")
    emp = _create_helper_employee(status="ACTIVE")

    create_res = client.post(
        "/api/delivery-assignments",
        json={"parcel_id": parcel["id"], "employee_id": emp["id"]},
    )
    assert create_res.status_code == 201
    assignment_id = create_res.json()["id"]
    assert create_res.json()["status"] == "ASSIGNED"

    # ASSIGNED -> PICKED_UP
    step1 = client.patch(
        f"/api/delivery-assignments/{assignment_id}/status",
        json={"status": "PICKED_UP"},
    )
    assert step1.status_code == 200
    assert step1.json()["status"] == "PICKED_UP"
    assert step1.json()["picked_up_at"] is not None

    # PICKED_UP -> IN_TRANSIT
    step2 = client.patch(
        f"/api/delivery-assignments/{assignment_id}/status",
        json={"status": "IN_TRANSIT"},
    )
    assert step2.status_code == 200
    assert step2.json()["status"] == "IN_TRANSIT"

    # IN_TRANSIT -> DELIVERED
    step3 = client.patch(
        f"/api/delivery-assignments/{assignment_id}/status",
        json={"status": "DELIVERED"},
    )
    assert step3.status_code == 200
    assert step3.json()["status"] == "DELIVERED"
    assert step3.json()["delivered_at"] is not None


def test_delivery_assignment_test9_invalid_status():
    parcel = _create_helper_parcel(status="REGISTERED")
    emp = _create_helper_employee(status="ACTIVE")

    create_res = client.post(
        "/api/delivery-assignments",
        json={"parcel_id": parcel["id"], "employee_id": emp["id"]},
    )
    assert create_res.status_code == 201
    assignment_id = create_res.json()["id"]

    # Invalid status name
    res_bad = client.patch(
        f"/api/delivery-assignments/{assignment_id}/status",
        json={"status": "Delivery"},
    )
    assert res_bad.status_code == 409

    # Invalid transition (ASSIGNED -> DELIVERED without PICKED_UP / IN_TRANSIT)
    res_skip = client.patch(
        f"/api/delivery-assignments/{assignment_id}/status",
        json={"status": "DELIVERED"},
    )
    assert res_skip.status_code == 409


def test_delivery_assignment_test10_existing_modules():
    # Verify Branch Management
    branch_res = client.get("/api/branches")
    assert branch_res.status_code == 200

    # Verify Employee Management
    emp_res = client.get("/api/employees")
    assert emp_res.status_code == 200

    # Verify Parcel Management
    parcel_res = client.get("/api/parcels")
    assert parcel_res.status_code == 200

    # Verify Admin Dashboard Summary
    dash_res = client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200

    # Verify Delivery Assignments list
    assign_res = client.get("/api/delivery-assignments")
    assert assign_res.status_code == 200
