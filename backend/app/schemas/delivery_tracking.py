from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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