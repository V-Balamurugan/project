from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    # ============================================================
    # ASSIGNMENT IDENTIFICATION
    # Example: DA000001
    # ============================================================

    assignment_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    # ============================================================
    # PARCEL
    # Connects this assignment to an existing parcel
    # ============================================================

    parcel_id: Mapped[int] = mapped_column(
        ForeignKey("parcels.id"),
        nullable=False,
        index=True
    )

    # ============================================================
    # EMPLOYEE
    # Connects this assignment to an existing employee
    # ============================================================

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    # ============================================================
    # ASSIGNMENT STATUS
    #
    # Possible values:
    # ASSIGNED
    # PICKED_UP
    # IN_TRANSIT
    # DELIVERED
    # CANCELLED
    # ============================================================

    status: Mapped[str] = mapped_column(
        String(30),
        default="ASSIGNED",
        nullable=False,
        index=True
    )

    # ============================================================
    # ASSIGNMENT TIME
    # ============================================================

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # ============================================================
    # PICKUP TIME
    # Nullable because parcel may not have been picked up yet
    # ============================================================

    picked_up_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    # ============================================================
    # DELIVERY COMPLETION TIME
    # Nullable because delivery may not be completed yet
    # ============================================================

    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    # ============================================================
    # OPTIONAL NOTES
    # Admin can add additional assignment information
    # ============================================================

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # ============================================================
    # RECORD CREATION TIME
    # ============================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # ============================================================
    # RECORD UPDATE TIME
    # ============================================================

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # ============================================================
    # INDEXES
    # ============================================================

    __table_args__ = (
        Index(
            "ix_delivery_assignments_parcel_status",
            "parcel_id",
            "status"
        ),
    )