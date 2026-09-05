from datetime import datetime, timezone
import json
from typing import Any

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RoutePlan(Base):
    __tablename__ = "route_plans"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ============================================================
    # PLAN IDENTIFIER (e.g. RP-20260901-0001)
    # ============================================================

    plan_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # ============================================================
    # ASSIGNED DELIVERY EMPLOYEE
    # ============================================================

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"),
        nullable=False,
        index=True,
    )

    # ============================================================
    # STARTING HUB / BRANCH
    # ============================================================

    start_branch_id: Mapped[int] = mapped_column(
        ForeignKey("branches.id"),
        nullable=False,
        index=True,
    )

    # ============================================================
    # TOTAL METRICS
    # ============================================================

    total_distance_meters: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    total_duration_seconds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    # ============================================================
    # PLAN STATUS: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
    # ============================================================

    status: Mapped[str] = mapped_column(
        String(30),
        default="PLANNED",
        nullable=False,
        index=True,
    )

    # ============================================================
    # OPTIMIZATION ALGORITHM
    # e.g. PRIORITY_TSP, SHORTEST_DISTANCE, DEADLINE_FIRST
    # ============================================================

    algorithm_used: Mapped[str] = mapped_column(
        String(50),
        default="PRIORITY_TSP",
        nullable=False,
    )

    # ============================================================
    # ORDERED DELIVERY STOPS (JSON SERIALIZED)
    # Stores list of stop objects:
    # [{
    #   "stop_number": 1,
    #   "parcel_id": 101,
    #   "assignment_id": 12,
    #   "tracking_number": "TRK...",
    #   "receiver": "...",
    #   "destination_address": "...",
    #   "latitude": 9.925,
    #   "longitude": 78.119,
    #   "priority": "URGENT",
    #   "weight": 2.5,
    #   "status": "PENDING" | "COMPLETED" | "SKIPPED",
    #   "completed_at": null,
    #   "distance_from_prev_meters": 1200,
    #   "duration_from_prev_seconds": 240
    # }]
    # ============================================================

    stops_json: Mapped[str] = mapped_column(
        Text,
        default="[]",
        nullable=False,
    )

    # ============================================================
    # FULL PLANNED ROAD POLYLINE (JSON SERIALIZED)
    # [[lon, lat], [lon, lat], ...]
    # ============================================================

    polyline_json: Mapped[str] = mapped_column(
        Text,
        default="[]",
        nullable=False,
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Helper properties for JSON access
    @property
    def stops_list(self) -> list[dict[str, Any]]:
        try:
            return json.loads(self.stops_json) if self.stops_json else []
        except Exception:
            return []

    @stops_list.setter
    def stops_list(self, value: list[dict[str, Any]]) -> None:
        self.stops_json = json.dumps(value)

    @property
    def polyline_coordinates(self) -> list[list[float]]:
        try:
            return json.loads(self.polyline_json) if self.polyline_json else []
        except Exception:
            return []

    @polyline_coordinates.setter
    def polyline_coordinates(self, value: list[list[float]]) -> None:
        self.polyline_json = json.dumps(value)

    __table_args__ = (
        Index(
            "ix_route_plans_employee_status",
            "employee_id",
            "status",
        ),
    )
