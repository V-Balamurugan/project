from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    employee_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False
    )

    branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id"),
        nullable=False,
        index=True
    )

    vehicle_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="ACTIVE",
        nullable=False
    )

    current_latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    current_longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    total_deliveries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    completed_deliveries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    delayed_deliveries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    average_delivery_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )

    performance_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )