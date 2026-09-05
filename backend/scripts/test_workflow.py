import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.schemas.parcel import ParcelCreate
from app.services.parcel_service import ParcelService
from app.models.employee import Employee
from app.models.vehicle import Vehicle
from app.models.branch import Branch


def run_workflow_test():
    db = SessionLocal()
    try:
        branches = db.query(Branch).order_by(Branch.id).all()
        employees = db.query(Employee).order_by(Employee.id).all()
        vehicles = db.query(Vehicle).order_by(Vehicle.id).all()

        if len(branches) < 2 or len(employees) < 2 or len(vehicles) < 1:
            print("Insufficient bootstrap data for test")
            return

        b_src = branches[0]
        b_dst = branches[1]
        emp_pickup = employees[0]
        emp_delivery = employees[1]
        veh = vehicles[0]

        print(f"Creating parcel from Hub #{b_src.id} ({b_src.branch_name}) to Hub #{b_dst.id} ({b_dst.branch_name})...")
        import time
        t_num = f"SP-WF-{int(time.time())}"
        p = ParcelService.create_parcel(
            db=db,
            data=ParcelCreate(
                tracking_number=t_num,
                sender="Siddharth (Madurai)",
                sender_phone="9876500001",
                receiver="Kavitha (Chennai)",
                receiver_phone="9876500002",
                source_branch_id=b_src.id,
                destination_branch_id=b_dst.id,
                source_address="12 South Masi Street, Madurai",
                destination_address="45 Mount Road, Chennai",
                sender_latitude=float(b_src.latitude),
                sender_longitude=float(b_src.longitude),
                receiver_latitude=float(b_dst.latitude),
                receiver_longitude=float(b_dst.longitude),
                weight=3.2,
                priority="URGENT",
            ),
        )

        print(f"[Stage 1] Parcel Created: {p.tracking_number} (Stage: {p.current_stage})")

        p = ParcelService.assign_pickup_employee(db, p.id, emp_pickup.id, "Priority morning pickup")
        print(f"[Stage 2] Pickup Assigned: Driver #{emp_pickup.id} (Stage: {p.current_stage})")

        p = ParcelService.start_pickup(db, p.id)
        print(f"[Stage 3] Pickup In Progress (Stage: {p.current_stage})")

        p = ParcelService.confirm_pickup(db, p.id, "Received in good condition")
        print(f"[Stage 4] Picked Up (Stage: {p.current_stage})")

        p = ParcelService.start_inbound_transfer(db, p.id)
        print(f"[Stage 5] Inbound Transport to Hub (Stage: {p.current_stage})")

        p = ParcelService.receive_at_sender_branch(db, p.id, b_src.id)
        print(f"[Stage 6] At Sender Hub (Stage: {p.current_stage})")

        p = ParcelService.prepare_intercity_transport(db, p.id)
        print(f"[Stage 7] Ready for Intercity Transport (Stage: {p.current_stage})")

        p = ParcelService.assign_intercity_vehicle(db, p.id, veh.id, emp_pickup.id)
        print(f"[Stage 8] Intercity Assigned to Vehicle {veh.registration_number} (Stage: {p.current_stage})")

        p = ParcelService.start_intercity_transit(db, p.id)
        print(f"[Stage 9] In Intercity Transit (Stage: {p.current_stage})")

        p = ParcelService.receive_at_receiver_branch(db, p.id, b_dst.id)
        print(f"[Stage 10] Received at Receiver Hub #{b_dst.id} (Stage: {p.current_stage})")

        p = ParcelService.prepare_last_mile(db, p.id)
        print(f"[Stage 11] Ready for Last-Mile (Stage: {p.current_stage})")

        p = ParcelService.assign_last_mile_delivery(db, p.id, emp_delivery.id, "Last mile doorstep dispatch")
        print(f"[Stage 12] Out for Delivery with Driver #{emp_delivery.id} (Stage: {p.current_stage})")

        p = ParcelService.confirm_delivery(db, p.id, "Kavitha", "9912", "Handed over directly to customer")
        print(f"[Stage 14] Delivered (Stage: {p.current_stage})")

        detail = ParcelService.get_parcel_by_id(db, p.id)
        print(f"[AUDIT] Total Journey Events recorded in PostgreSQL: {len(detail.journey_history)}")
        print("[SUCCESS] All 14 stages executed smoothly!")

    finally:
        db.close()


if __name__ == "__main__":
    run_workflow_test()
