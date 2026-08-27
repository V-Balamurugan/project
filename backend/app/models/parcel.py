from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Parcel(Base):
    __tablename__ = "parcels"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    tracking_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    sender: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    receiver: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    source_branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id"),
        nullable=False,
        index=True
    )

    destination_branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id"),
        nullable=False,
        index=True
    )

    source_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    destination_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    service_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    priority: Mapped[str] = mapped_column(
        String(30),
        default="NORMAL",
        nullable=False
    )

    weight: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="REGISTERED",
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    expected_delivery_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    actual_delivery_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )