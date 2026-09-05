from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    registration_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    vehicle_type: Mapped[str] = mapped_column(
        String(50),
        default="VAN",  # VAN, TRUCK, MOTORCYCLE, EV_VAN
        nullable=False
    )

    capacity_kg: Mapped[float] = mapped_column(
        Float,
        default=500.0,
        nullable=False
    )

    max_parcels: Mapped[int] = mapped_column(
        Integer,
        default=50,
        nullable=False
    )

    current_branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id"),
        nullable=True,
        index=True
    )

    assigned_driver_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"),
        nullable=True,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="AVAILABLE",  # AVAILABLE, ASSIGNED, LOADING, IN_TRANSIT, IDLE, MAINTENANCE
        nullable=False,
        index=True
    )

    current_latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    current_longitude: Mapped[float | None] = mapped_column(
        Float,
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
