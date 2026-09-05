from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ParcelJourneyEvent(Base):
    __tablename__ = "parcel_journey_events"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    parcel_id: Mapped[int] = mapped_column(
        ForeignKey("parcels.id"),
        nullable=False,
        index=True
    )

    stage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )

    stage_title: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id"),
        nullable=True
    )

    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"),
        nullable=True
    )

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True
    )

    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
