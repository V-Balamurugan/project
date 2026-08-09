from datetime import datetime, timedelta
import random

from app.core.database import Base, SessionLocal, engine
from app.models import Branch, Employee, Parcel


# ---------------------------------------------------------
# DATABASE SETUP
# ---------------------------------------------------------

Base.metadata.create_all(bind=engine)

db = SessionLocal()


# ---------------------------------------------------------
# CLEAR EXISTING DEVELOPMENT DATA
# ---------------------------------------------------------

db.query(Parcel).delete()
db.query(Employee).delete()
db.query(Branch).delete()

db.commit()


# ---------------------------------------------------------
# BRANCH DATA
# ---------------------------------------------------------

branches_data = [
    {
        "branch_code": "BR001",
        "branch_name": "Chennai Central",
        "address": "Anna Salai",
        "city": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "phone": "9000000001",
    },
    {
        "branch_code": "BR002",
        "branch_name": "Madurai Central",
        "address": "KK Nagar",
        "city": "Madurai",
        "latitude": 9.9252,
        "longitude": 78.1198,
        "phone": "9000000002",
    },
    {
        "branch_code": "BR003",
        "branch_name": "Coimbatore Central",
        "address": "Gandhipuram",
        "city": "Coimbatore",
        "latitude": 11.0168,
        "longitude": 76.9558,
        "phone": "9000000003",
    },
    {
        "branch_code": "BR004",
        "branch_name": "Trichy Central",
        "address": "Srirangam Road",
        "city": "Tiruchirappalli",
        "latitude": 10.7905,
        "longitude": 78.7047,
        "phone": "9000000004",
    },
    {
        "branch_code": "BR005",
        "branch_name": "Salem Central",
        "address": "Fairlands",
        "city": "Salem",
        "latitude": 11.6643,
        "longitude": 78.1460,
        "phone": "9000000005",
    },
    {
        "branch_code": "BR006",
        "branch_name": "Tirunelveli Central",
        "address": "Palayamkottai",
        "city": "Tirunelveli",
        "latitude": 8.7139,
        "longitude": 77.7567,
        "phone": "9000000006",
    },
    {
        "branch_code": "BR007",
        "branch_name": "Bengaluru Central",
        "address": "MG Road",
        "city": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "phone": "9000000007",
    },
    {
        "branch_code": "BR008",
        "branch_name": "Hyderabad Central",
        "address": "Abids",
        "city": "Hyderabad",
        "latitude": 17.3850,
        "longitude": 78.4867,
        "phone": "9000000008",
    },
    {
        "branch_code": "BR009",
        "branch_name": "Kochi Central",
        "address": "MG Road",
        "city": "Kochi",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "phone": "9000000009",
    },
    {
        "branch_code": "BR010",
        "branch_name": "Pune Central",
        "address": "Shivajinagar",
        "city": "Pune",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "phone": "9000000010",
    },
]


branches = []

for data in branches_data:
    branch = Branch(**data)
    db.add(branch)
    branches.append(branch)

db.commit()

for branch in branches:
    db.refresh(branch)


# ---------------------------------------------------------
# EMPLOYEE DATA
# ---------------------------------------------------------

vehicle_types = [
    "BIKE",
    "VAN",
    "E-BIKE",
]

employees = []

for i in range(1, 31):

    branch = branches[(i - 1) % len(branches)]

    total_deliveries = random.randint(20, 150)
    completed_deliveries = random.randint(
        int(total_deliveries * 0.70),
        total_deliveries
    )

    delayed_deliveries = total_deliveries - completed_deliveries

    performance_score = round(
        random.uniform(72, 97),
        2
    )

    employee = Employee(
        employee_code=f"EMP{i:04d}",
        name=f"Delivery Employee {i:02d}",
        phone=f"910000{i:04d}",
        email=f"employee{i:02d}@smartdelivery.com",
        branch_id=branch.id,
        vehicle_type=random.choice(vehicle_types),
        status=random.choice([
            "ACTIVE",
            "ACTIVE",
            "ACTIVE",
            "ON_LEAVE"
        ]),
        current_latitude=branch.latitude + random.uniform(
            -0.05,
            0.05
        ),
        current_longitude=branch.longitude + random.uniform(
            -0.05,
            0.05
        ),
        total_deliveries=total_deliveries,
        completed_deliveries=completed_deliveries,
        delayed_deliveries=delayed_deliveries,
        average_delivery_time=round(
            random.uniform(25, 65),
            2
        ),
        performance_score=performance_score,
    )

    db.add(employee)
    employees.append(employee)

db.commit()

for employee in employees:
    db.refresh(employee)


# ---------------------------------------------------------
# PARCEL DATA
# ---------------------------------------------------------

parcel_statuses = [
    "REGISTERED",
    "PROCESSING",
    "DISPATCHED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "DELAYED",
]

service_types = [
    "STANDARD",
    "EXPRESS",
    "SAME_DAY",
]

priorities = [
    "LOW",
    "NORMAL",
    "HIGH",
    "CRITICAL",
]

parcels = []

for i in range(1, 101):

    source_branch = random.choice(branches)

    destination_branch = random.choice(branches)

    while destination_branch.id == source_branch.id:
        destination_branch = random.choice(branches)

    status = random.choice(parcel_statuses)

    created_at = datetime.utcnow() - timedelta(
        days=random.randint(0, 30),
        hours=random.randint(0, 23)
    )

    expected_delivery = created_at + timedelta(
        days=random.randint(1, 5)
    )

    actual_delivery = None

    if status == "DELIVERED":
        actual_delivery = expected_delivery - timedelta(
            minutes=random.randint(-60, 120)
        )

    parcel = Parcel(
        tracking_number=f"PKG{i:05d}",

        sender=f"Sender {i:03d}",

        receiver=f"Receiver {i:03d}",

        source_branch_id=source_branch.id,

        destination_branch_id=destination_branch.id,

        source_address=(
            f"{random.randint(1, 200)} "
            f"{source_branch.address}, "
            f"{source_branch.city}"
        ),

        destination_address=(
            f"{random.randint(1, 200)} "
            f"{destination_branch.address}, "
            f"{destination_branch.city}"
        ),

        latitude=destination_branch.latitude,

        longitude=destination_branch.longitude,

        service_type=random.choice(service_types),

        priority=random.choice(priorities),

        weight=round(
            random.uniform(0.2, 20.0),
            2
        ),

        status=status,

        created_at=created_at,

        expected_delivery_time=expected_delivery,

        actual_delivery_time=actual_delivery,
    )

    db.add(parcel)
    parcels.append(parcel)


db.commit()


# ---------------------------------------------------------
# CLOSE DATABASE
# ---------------------------------------------------------

db.close()


print("==========================================")
print("Development data created successfully!")
print("==========================================")
print("Branches  :", len(branches))
print("Employees :", len(employees))
print("Parcels   :", len(parcels))
print("==========================================")