import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import Base, engine
import app.models  # load all models


def sync_schema_and_clean_test_data():
    print("1. Creating any missing database tables (vehicles, parcel_journey_events, route_plans)...")
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        print("2. Ensuring all updated columns exist in PostgreSQL tables...")
        alter_statements = [
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20);",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20);",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS sender_latitude FLOAT DEFAULT 9.9252;",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS sender_longitude FLOAT DEFAULT 78.1198;",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS receiver_latitude FLOAT DEFAULT 9.9390;",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS receiver_longitude FLOAT DEFAULT 78.1340;",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'CREATED';",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_branch_id INTEGER REFERENCES branches(id);",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_vehicle_id INTEGER REFERENCES vehicles(id);",
            "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_employee_id INTEGER REFERENCES employees(id);",
            "ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id);",
            "ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'LAST_MILE_DELIVERY';",
        ]
        for stmt in alter_statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Notice during column check: {e}")

        print("3. Safely removing dummy development and test data in foreign-key dependency order...")
        conn.execute(text("DELETE FROM delivery_tracking;"))
        conn.execute(text("DELETE FROM route_plans;"))
        conn.execute(text("DELETE FROM parcel_journey_events;"))
        conn.execute(text("DELETE FROM delivery_assignments;"))
        conn.execute(text("DELETE FROM parcels;"))
        conn.execute(text("DELETE FROM vehicles;"))

        # Remove dummy/test branch like 'Updated Test Branch'
        conn.execute(text("DELETE FROM branches WHERE branch_name ILIKE '%test%';"))

        print("4. Resetting table auto-increment identity sequences...")
        tables_to_reset = [
            "parcels",
            "delivery_assignments",
            "delivery_tracking",
            "route_plans",
            "parcel_journey_events",
            "vehicles",
        ]
        for t in tables_to_reset:
            try:
                conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), 1, false);"))
            except Exception:
                pass

        print("5. Seeding initial fleet vehicles for inter-city and local branch operations...")
        branches = conn.execute(text("SELECT id, branch_name, latitude, longitude FROM branches ORDER BY id")).fetchall()
        employees = conn.execute(text("SELECT id, name FROM employees ORDER BY id")).fetchall()

        if branches:
            b_first = branches[0]
            b_sec = branches[1] if len(branches) > 1 else b_first
            b_third = branches[2] if len(branches) > 2 else b_first

            e1 = employees[0][0] if len(employees) > 0 else None
            e2 = employees[1][0] if len(employees) > 1 else None
            e3 = employees[2][0] if len(employees) > 2 else None

            sample_vehicles = [
                ("TN-58-AB-1001", "VAN", 800.0, 60, b_first[0], e1, "AVAILABLE", float(b_first[2]), float(b_first[3])),
                ("TN-58-AB-1002", "TRUCK", 2500.0, 200, b_first[0], e2, "AVAILABLE", float(b_first[2]), float(b_first[3])),
                ("TN-01-CD-2001", "VAN", 800.0, 60, b_sec[0], e3, "AVAILABLE", float(b_sec[2]), float(b_sec[3])),
                ("TN-01-CD-2002", "TRUCK", 2500.0, 200, b_sec[0], None, "AVAILABLE", float(b_sec[2]), float(b_sec[3])),
                ("TN-45-EF-3001", "VAN", 800.0, 60, b_third[0], None, "AVAILABLE", float(b_third[2]), float(b_third[3])),
            ]
            for reg, vtype, cap, max_p, b_id, d_id, stat, lat, lon in sample_vehicles:
                conn.execute(
                    text(
                        """
                        INSERT INTO vehicles (registration_number, vehicle_type, capacity_kg, max_parcels, current_branch_id, assigned_driver_id, status, current_latitude, current_longitude, created_at, updated_at)
                        VALUES (:reg, :vtype, :cap, :max_p, :b_id, :d_id, :stat, :lat, :lon, NOW(), NOW())
                        ON CONFLICT (registration_number) DO NOTHING;
                        """
                    ),
                    {
                        "reg": reg,
                        "vtype": vtype,
                        "cap": cap,
                        "max_p": max_p,
                        "b_id": b_id,
                        "d_id": d_id,
                        "stat": stat,
                        "lat": lat,
                        "lon": lon,
                    },
                )

    print("[SUCCESS] Database schema synchronized & clean operational state successfully initialized!")


if __name__ == "__main__":
    sync_schema_and_clean_test_data()
