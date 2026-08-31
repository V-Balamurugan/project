from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DeliveryTracking(Base):
    __tablename__ = "delivery_tracking"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    parcel_id: Mapped[int] = mapped_column(
        ForeignKey("parcels.id"),
        nullable=False,
        index=True,
    )

    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("delivery_assignments.id"),
        nullable=False,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    accuracy: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    speed: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    heading: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    location_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_delivery_tracking_parcel_timestamp",
            "parcel_id",
            "timestamp",
        ),
        Index(
            "ix_delivery_tracking_assignment_timestamp",
            "assignment_id",
            "timestamp",
        ),
    )