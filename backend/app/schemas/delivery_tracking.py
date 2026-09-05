from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


TrackingStatus = Literal[
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
]


class DeliveryTrackingCreate(BaseModel):

    parcel_id: int = Field(
        ...,
        gt=0,
    )

    assignment_id: int = Field(
        ...,
        gt=0,
    )

    employee_id: int = Field(
        ...,
        gt=0,
    )

    status: TrackingStatus

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    accuracy: float | None = Field(
        default=None,
        ge=0,
    )

    speed: float | None = Field(
        default=None,
        ge=0,
    )

    heading: float | None = Field(
        default=None,
        ge=0,
        le=360,
    )

    location_name: str | None = Field(
        default=None,
        max_length=255,
    )

    remarks: str | None = Field(
        default=None,
        max_length=2000,
    )


class LocationUpdateCreate(BaseModel):

    assignment_id: int = Field(
        ...,
        gt=0,
    )

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    accuracy: float | None = Field(
        default=None,
        ge=0,
    )

    # Speed received from mobile GPS
    # Unit: meters per second
    speed: float | None = Field(
        default=None,
        ge=0,
    )

    heading: float | None = Field(
        default=None,
        ge=0,
        le=360,
    )

    timestamp: datetime | None = None

    location_name: str | None = Field(
        default=None,
        max_length=255,
    )

    remarks: str | None = Field(
        default=None,
        max_length=2000,
    )


class DeliveryTrackingResponse(BaseModel):

    id: int

    parcel_id: int

    assignment_id: int

    employee_id: int

    status: str

    latitude: float | None

    longitude: float | None

    accuracy: float | None = None

    speed: float | None = None

    heading: float | None = None

    location_name: str | None

    remarks: str | None

    timestamp: datetime

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


VehicleMotionState = Literal[
    "MOVING",
    "TEMPORARILY_STOPPED",
    "IDLE",
    "LONG_IDLE",
]


class IdleStatusResponse(BaseModel):

    parcel_id: int

    assignment_id: int

    vehicle_status: VehicleMotionState = "MOVING"

    is_idle: bool = False

    is_long_idle: bool = False

    idle_duration_seconds: int = 0

    idle_duration_minutes: int = 0

    idle_started_at: datetime | None = None

    last_movement_at: datetime | None = None

    current_speed_kmph: float = 0.0

    movement_distance_meters: float = 0.0

    stationary_radius_meters: float = 30.0

    status_description: str = "Vehicle is in motion"

    delay_warning: bool = False

    estimated_delay_minutes: int = 0


class ActivePlanTrackingSummary(BaseModel):

    route_plan_id: int

    plan_code: str

    total_stops: int

    completed_stops: int

    current_stop_number: int | None = None

    current_stop_parcel_id: int | None = None

    current_stop_destination: str | None = None

    is_on_optimized_route: bool = True

    distance_from_planned_route_meters: float = 0.0

    plan_status: str = "IN_PROGRESS"


class DynamicETAResponse(BaseModel):

    parcel_id: int

    assignment_id: int

    remaining_distance_meters: float

    current_speed_kmph: float = 0.0

    average_speed_kmph: float = 25.0

    is_stationary: bool = True

    speed_source: str = "DEFAULT"

    estimated_remaining_seconds: int = 60

    estimated_remaining_minutes: int = 1

    estimated_arrival_time: datetime

    vehicle_status: VehicleMotionState | None = "MOVING"

    idle_duration_minutes: int | None = 0

    delay_warning: bool | None = False

    route_plan_summary: ActivePlanTrackingSummary | None = None


class RoadRouteResponse(BaseModel):

    parcel_id: int

    assignment_id: int

    current_latitude: float

    current_longitude: float

    destination_latitude: float

    destination_longitude: float

    distance_meters: float

    duration_seconds: float

    coordinates: list[list[float]]

    current_speed_kmph: float | None = 0.0

    average_speed_kmph: float | None = 25.0

    is_stationary: bool | None = True

    speed_source: str | None = None

    estimated_remaining_seconds: int | None = None

    estimated_remaining_minutes: int | None = None

    estimated_arrival_time: datetime | None = None

    is_route_deviated: bool = False

    distance_from_route_meters: float = 0.0

    deviation_threshold_meters: float = 150.0

    route_recalculated: bool = False

    vehicle_status: VehicleMotionState | None = "MOVING"

    idle_duration_minutes: int | None = 0

    delay_warning: bool | None = False

    route_plan_summary: ActivePlanTrackingSummary | None = None



class RouteDeviationResponse(BaseModel):

    parcel_id: int

    assignment_id: int

    is_route_deviated: bool

    distance_from_route_meters: float

    deviation_threshold_meters: float = 150.0

    route_recalculated: bool

    remaining_distance_meters: float

    estimated_remaining_seconds: int = 60

    estimated_remaining_minutes: int = 1

    status_message: str = "On Route"

    recalculated_route: RoadRouteResponse | None = None