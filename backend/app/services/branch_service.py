from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchUpdate


class BranchService:

    @staticmethod
    def create_branch(
        db: Session,
        branch_data: BranchCreate
    ) -> Branch:

        # Check duplicate branch code
        existing_branch = db.scalar(
            select(Branch).where(
                Branch.branch_code == branch_data.branch_code
            )
        )

        if existing_branch:
            raise ValueError("Branch code already exists")

        branch = Branch(
            branch_code=branch_data.branch_code,
            branch_name=branch_data.branch_name,
            address=branch_data.address,
            city=branch_data.city,
            latitude=branch_data.latitude,
            longitude=branch_data.longitude,
            phone=branch_data.phone,
            status=branch_data.status.upper(),
        )

        try:
            db.add(branch)
            db.commit()
            db.refresh(branch)

            return branch

        except IntegrityError:
            db.rollback()
            raise ValueError(
                "Unable to create branch because of a database constraint"
            )

    @staticmethod
    def get_branches(
        db: Session,
        search: str | None = None
    ) -> list[Branch]:

        query = select(Branch)

        if search:
            search_pattern = f"%{search.strip()}%"

            query = query.where(
                or_(
                    Branch.branch_code.ilike(search_pattern),
                    Branch.branch_name.ilike(search_pattern),
                    Branch.city.ilike(search_pattern),
                )
            )

        query = query.order_by(Branch.id.asc())

        return list(db.scalars(query).all())

    @staticmethod
    def get_branch_by_id(
        db: Session,
        branch_id: int
    ) -> Branch | None:

        return db.scalar(
            select(Branch).where(
                Branch.id == branch_id
            )
        )

    @staticmethod
    def update_branch(
        db: Session,
        branch_id: int,
        branch_data: BranchUpdate
    ) -> Branch | None:

        branch = db.scalar(
            select(Branch).where(
                Branch.id == branch_id
            )
        )

        if not branch:
            return None

        update_data = branch_data.model_dump(
            exclude_unset=True
        )

        # Normalize status
        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = update_data["status"].upper()

        # Check duplicate branch code
        if "branch_code" in update_data:
            existing_branch = db.scalar(
                select(Branch).where(
                    Branch.branch_code == update_data["branch_code"],
                    Branch.id != branch_id
                )
            )

            if existing_branch:
                raise ValueError(
                    "Branch code already exists"
                )

        # Apply updates
        for field, value in update_data.items():
            setattr(branch, field, value)

        try:
            db.commit()
            db.refresh(branch)

            return branch

        except IntegrityError:
            db.rollback()
            raise ValueError(
                "Unable to update branch because of a database constraint"
            )

    @staticmethod
    def delete_branch(
        db: Session,
        branch_id: int
    ) -> bool:

        branch = db.scalar(
            select(Branch).where(
                Branch.id == branch_id
            )
        )

        if not branch:
            return False

        try:
            db.delete(branch)
            db.commit()

            return True

        except IntegrityError:
            db.rollback()

            raise ValueError(
                "Branch cannot be deleted because it is being used by other records"
            )