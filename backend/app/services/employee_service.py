from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeService:

    # ========================================================
    # CREATE EMPLOYEE
    # ========================================================

    @staticmethod
    def create_employee(
        db: Session,
        employee_data: EmployeeCreate
    ) -> Employee:

        # ----------------------------------------------------
        # Check employee code
        # ----------------------------------------------------

        existing_employee = (
            db.query(Employee)
            .filter(
                Employee.employee_code
                == employee_data.employee_code
            )
            .first()
        )

        if existing_employee:
            raise ValueError(
                "Employee code already exists"
            )

        # ----------------------------------------------------
        # Check email
        # ----------------------------------------------------

        existing_email = (
            db.query(Employee)
            .filter(
                Employee.email
                == employee_data.email
            )
            .first()
        )

        if existing_email:
            raise ValueError(
                "Employee email already exists"
            )

        # ----------------------------------------------------
        # Check branch
        # ----------------------------------------------------

        branch = (
            db.query(Branch)
            .filter(
                Branch.id == employee_data.branch_id
            )
            .first()
        )

        if not branch:
            raise LookupError(
                "Branch not found"
            )

        # ----------------------------------------------------
        # Validate status
        # ----------------------------------------------------

        if employee_data.status not in [
            "ACTIVE",
            "INACTIVE"
        ]:
            raise ValueError(
                "Status must be ACTIVE or INACTIVE"
            )

        # ----------------------------------------------------
        # Create employee
        # ----------------------------------------------------

        employee = Employee(
            employee_code=employee_data.employee_code,
            name=employee_data.name,
            phone=employee_data.phone,
            email=str(employee_data.email),
            branch_id=employee_data.branch_id,
            vehicle_type=employee_data.vehicle_type,
            status=employee_data.status,
            current_latitude=employee_data.current_latitude,
            current_longitude=employee_data.current_longitude,
            total_deliveries=0,
            completed_deliveries=0,
            delayed_deliveries=0,
            average_delivery_time=0.0,
            performance_score=0.0
        )

        db.add(employee)

        try:
            db.commit()
            db.refresh(employee)

        except Exception:
            db.rollback()
            raise

        return employee

    # ========================================================
    # GET EMPLOYEES
    # ========================================================

    @staticmethod
    def get_employees(
        db: Session,
        search: str | None = None,
        status: str | None = None,
        branch_id: int | None = None,
        page: int = 1,
        limit: int = 10
    ):

        query = db.query(Employee)

        # ----------------------------------------------------
        # Search
        # ----------------------------------------------------

        if search:
            search_value = f"%{search.strip()}%"

            query = query.filter(
                or_(
                    Employee.employee_code.ilike(
                        search_value
                    ),
                    Employee.name.ilike(
                        search_value
                    ),
                    Employee.email.ilike(
                        search_value
                    ),
                    Employee.phone.ilike(
                        search_value
                    )
                )
            )

        # ----------------------------------------------------
        # Status filter
        # ----------------------------------------------------

        if status:

            status = status.upper()

            if status not in [
                "ACTIVE",
                "INACTIVE"
            ]:
                raise ValueError(
                    "Status must be ACTIVE or INACTIVE"
                )

            query = query.filter(
                Employee.status == status
            )

        # ----------------------------------------------------
        # Branch filter
        # ----------------------------------------------------

        if branch_id:

            query = query.filter(
                Employee.branch_id == branch_id
            )

        # ----------------------------------------------------
        # Total
        # ----------------------------------------------------

        total = query.with_entities(
            func.count(Employee.id)
        ).scalar()

        # ----------------------------------------------------
        # Pagination
        # ----------------------------------------------------

        offset = (page - 1) * limit

        employees = (
            query
            .order_by(Employee.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "total": total or 0,
            "page": page,
            "limit": limit,
            "employees": employees
        }

    # ========================================================
    # GET EMPLOYEE BY ID
    # ========================================================

    @staticmethod
    def get_employee_by_id(
        db: Session,
        employee_id: int
    ) -> Employee | None:

        return (
            db.query(Employee)
            .filter(
                Employee.id == employee_id
            )
            .first()
        )

    # ========================================================
    # UPDATE EMPLOYEE
    # ========================================================

    @staticmethod
    def update_employee(
        db: Session,
        employee_id: int,
        employee_data: EmployeeUpdate
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
                "Employee not found"
            )

        data = employee_data.model_dump(
            exclude_unset=True
        )

        # ----------------------------------------------------
        # Email uniqueness
        # ----------------------------------------------------

        if "email" in data:

            existing_email = (
                db.query(Employee)
                .filter(
                    Employee.email == str(data["email"]),
                    Employee.id != employee_id
                )
                .first()
            )

            if existing_email:
                raise ValueError(
                    "Employee email already exists"
                )

            data["email"] = str(data["email"])

        # ----------------------------------------------------
        # Branch validation
        # ----------------------------------------------------

        if "branch_id" in data:

            branch = (
                db.query(Branch)
                .filter(
                    Branch.id == data["branch_id"]
                )
                .first()
            )

            if not branch:
                raise LookupError(
                    "Branch not found"
                )

        # ----------------------------------------------------
        # Status validation
        # ----------------------------------------------------

        if "status" in data:

            data["status"] = data["status"].upper()

            if data["status"] not in [
                "ACTIVE",
                "INACTIVE"
            ]:
                raise ValueError(
                    "Status must be ACTIVE or INACTIVE"
                )

        # ----------------------------------------------------
        # Update fields
        # ----------------------------------------------------

        for field, value in data.items():
            setattr(employee, field, value)

        try:
            db.commit()
            db.refresh(employee)

        except Exception:
            db.rollback()
            raise

        return employee

    # ========================================================
    # DELETE / DEACTIVATE EMPLOYEE
    # ========================================================

    @staticmethod
    def deactivate_employee(
        db: Session,
        employee_id: int
    ) -> None:

        employee = (
            db.query(Employee)
            .filter(
                Employee.id == employee_id
            )
            .first()
        )

        if not employee:
            raise LookupError(
                "Employee not found"
            )

        employee.status = "INACTIVE"

        try:
            db.commit()

        except Exception:
            db.rollback()
            raise