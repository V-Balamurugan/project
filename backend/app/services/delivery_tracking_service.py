from datetime import datetime, timezone
import math

from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.delivery_assignment import (
    DeliveryAssignment,
)
from app.models.delivery_tracking import (
    DeliveryTracking,
)
from app.models.employee import Employee
from app.models.parcel import Parcel
from app.schemas.delivery_tracking import (
    DeliveryTrackingCreate,
    LocationUpdateCreate,
)
from app.services.ors_client import ORSClient


class DeliveryTrackingService:

    ALLOWED_TRANSITIONS = {
        "ASSIGNED": {
            "PICKED_UP",
            "CANCELLED",
        },
        "PICKED_UP": {
            "IN_TRANSIT",
            "CANCELLED",
        },
        "IN_TRANSIT": {
            "DELIVERED",
            "CANCELLED",
        },
    }

    FINAL_STATUSES = {
        "DELIVERED",
        "CANCELLED",
    }

    # ========================================================
    # PARCEL
    # ========================================================

    @staticmethod
    def get_parcel(
        db: Session,
        parcel_id: int,
    ) -> Parcel:
        parcel = (
            db.query(Parcel)
            .filter(
                Parcel.id == parcel_id
            )
            .first()
        )

        if not parcel:
            raise LookupError(
                "Parcel not found."
            )

        return parcel

    # ========================================================
    # ASSIGNMENT
    # ========================================================

    @staticmethod
    def get_assignment(
        db: Session,
        assignment_id: int,
    ) -> DeliveryAssignment:
        assignment = (
            db.query(DeliveryAssignment)
            .filter(
                DeliveryAssignment.id
                == assignment_id
            )
            .first()
        )

        if not assignment:
            raise LookupError(
                "Delivery assignment not found."
            )

        return assignment

    # ========================================================
    # EMPLOYEE
    # ========================================================

    @staticmethod
    def get_employee(
        db: Session,
        employee_id: int,
    ) -> Employee:
        employee = (
            db.query(Employee)
            .filter(
                Employee.id == employee_id
            )
            .first()
        )

        if not employee:
            raise LookupError(
                "Employee not found."
            )

        return employee

    # ========================================================
    # RECORD MOBILE GPS LOCATION
    # ========================================================

    @staticmethod
    def record_location(
        db: Session,
        data: LocationUpdateCreate,
        employee_id: int | None = None,
    ) -> DeliveryTracking:
        assignment = DeliveryTrackingService.get_assignment(
            db, data.assignment_id
        )

        if employee_id is not None and assignment.employee_id != employee_id:
            raise ValueError(
                "Authenticated employee is not assigned to this delivery."
            )

        parcel = DeliveryTrackingService.get_parcel(
            db, assignment.parcel_id
        )

        current_status = assignment.status.upper()

        if current_status in DeliveryTrackingService.FINAL_STATUSES:
            raise ValueError(
                f"Assignment is already {current_status}."
            )

        now = data.timestamp or datetime.now(timezone.utc)

        tracking = DeliveryTracking(
            parcel_id=parcel.id,
            assignment_id=assignment.id,
            employee_id=assignment.employee_id,
            status=current_status,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            speed=data.speed,
            heading=data.heading,
            location_name=data.location_name,
            remarks=data.remarks,
            timestamp=now,
            created_at=datetime.now(timezone.utc),
        )

        db.add(tracking)
        db.commit()
        db.refresh(tracking)
        return tracking

    # ========================================================
    # CREATE TRACKING EVENT
    # ========================================================

    @staticmethod
    def create_tracking_event(
        db: Session,
        data: DeliveryTrackingCreate,
    ) -> DeliveryTracking:
        parcel = (
            DeliveryTrackingService
            .get_parcel(
                db,
                data.parcel_id,
            )
        )

        assignment = (
            DeliveryTrackingService
            .get_assignment(
                db,
                data.assignment_id,
            )
        )

        employee = (
            DeliveryTrackingService
            .get_employee(
                db,
                data.employee_id,
            )
        )

        if assignment.parcel_id != parcel.id:
            raise ValueError(
                "Assignment does not belong to this parcel."
            )

        if assignment.employee_id != employee.id:
            raise ValueError(
                "Employee is not assigned to this delivery."
            )

        new_status = data.status.upper()
        current_status = assignment.status.upper()

        if current_status in DeliveryTrackingService.FINAL_STATUSES:
            raise ValueError(
                f"Assignment is already {current_status}."
            )

        if new_status != current_status:
            allowed = (
                DeliveryTrackingService
                .ALLOWED_TRANSITIONS
                .get(
                    current_status,
                    set(),
                )
            )

            if new_status not in allowed:
                raise ValueError(
                    f"Invalid status transition: {current_status} → {new_status}"
                )

        now = datetime.now(timezone.utc)

        tracking = DeliveryTracking(
            parcel_id=parcel.id,
            assignment_id=assignment.id,
            employee_id=employee.id,
            status=new_status,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            speed=data.speed,
            heading=data.heading,
            location_name=data.location_name,
            remarks=data.remarks,
            timestamp=now,
            created_at=now,
        )

        assignment.status = new_status

        if new_status == "PICKED_UP":
            assignment.picked_up_at = now
        elif new_status == "DELIVERED":
            assignment.delivered_at = now

        if new_status == "DELIVERED":
            parcel.actual_delivery_time = now

        db.add(tracking)
        db.commit()
        db.refresh(tracking)
        return tracking

    # ========================================================
    # GET PARCEL HISTORY
    # ========================================================

    @staticmethod
    def get_parcel_tracking(
        db: Session,
        parcel_id: int,
    ) -> list[DeliveryTracking]:
        DeliveryTrackingService.get_parcel(
            db,
            parcel_id,
        )

        return (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryTracking.timestamp.asc()
            )
            .all()
        )

    # ========================================================
    # GET LATEST
    # ========================================================

    @staticmethod
    def get_latest_tracking(
        db: Session,
        parcel_id: int,
    ) -> DeliveryTracking:
        DeliveryTrackingService.get_parcel(
            db,
            parcel_id,
        )

        tracking = (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryTracking.timestamp.desc()
            )
            .first()
        )

        if not tracking:
            raise LookupError(
                "No tracking event found."
            )

        return tracking

    # ========================================================
    # GET ASSIGNMENT HISTORY
    # ========================================================

    @staticmethod
    def get_assignment_tracking(
        db: Session,
        assignment_id: int,
    ) -> list[DeliveryTracking]:
        DeliveryTrackingService.get_assignment(
            db,
            assignment_id,
        )

        return (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.assignment_id
                == assignment_id
            )
            .order_by(
                DeliveryTracking.timestamp.asc()
            )
            .all()
        )

    # ========================================================
    # ORS ROAD ROUTE
    # ========================================================

    @staticmethod
    async def get_road_route(
        db: Session,
        parcel_id: int,
    ) -> dict:
        parcel = DeliveryTrackingService.get_parcel(db, parcel_id)

        latest = (
            db.query(DeliveryTracking)
            .filter(DeliveryTracking.parcel_id == parcel_id)
            .order_by(DeliveryTracking.timestamp.desc())
            .first()
        )

        assignment = (
            db.query(DeliveryAssignment)
            .filter(DeliveryAssignment.parcel_id == parcel_id)
            .order_by(DeliveryAssignment.created_at.desc())
            .first()
        )

        assignment_id = assignment.id if assignment else (latest.assignment_id if latest else 0)

        # Origin / Start location
        start_latitude = None
        start_longitude = None

        if latest and latest.latitude is not None and latest.longitude is not None:
            start_latitude = latest.latitude
            start_longitude = latest.longitude
        else:
            if parcel.source_branch_id:
                source_branch = db.query(Branch).filter(Branch.id == parcel.source_branch_id).first()
                if source_branch:
                    start_latitude = source_branch.latitude
                    start_longitude = source_branch.longitude

            if start_latitude is None or start_longitude is None:
                start_latitude = parcel.latitude or 9.9252
                start_longitude = parcel.longitude or 78.1198

        # Destination location
        end_latitude = parcel.latitude
        end_longitude = parcel.longitude

        if end_latitude is None or end_longitude is None:
            if parcel.destination_branch_id:
                dest_branch = db.query(Branch).filter(Branch.id == parcel.destination_branch_id).first()
                if dest_branch:
                    end_latitude = dest_branch.latitude
                    end_longitude = dest_branch.longitude

        if end_latitude is None or end_longitude is None:
            end_latitude = 9.9252
            end_longitude = 78.1198

        coordinates = []
        distance_meters = 0.0
        duration_seconds = 0.0

        try:
            client = ORSClient()
            result = await client.get_driving_route(
                start_longitude=start_longitude,
                start_latitude=start_latitude,
                end_longitude=end_longitude,
                end_latitude=end_latitude,
            )

            features = result.get("features", [])
            if features:
                feature = features[0]
                geometry = feature.get("geometry", {})
                coordinates = geometry.get("coordinates", [])
                properties = feature.get("properties", {})
                summary = properties.get("summary", {})
                distance_meters = float(summary.get("distance", 0))
                duration_seconds = float(summary.get("duration", 0))
        except Exception:
            coordinates = []

        if not coordinates or len(coordinates) < 2:
            lat1, lon1 = math.radians(start_latitude), math.radians(start_longitude)
            lat2, lon2 = math.radians(end_latitude), math.radians(end_longitude)
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance_meters = round(6371000 * c * 1.3, 1)
            duration_seconds = round(distance_meters / 9.72)
            coordinates = [
                [start_longitude, start_latitude],
                [end_longitude, end_latitude],
            ]

        return {
            "parcel_id": parcel.id,
            "assignment_id": assignment_id,
            "current_latitude": start_latitude,
            "current_longitude": start_longitude,
            "destination_latitude": end_latitude,
            "destination_longitude": end_longitude,
            "distance_meters": distance_meters,
            "duration_seconds": duration_seconds,
            "coordinates": coordinates,
        }