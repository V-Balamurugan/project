from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    assignment_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    parcel_id: Mapped[int] = mapped_column(
        ForeignKey("parcels.id"),
        nullable=False,
        index=True
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
        index=True
    )

    # Assignment Type: PICKUP, INBOUND_TRANSFER, INTERCITY_TRANSPORT, LAST_MILE_DELIVERY
    assignment_type: Mapped[str] = mapped_column(
        String(50),
        default="LAST_MILE_DELIVERY",
        nullable=False,
        index=True
    )

    # Assignment Status: ASSIGNED, IN_PROGRESS, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
    status: Mapped[str] = mapped_column(
        String(30),
        default="ASSIGNED",
        nullable=False,
        index=True
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    picked_up_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        Index(
            "ix_delivery_assignments_parcel_status",
            "parcel_id",
            "status"
        ),
    )