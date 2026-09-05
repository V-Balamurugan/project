from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
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

    sender_phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    receiver: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    receiver_phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
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

    # Sender (Pickup) Coordinates
    sender_latitude: Mapped[float] = mapped_column(
        Float,
        default=9.9252,
        nullable=False
    )

    sender_longitude: Mapped[float] = mapped_column(
        Float,
        default=78.1198,
        nullable=False
    )

    # Receiver (Dropoff) Coordinates
    receiver_latitude: Mapped[float] = mapped_column(
        Float,
        default=9.9390,
        nullable=False
    )

    receiver_longitude: Mapped[float] = mapped_column(
        Float,
        default=78.1340,
        nullable=False
    )

    # Backward compatible aliases
    latitude: Mapped[float] = mapped_column(
        Float,
        default=9.9390,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        default=78.1340,
        nullable=False
    )

    service_type: Mapped[str] = mapped_column(
        String(50),
        default="EXPRESS",
        nullable=False
    )

    priority: Mapped[str] = mapped_column(
        String(30),
        default="NORMAL",  # URGENT, HIGH, NORMAL, LOW
        nullable=False
    )

    weight: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="REGISTERED",
        nullable=False,
        index=True
    )

    # 14-Stage Real-World Workflow Status
    # CREATED, PICKUP_ASSIGNED, PICKUP_IN_PROGRESS, PICKED_UP,
    # INBOUND_TO_SENDER_BRANCH, AT_SENDER_BRANCH, READY_FOR_INTERCITY_TRANSPORT,
    # INTERCITY_ASSIGNED, IN_INTERCITY_TRANSIT, AT_RECEIVER_BRANCH,
    # READY_FOR_LAST_MILE_DELIVERY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
    current_stage: Mapped[str] = mapped_column(
        String(50),
        default="CREATED",
        nullable=False,
        index=True
    )

    current_branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id"),
        nullable=True,
        index=True
    )

    current_vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
        index=True
    )

    current_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"),
        nullable=True,
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