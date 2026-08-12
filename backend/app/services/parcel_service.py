from datetime import datetime, timezone
from math import ceil

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.parcel import Parcel
from app.schemas.parcel import (
    ParcelCreate,
    ParcelUpdate,
)


class ParcelService:

    # ========================================================
    # CHECK BRANCH
    # ========================================================

    @staticmethod
    def _check_branch_exists(
        db: Session,
        branch_id: int,
    ) -> bool:

        from app.models.branch import Branch

        branch = (
            db.query(Branch)
            .filter(
                Branch.id == branch_id
            )
            .first()
        )

        return branch is not None

    # ========================================================
    # CREATE
    # ========================================================

    @staticmethod
    def create_parcel(
        db: Session,
        parcel_data: ParcelCreate,
    ) -> Parcel:

        # ----------------------------------------------------
        # Check source branch
        # ----------------------------------------------------

        if not ParcelService._check_branch_exists(
            db,
            parcel_data.source_branch_id,
        ):
            raise LookupError(
                "Source branch not found."
            )

        # ----------------------------------------------------
        # Check destination branch
        # ----------------------------------------------------

        if not ParcelService._check_branch_exists(
            db,
            parcel_data.destination_branch_id,
        ):
            raise LookupError(
                "Destination branch not found."
            )

        # ----------------------------------------------------
        # Prevent same branch
        # ----------------------------------------------------

        if (
            parcel_data.source_branch_id
            == parcel_data.destination_branch_id
        ):
            raise ValueError(
                "Source branch and destination branch "
                "cannot be the same."
            )

        # ----------------------------------------------------
        # Check tracking number
        # ----------------------------------------------------

        existing = (
            db.query(Parcel)
            .filter(
                Parcel.tracking_number
                == parcel_data.tracking_number
            )
            .first()
        )

        if existing:
            raise ValueError(
                "Tracking number already exists."
            )

        # ----------------------------------------------------
        # Create parcel
        # ----------------------------------------------------

        parcel = Parcel(
            tracking_number=parcel_data.tracking_number,
            sender=parcel_data.sender,
            receiver=parcel_data.receiver,
            source_branch_id=parcel_data.source_branch_id,
            destination_branch_id=parcel_data.destination_branch_id,
            source_address=parcel_data.source_address,
            destination_address=parcel_data.destination_address,
            latitude=parcel_data.latitude,
            longitude=parcel_data.longitude,
            service_type=parcel_data.service_type,
            priority=parcel_data.priority,
            weight=parcel_data.weight,
            status=parcel_data.status,
            expected_delivery_time=parcel_data.expected_delivery_time,
        )

        try:
            db.add(parcel)

            db.commit()

            db.refresh(parcel)

            return parcel

        except IntegrityError:
            db.rollback()

            raise ValueError(
                "Unable to create parcel. "
                "Tracking number may already exist "
                "or a referenced branch may be invalid."
            )

    # ========================================================
    # GET ALL
    # ========================================================

    @staticmethod
    def get_parcels(
        db: Session,
        search: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        source_branch_id: int | None = None,
        destination_branch_id: int | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> tuple[list[Parcel], int]:

        query = db.query(Parcel)

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        if search:
            search_value = (
                f"%{search.strip()}%"
            )

            query = query.filter(
                or_(
                    Parcel.tracking_number.ilike(
                        search_value
                    ),
                    Parcel.sender.ilike(
                        search_value
                    ),
                    Parcel.receiver.ilike(
                        search_value
                    ),
                )
            )

        # ----------------------------------------------------
        # Status
        # ----------------------------------------------------

        if status:
            query = query.filter(
                Parcel.status
                == status.upper()
            )

        # ----------------------------------------------------
        # Priority
        # ----------------------------------------------------

        if priority:
            query = query.filter(
                Parcel.priority
                == priority.upper()
            )

        # ----------------------------------------------------
        # Source branch
        # ----------------------------------------------------

        if source_branch_id:
            query = query.filter(
                Parcel.source_branch_id
                == source_branch_id
            )

        # ----------------------------------------------------
        # Destination branch
        # ----------------------------------------------------

        if destination_branch_id:
            query = query.filter(
                Parcel.destination_branch_id
                == destination_branch_id
            )

        # ----------------------------------------------------
        # Total
        # ----------------------------------------------------

        total = query.count()

        # ----------------------------------------------------
        # Pagination
        # ----------------------------------------------------

        offset = (
            page - 1
        ) * limit

        parcels = (
            query
            .order_by(
                Parcel.created_at.desc()
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        return parcels, total

    # ========================================================
    # GET BY ID
    # ========================================================

    @staticmethod
    def get_parcel_by_id(
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
    # GET BY TRACKING NUMBER
    # ========================================================

    @staticmethod
    def get_by_tracking_number(
        db: Session,
        tracking_number: str,
    ) -> Parcel:

        parcel = (
            db.query(Parcel)
            .filter(
                Parcel.tracking_number
                == tracking_number
            )
            .first()
        )

        if not parcel:
            raise LookupError(
                "Parcel not found."
            )

        return parcel

    # ========================================================
    # UPDATE
    # ========================================================

    @staticmethod
    def update_parcel(
        db: Session,
        parcel_id: int,
        parcel_data: ParcelUpdate,
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

        update_data = (
            parcel_data.model_dump(
                exclude_unset=True
            )
        )

        # ----------------------------------------------------
        # Branch validation
        # ----------------------------------------------------

        source_branch_id = update_data.get(
            "source_branch_id",
            parcel.source_branch_id,
        )

        destination_branch_id = update_data.get(
            "destination_branch_id",
            parcel.destination_branch_id,
        )

        if (
            source_branch_id
            == destination_branch_id
        ):
            raise ValueError(
                "Source branch and destination branch "
                "cannot be the same."
            )

        if (
            "source_branch_id"
            in update_data
        ):
            if not ParcelService._check_branch_exists(
                db,
                source_branch_id,
            ):
                raise LookupError(
                    "Source branch not found."
                )

        if (
            "destination_branch_id"
            in update_data
        ):
            if not ParcelService._check_branch_exists(
                db,
                destination_branch_id,
            ):
                raise LookupError(
                    "Destination branch not found."
                )

        # ----------------------------------------------------
        # Update fields
        # ----------------------------------------------------

        for field, value in update_data.items():
            setattr(
                parcel,
                field,
                value,
            )

        try:
            db.commit()

            db.refresh(parcel)

            return parcel

        except IntegrityError:
            db.rollback()

            raise ValueError(
                "Unable to update parcel."
            )

    # ========================================================
    # UPDATE STATUS
    # ========================================================

    @staticmethod
    def update_status(
        db: Session,
        parcel_id: int,
        status: str,
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

        status = status.upper()

        allowed_statuses = {
            "REGISTERED",
            "PROCESSING",
            "DISPATCHED",
            "IN_TRANSIT",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "DELAYED",
            "CANCELLED",
            "RETURNED",
        }

        if status not in allowed_statuses:
            raise ValueError(
                "Invalid parcel status."
            )

        parcel.status = status

        # ----------------------------------------------------
        # Delivery timestamp
        # ----------------------------------------------------

        if status == "DELIVERED":
            parcel.actual_delivery_time = (
                datetime.now(timezone.utc)
            )

        else:
            parcel.actual_delivery_time = None

        try:
            db.commit()

            db.refresh(parcel)

            return parcel

        except Exception:
            db.rollback()

            raise

    # ========================================================
    # CANCEL PARCEL / SOFT DELETE
    # ========================================================

    @staticmethod
    def cancel_parcel(
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

        if parcel.status == "DELIVERED":
            raise ValueError(
                "A delivered parcel cannot be cancelled."
            )

        parcel.status = "CANCELLED"

        try:
            db.commit()

            db.refresh(parcel)

            return parcel

        except Exception:
            db.rollback()

            raise