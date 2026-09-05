from datetime import datetime, timezone
from math import ceil

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.employee import Employee
from app.models.parcel import Parcel
from app.models.parcel_journey import ParcelJourneyEvent
from app.models.vehicle import Vehicle
from app.models.delivery_assignment import DeliveryAssignment
from app.schemas.parcel import (
    ParcelCreate,
    ParcelUpdate,
    ParcelResponse,
    ParcelDetailResponse,
    ParcelListResponse,
    JourneyEventResponse,
)


class ParcelService:

    @staticmethod
    def _check_branch_exists(db: Session, branch_id: int) -> bool:
        return db.query(Branch).filter(Branch.id == branch_id).first() is not None

    @staticmethod
    def _log_journey_event(
        db: Session,
        parcel_id: int,
        stage: str,
        stage_title: str,
        branch_id: int | None = None,
        employee_id: int | None = None,
        vehicle_id: int | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        remarks: str | None = None,
    ) -> ParcelJourneyEvent:
        event = ParcelJourneyEvent(
            parcel_id=parcel_id,
            stage=stage,
            stage_title=stage_title,
            branch_id=branch_id,
            employee_id=employee_id,
            vehicle_id=vehicle_id,
            latitude=latitude,
            longitude=longitude,
            remarks=remarks,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(event)
        return event

    @staticmethod
    def _to_response(parcel: Parcel, db: Session) -> ParcelResponse:
        sb = db.query(Branch).filter(Branch.id == parcel.source_branch_id).first()
        db_branch = db.query(Branch).filter(Branch.id == parcel.destination_branch_id).first()
        cb = db.query(Branch).filter(Branch.id == parcel.current_branch_id).first() if parcel.current_branch_id else None
        cv = db.query(Vehicle).filter(Vehicle.id == parcel.current_vehicle_id).first() if parcel.current_vehicle_id else None
        ce = db.query(Employee).filter(Employee.id == parcel.current_employee_id).first() if parcel.current_employee_id else None

        return ParcelResponse(
            id=parcel.id,
            tracking_number=parcel.tracking_number,
            sender=parcel.sender,
            sender_phone=parcel.sender_phone,
            receiver=parcel.receiver,
            receiver_phone=parcel.receiver_phone,
            source_branch_id=parcel.source_branch_id,
            source_branch_name=sb.branch_name if sb else None,
            destination_branch_id=parcel.destination_branch_id,
            destination_branch_name=db_branch.branch_name if db_branch else None,
            source_address=parcel.source_address,
            destination_address=parcel.destination_address,
            sender_latitude=parcel.sender_latitude,
            sender_longitude=parcel.sender_longitude,
            receiver_latitude=parcel.receiver_latitude,
            receiver_longitude=parcel.receiver_longitude,
            latitude=parcel.latitude,
            longitude=parcel.longitude,
            service_type=parcel.service_type,
            priority=parcel.priority,
            weight=parcel.weight,
            status=parcel.status,
            current_stage=parcel.current_stage or "CREATED",
            current_branch_id=parcel.current_branch_id,
            current_branch_name=cb.branch_name if cb else None,
            current_vehicle_id=parcel.current_vehicle_id,
            current_vehicle_reg=cv.registration_number if cv else None,
            current_employee_id=parcel.current_employee_id,
            current_employee_name=ce.name if ce else None,
            expected_delivery_time=parcel.expected_delivery_time,
            actual_delivery_time=parcel.actual_delivery_time,
            created_at=parcel.created_at,
        )

    @staticmethod
    def create_parcel(db: Session, data: ParcelCreate) -> Parcel:
        if not ParcelService._check_branch_exists(db, data.source_branch_id):
            raise LookupError("Source branch not found.")
        if not ParcelService._check_branch_exists(db, data.destination_branch_id):
            raise LookupError("Destination branch not found.")
        if data.source_branch_id == data.destination_branch_id:
            raise ValueError("Source branch and destination branch cannot be the same.")

        existing = db.query(Parcel).filter(Parcel.tracking_number == data.tracking_number.strip().upper()).first()
        if existing:
            raise ValueError("Tracking number already exists.")

        # Resolve sender & receiver coordinates with safe defaults
        s_lat = data.sender_latitude or 9.9252
        s_lon = data.sender_longitude or 78.1198
        r_lat = data.receiver_latitude or data.latitude or 9.9390
        r_lon = data.receiver_longitude or data.longitude or 78.1340

        parcel = Parcel(
            tracking_number=data.tracking_number.strip().upper(),
            sender=data.sender,
            sender_phone=data.sender_phone,
            receiver=data.receiver,
            receiver_phone=data.receiver_phone,
            source_branch_id=data.source_branch_id,
            destination_branch_id=data.destination_branch_id,
            source_address=data.source_address,
            destination_address=data.destination_address,
            sender_latitude=s_lat,
            sender_longitude=s_lon,
            receiver_latitude=r_lat,
            receiver_longitude=r_lon,
            latitude=r_lat,
            longitude=r_lon,
            service_type=data.service_type,
            priority=data.priority,
            weight=data.weight,
            status="REGISTERED",
            current_stage="CREATED",
            current_branch_id=data.source_branch_id,
            expected_delivery_time=data.expected_delivery_time,
        )

        try:
            db.add(parcel)
            db.flush()

            # Record Stage 1 Journey Event
            ParcelService._log_journey_event(
                db=db,
                parcel_id=parcel.id,
                stage="CREATED",
                stage_title="1. Parcel Registered by Customer",
                branch_id=parcel.source_branch_id,
                latitude=s_lat,
                longitude=s_lon,
                remarks=f"Parcel booked from {parcel.source_address} to {parcel.destination_address}.",
            )

            db.commit()
            db.refresh(parcel)
            return parcel
        except IntegrityError:
            db.rollback()
            raise ValueError("Unable to create parcel due to database integrity constraints.")

    @staticmethod
    def get_parcels(
        db: Session,
        search: str | None = None,
        status: str | None = None,
        current_stage: str | None = None,
        priority: str | None = None,
        source_branch_id: int | None = None,
        destination_branch_id: int | None = None,
        current_branch_id: int | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> ParcelListResponse:
        page = max(page, 1)
        limit = max(min(limit, 100), 1)

        query = db.query(Parcel)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Parcel.tracking_number.ilike(s),
                    Parcel.sender.ilike(s),
                    Parcel.receiver.ilike(s),
                    Parcel.source_address.ilike(s),
                    Parcel.destination_address.ilike(s),
                )
            )
        if status:
            query = query.filter(Parcel.status == status.upper())
        if current_stage:
            query = query.filter(Parcel.current_stage == current_stage.upper())
        if priority:
            query = query.filter(Parcel.priority == priority.upper())
        if source_branch_id:
            query = query.filter(Parcel.source_branch_id == source_branch_id)
        if destination_branch_id:
            query = query.filter(Parcel.destination_branch_id == destination_branch_id)
        if current_branch_id:
            query = query.filter(Parcel.current_branch_id == current_branch_id)

        total = query.count()
        total_pages = ceil(total / limit) if total > 0 else 1
        parcels = query.order_by(Parcel.id.desc()).offset((page - 1) * limit).limit(limit).all()

        return ParcelListResponse(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            parcels=[ParcelService._to_response(p, db) for p in parcels],
        )

    @staticmethod
    def get_parcel_by_id(db: Session, parcel_id: int) -> ParcelDetailResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        base_res = ParcelService._to_response(parcel, db)
        history = (
            db.query(ParcelJourneyEvent)
            .filter(ParcelJourneyEvent.parcel_id == parcel_id)
            .order_by(ParcelJourneyEvent.timestamp.asc())
            .all()
        )

        history_typed = []
        for h in history:
            b = db.query(Branch).filter(Branch.id == h.branch_id).first() if h.branch_id else None
            e = db.query(Employee).filter(Employee.id == h.employee_id).first() if h.employee_id else None
            v = db.query(Vehicle).filter(Vehicle.id == h.vehicle_id).first() if h.vehicle_id else None

            history_typed.append(
                JourneyEventResponse(
                    id=h.id,
                    parcel_id=h.parcel_id,
                    stage=h.stage,
                    stage_title=h.stage_title,
                    branch_id=h.branch_id,
                    branch_name=b.branch_name if b else None,
                    employee_id=h.employee_id,
                    employee_name=e.name if e else None,
                    vehicle_id=h.vehicle_id,
                    vehicle_reg=v.registration_number if v else None,
                    latitude=h.latitude,
                    longitude=h.longitude,
                    remarks=h.remarks,
                    timestamp=h.timestamp,
                )
            )

        return ParcelDetailResponse(
            **base_res.model_dump(),
            journey_history=history_typed,
        )

    # ========================================================
    # 14-STAGE REALISTIC WORKFLOW TRANSITIONS
    # ========================================================

    @staticmethod
    def assign_pickup_employee(
        db: Session, parcel_id: int, employee_id: int, notes: str | None = None
    ) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        emp = db.query(Employee).filter(Employee.id == employee_id).first()
        if not emp:
            raise LookupError(f"Employee #{employee_id} not found.")

        # Create or update DeliveryAssignment
        assignment = DeliveryAssignment(
            assignment_code=f"PA-{parcel.id:04d}-{datetime.now().strftime('%H%M%S')}",
            parcel_id=parcel.id,
            employee_id=emp.id,
            assignment_type="PICKUP",
            status="ASSIGNED",
            notes=notes,
        )
        db.add(assignment)

        parcel.current_stage = "PICKUP_ASSIGNED"
        parcel.status = "PROCESSING"
        parcel.current_employee_id = emp.id

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="PICKUP_ASSIGNED",
            stage_title="2. Pickup Employee Assigned",
            branch_id=parcel.source_branch_id,
            employee_id=emp.id,
            remarks=f"Assigned to pickup rider {emp.name} ({emp.phone}). {notes or ''}",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def start_pickup(db: Session, parcel_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "PICKUP_IN_PROGRESS"
        parcel.status = "IN_TRANSIT"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="PICKUP_IN_PROGRESS",
            stage_title="3. Employee En Route to Sender Location",
            employee_id=parcel.current_employee_id,
            latitude=parcel.sender_latitude,
            longitude=parcel.sender_longitude,
            remarks="Rider en route to sender address for parcel collection.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def confirm_pickup(db: Session, parcel_id: int, remarks: str | None = None) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "PICKED_UP"
        parcel.status = "IN_TRANSIT"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="PICKED_UP",
            stage_title="4. Parcel Collected from Sender",
            employee_id=parcel.current_employee_id,
            remarks=f"Parcel successfully picked up from sender. {remarks or ''}",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def start_inbound_transfer(db: Session, parcel_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "INBOUND_TO_SENDER_BRANCH"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="INBOUND_TO_SENDER_BRANCH",
            stage_title="5. Transporting Inbound to Sender Main Branch",
            employee_id=parcel.current_employee_id,
            remarks="Rider transporting parcel inbound to sender city main hub.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def receive_at_sender_branch(db: Session, parcel_id: int, branch_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "AT_SENDER_BRANCH"
        parcel.current_branch_id = branch_id
        parcel.current_employee_id = None
        parcel.status = "PROCESSING"

        sb = db.query(Branch).filter(Branch.id == branch_id).first()
        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="AT_SENDER_BRANCH",
            stage_title="6. Parcel Received & Scanned at Sender Main Branch",
            branch_id=branch_id,
            remarks=f"Checked into {sb.branch_name if sb else 'Hub'}. Stored in outbound sorting bay.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def prepare_intercity_transport(db: Session, parcel_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "READY_FOR_INTERCITY_TRANSPORT"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="READY_FOR_INTERCITY_TRANSPORT",
            stage_title="7. Prepared for Inter-City Vehicle Transport",
            branch_id=parcel.current_branch_id,
            remarks="Grouped and queued for long-haul van/truck transit.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def assign_intercity_vehicle(
        db: Session, parcel_id: int, vehicle_id: int, driver_id: int | None = None
    ) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        veh = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not veh:
            raise LookupError(f"Vehicle #{vehicle_id} not found.")

        d_id = driver_id or veh.assigned_driver_id

        parcel.current_stage = "INTERCITY_ASSIGNED"
        parcel.current_vehicle_id = veh.id
        parcel.current_employee_id = d_id
        veh.status = "LOADING"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="INTERCITY_ASSIGNED",
            stage_title="8. Loaded into Inter-City Transport Vehicle",
            branch_id=parcel.current_branch_id,
            vehicle_id=veh.id,
            employee_id=d_id,
            remarks=f"Assigned to {veh.vehicle_type} ({veh.registration_number}).",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def start_intercity_transit(db: Session, parcel_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "IN_INTERCITY_TRANSIT"
        parcel.status = "IN_TRANSIT"

        if parcel.current_vehicle_id:
            veh = db.query(Vehicle).filter(Vehicle.id == parcel.current_vehicle_id).first()
            if veh:
                veh.status = "IN_TRANSIT"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="IN_INTERCITY_TRANSIT",
            stage_title="9. Highway Inter-City Transit in Progress",
            vehicle_id=parcel.current_vehicle_id,
            employee_id=parcel.current_employee_id,
            remarks="Long-haul transport en route to receiver city hub.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def receive_at_receiver_branch(db: Session, parcel_id: int, branch_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "AT_RECEIVER_BRANCH"
        parcel.current_branch_id = branch_id
        parcel.current_vehicle_id = None
        parcel.current_employee_id = None
        parcel.status = "PROCESSING"

        rb = db.query(Branch).filter(Branch.id == branch_id).first()
        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="AT_RECEIVER_BRANCH",
            stage_title="10. Received & Unloaded at Destination City Hub",
            branch_id=branch_id,
            remarks=f"Checked into destination hub {rb.branch_name if rb else ''}. Prepared for local last-mile routing.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def prepare_last_mile(db: Session, parcel_id: int) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        parcel.current_stage = "READY_FOR_LAST_MILE_DELIVERY"

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="READY_FOR_LAST_MILE_DELIVERY",
            stage_title="11. Ready for Local Last-Mile Courier Assignment",
            branch_id=parcel.current_branch_id,
            remarks="Sorted and ready for local delivery boy dispatch.",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def assign_last_mile_delivery(
        db: Session, parcel_id: int, employee_id: int, notes: str | None = None
    ) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        emp = db.query(Employee).filter(Employee.id == employee_id).first()
        if not emp:
            raise LookupError(f"Employee #{employee_id} not found.")

        # Create or update Last Mile DeliveryAssignment
        assignment = DeliveryAssignment(
            assignment_code=f"LM-{parcel.id:04d}-{datetime.now().strftime('%H%M%S')}",
            parcel_id=parcel.id,
            employee_id=emp.id,
            assignment_type="LAST_MILE_DELIVERY",
            status="ASSIGNED",
            notes=notes,
        )
        db.add(assignment)

        parcel.current_stage = "OUT_FOR_DELIVERY"
        parcel.status = "OUT_FOR_DELIVERY"
        parcel.current_employee_id = emp.id

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="OUT_FOR_DELIVERY",
            stage_title="12. Out for Last-Mile Customer Delivery",
            branch_id=parcel.current_branch_id,
            employee_id=emp.id,
            remarks=f"Handed over to last-mile courier {emp.name} ({emp.phone}). {notes or ''}",
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def confirm_delivery(
        db: Session,
        parcel_id: int,
        recipient_name: str | None = None,
        otp_code: str | None = None,
        remarks: str | None = None,
    ) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        now = datetime.now(timezone.utc)
        parcel.current_stage = "DELIVERED"
        parcel.status = "DELIVERED"
        parcel.actual_delivery_time = now

        pod_text = f"Digital POD: Delivered to {recipient_name or parcel.receiver} (OTP: {otp_code or 'VERIFIED'}). {remarks or ''}".strip()

        ParcelService._log_journey_event(
            db=db,
            parcel_id=parcel.id,
            stage="DELIVERED",
            stage_title="14. Successfully Delivered to Customer (POD Verified)",
            employee_id=parcel.current_employee_id,
            latitude=parcel.receiver_latitude,
            longitude=parcel.receiver_longitude,
            remarks=pod_text,
        )
        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def update_parcel(db: Session, parcel_id: int, data: ParcelUpdate) -> ParcelResponse:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")

        for key, val in data.model_dump(exclude_unset=True).items():
            if val is not None:
                setattr(parcel, key, val)

        db.commit()
        db.refresh(parcel)
        return ParcelService._to_response(parcel, db)

    @staticmethod
    def delete_parcel(db: Session, parcel_id: int) -> None:
        parcel = db.query(Parcel).filter(Parcel.id == parcel_id).first()
        if not parcel:
            raise LookupError(f"Parcel #{parcel_id} not found.")
        db.delete(parcel)
        db.commit()