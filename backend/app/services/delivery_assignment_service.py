from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.delivery_assignment import DeliveryAssignment
from app.models.employee import Employee
from app.models.parcel import Parcel
from app.schemas.delivery_assignment import (
    DeliveryAssignmentCreate,
    DeliveryAssignmentUpdate,
)


class DeliveryAssignmentService:

    # ========================================================
    # GENERATE ASSIGNMENT CODE
    # ========================================================

    @staticmethod
    def generate_assignment_code(
        db: Session,
    ) -> str:

        last_assignment = (
            db.query(DeliveryAssignment)
            .order_by(DeliveryAssignment.id.desc())
            .first()
        )

        if not last_assignment:
            next_number = 1
        else:
            next_number = last_assignment.id + 1

        return f"DA{next_number:06d}"

    # ========================================================
    # CHECK EMPLOYEE
    # ========================================================

    @staticmethod
    def _check_employee(
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

        if employee.status != "ACTIVE":
            raise ValueError(
                "Only ACTIVE employees can be assigned "
                "to deliveries."
            )

        return employee

    # ========================================================
    # CHECK PARCEL
    # ========================================================

    @staticmethod
    def _check_parcel(
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

        if parcel.status in {
            "DELIVERED",
            "CANCELLED",
        }:
            raise ValueError(
                f"Cannot assign parcel with status "
                f"'{parcel.status}'."
            )

        return parcel

    # ========================================================
    # CHECK ACTIVE ASSIGNMENT
    # ========================================================

    @staticmethod
    def _check_active_assignment(
        db: Session,
        parcel_id: int,
    ) -> DeliveryAssignment | None:

        active_statuses = {
            "ASSIGNED",
            "PICKED_UP",
            "IN_TRANSIT",
        }

        assignment = (
            db.query(DeliveryAssignment)
            .filter(
                DeliveryAssignment.parcel_id == parcel_id,
                DeliveryAssignment.status.in_(
                    active_statuses
                ),
            )
            .first()
        )

        return assignment

    # ========================================================
    # CREATE
    # ========================================================

    @staticmethod
    def create_assignment(
        db: Session,
        assignment_data: DeliveryAssignmentCreate,
    ) -> DeliveryAssignment:

        # ----------------------------------------------------
        # Check parcel
        # ----------------------------------------------------

        DeliveryAssignmentService._check_parcel(
            db,
            assignment_data.parcel_id,
        )

        # ----------------------------------------------------
        # Check employee
        # ----------------------------------------------------

        DeliveryAssignmentService._check_employee(
            db,
            assignment_data.employee_id,
        )

        # ----------------------------------------------------
        # Prevent duplicate active assignment
        # ----------------------------------------------------

        active_assignment = (
            DeliveryAssignmentService
            ._check_active_assignment(
                db,
                assignment_data.parcel_id,
            )
        )

        if active_assignment:
            raise ValueError(
                "This parcel already has an active "
                "delivery assignment."
            )

        # ----------------------------------------------------
        # Generate assignment code
        # ----------------------------------------------------

        assignment_code = (
            DeliveryAssignmentService
            .generate_assignment_code(db)
        )

        # ----------------------------------------------------
        # Create assignment
        # ----------------------------------------------------

        assignment = DeliveryAssignment(
            assignment_code=assignment_code,
            parcel_id=assignment_data.parcel_id,
            employee_id=assignment_data.employee_id,
            status="ASSIGNED",
            notes=assignment_data.notes,
        )

        try:

            db.add(assignment)

            db.commit()

            db.refresh(assignment)

            return assignment

        except IntegrityError:

            db.rollback()

            raise ValueError(
                "Unable to create delivery assignment. "
                "Parcel or employee may be invalid, "
                "or assignment code may already exist."
            )

    # ========================================================
    # GET ALL
    # ========================================================

    @staticmethod
    def get_assignments(
        db: Session,
        search: str | None = None,
        status: str | None = None,
        employee_id: int | None = None,
        parcel_id: int | None = None,
        page: int = 1,
        limit: int = 10,
    ) -> tuple[list[DeliveryAssignment], int]:

        query = db.query(
            DeliveryAssignment
        )

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        if search:

            search_value = (
                f"%{search.strip()}%"
            )

            query = query.filter(
                DeliveryAssignment.assignment_code.ilike(
                    search_value
                )
            )

        # ----------------------------------------------------
        # Status
        # ----------------------------------------------------

        if status:

            query = query.filter(
                DeliveryAssignment.status
                == status.upper()
            )

        # ----------------------------------------------------
        # Employee
        # ----------------------------------------------------

        if employee_id:

            query = query.filter(
                DeliveryAssignment.employee_id
                == employee_id
            )

        # ----------------------------------------------------
        # Parcel
        # ----------------------------------------------------

        if parcel_id:

            query = query.filter(
                DeliveryAssignment.parcel_id
                == parcel_id
            )

        # ----------------------------------------------------
        # Total
        # ----------------------------------------------------

        total = query.count()

        # ----------------------------------------------------
        # Pagination
        # ----------------------------------------------------

        if page < 1:
            page = 1

        if limit < 1:
            limit = 10

        offset = (
            page - 1
        ) * limit

        assignments = (
            query
            .order_by(
                DeliveryAssignment.created_at.desc()
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        return assignments, total

    # ========================================================
    # GET BY ID
    # ========================================================

    @staticmethod
    def get_assignment_by_id(
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
    # GET BY EMPLOYEE
    # ========================================================

    @staticmethod
    def get_by_employee(
        db: Session,
        employee_id: int,
    ) -> list[DeliveryAssignment]:

        # Check employee exists
        DeliveryAssignmentService._check_employee(
            db,
            employee_id,
        )

        return (
            db.query(DeliveryAssignment)
            .filter(
                DeliveryAssignment.employee_id
                == employee_id
            )
            .order_by(
                DeliveryAssignment.created_at.desc()
            )
            .all()
        )

    # ========================================================
    # GET BY PARCEL
    # ========================================================

    @staticmethod
    def get_by_parcel(
        db: Session,
        parcel_id: int,
    ) -> list[DeliveryAssignment]:

        # Check parcel exists
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

        return (
            db.query(DeliveryAssignment)
            .filter(
                DeliveryAssignment.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryAssignment.created_at.desc()
            )
            .all()
        )

    # ========================================================
    # UPDATE / REASSIGN
    # ========================================================

    @staticmethod
    def update_assignment(
        db: Session,
        assignment_id: int,
        assignment_data: DeliveryAssignmentUpdate,
    ) -> DeliveryAssignment:

        assignment = (
            DeliveryAssignmentService
            .get_assignment_by_id(
                db,
                assignment_id,
            )
        )

        update_data = (
            assignment_data.model_dump(
                exclude_unset=True
            )
        )

        # ----------------------------------------------------
        # Employee reassignment
        # ----------------------------------------------------

        if "employee_id" in update_data:

            employee_id = update_data[
                "employee_id"
            ]

            if employee_id is not None:

                DeliveryAssignmentService._check_employee(
                    db,
                    employee_id,
                )

                if assignment.status in {
                    "DELIVERED",
                    "CANCELLED",
                }:
                    raise ValueError(
                        "Delivered or cancelled assignments "
                        "cannot be reassigned."
                    )

                assignment.employee_id = employee_id

        # ----------------------------------------------------
        # Notes
        # ----------------------------------------------------

        if "notes" in update_data:

            assignment.notes = (
                update_data["notes"]
            )

        try:

            db.commit()

            db.refresh(assignment)

            return assignment

        except IntegrityError:

            db.rollback()

            raise ValueError(
                "Unable to update delivery assignment."
            )

    # ========================================================
    # UPDATE STATUS
    # ========================================================

    @staticmethod
    def update_status(
        db: Session,
        assignment_id: int,
        status: str,
    ) -> DeliveryAssignment:

        assignment = (
            DeliveryAssignmentService
            .get_assignment_by_id(
                db,
                assignment_id,
            )
        )

        status = status.upper()

        allowed_statuses = {
            "ASSIGNED",
            "PICKED_UP",
            "IN_TRANSIT",
            "DELIVERED",
            "CANCELLED",
        }

        if status not in allowed_statuses:

            raise ValueError(
                "Invalid assignment status."
            )

        # ----------------------------------------------------
        # Final states
        # ----------------------------------------------------

        if assignment.status in {
            "DELIVERED",
            "CANCELLED",
        }:

            raise ValueError(
                f"Assignment is already "
                f"'{assignment.status}' and cannot be changed."
            )

        # ----------------------------------------------------
        # Valid transitions
        # ----------------------------------------------------

        allowed_transitions = {

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

        current_status = assignment.status

        if status != current_status:

            allowed = allowed_transitions.get(
                current_status,
                set(),
            )

            if status not in allowed:

                raise ValueError(
                    f"Invalid status transition: "
                    f"{current_status} → {status}"
                )

        # ----------------------------------------------------
        # Pickup timestamp
        # ----------------------------------------------------

        if status == "PICKED_UP":

            assignment.picked_up_at = (
                datetime.now(timezone.utc)
            )

        # ----------------------------------------------------
        # Delivery timestamp
        # ----------------------------------------------------

        if status == "DELIVERED":

            assignment.delivered_at = (
                datetime.now(timezone.utc)
            )

        assignment.status = status

        try:

            db.commit()

            db.refresh(assignment)

            return assignment

        except Exception:

            db.rollback()

            raise

    # ========================================================
    # CANCEL ASSIGNMENT
    # ========================================================

    @staticmethod
    def cancel_assignment(
        db: Session,
        assignment_id: int,
    ) -> DeliveryAssignment:

        assignment = (
            DeliveryAssignmentService
            .get_assignment_by_id(
                db,
                assignment_id,
            )
        )

        if assignment.status == "DELIVERED":

            raise ValueError(
                "A delivered assignment cannot be cancelled."
            )

        if assignment.status == "CANCELLED":

            raise ValueError(
                "Assignment is already cancelled."
            )

        assignment.status = "CANCELLED"

        try:

            db.commit()

            db.refresh(assignment)

            return assignment

        except Exception:

            db.rollback()

            raise