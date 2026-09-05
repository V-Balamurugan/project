from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


StopStatus = Literal[
    "PENDING",
    "COMPLETED",
    "SKIPPED",
]

PlanStatus = Literal[
    "PLANNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
]

OptimizationAlgorithm = Literal[
    "PRIORITY_TSP",
    "SHORTEST_DISTANCE",
    "DEADLINE_FIRST",
]


class RouteStopDetail(BaseModel):
    stop_number: int
    parcel_id: int
    assignment_id: int | None = None
    tracking_number: str
    receiver: str
    destination_address: str
    latitude: float
    longitude: float
    priority: str = "NORMAL"
    weight: float = 1.0
    status: StopStatus = "PENDING"
    distance_from_prev_meters: float = 0.0
    duration_from_prev_seconds: float = 0.0
    completed_at: datetime | None = None


class OptimizeRouteRequest(BaseModel):
    employee_id: int = Field(..., gt=0, description="Employee assigned to execute this route")
    start_branch_id: int | None = Field(default=None, description="Starting hub/branch (defaults to employee branch)")
    parcel_ids: list[int] = Field(..., min_length=1, description="List of parcel IDs to optimize and deliver")
    algorithm: OptimizationAlgorithm = "PRIORITY_TSP"
    include_return_to_depot: bool = False


class UpdateStopStatusRequest(BaseModel):
    status: StopStatus
    remarks: str | None = None


class RoutePlanResponse(BaseModel):
    id: int
    plan_code: str
    employee_id: int
    employee_name: str | None = None
    start_branch_id: int
    start_branch_name: str | None = None
    start_latitude: float
    start_longitude: float
    total_distance_meters: float
    total_duration_seconds: float
    total_stops_count: int
    completed_stops_count: int
    status: PlanStatus
    algorithm_used: str
    stops: list[RouteStopDetail]
    polyline_coordinates: list[list[float]]
    active_stop: RouteStopDetail | None = None
    created_at: datetime
    updated_at: datetime


class ActivePlanTrackingSummary(BaseModel):
    route_plan_id: int
    plan_code: str
    total_stops: int
    completed_stops: int
    current_stop_number: int | None = None
    current_stop_parcel_id: int | None = None
    current_stop_destination: str | None = None
    current_stop_latitude: float | None = None
    current_stop_longitude: float | None = None
    is_on_optimized_route: bool = True
    distance_from_planned_route_meters: float = 0.0
    plan_status: PlanStatus
