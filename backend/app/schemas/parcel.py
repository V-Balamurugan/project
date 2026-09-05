from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================
# 14 REALISTIC PARCEL JOURNEY STAGES
# ============================================================

ALL_JOURNEY_STAGES = [
    "CREATED",
    "PICKUP_ASSIGNED",
    "PICKUP_IN_PROGRESS",
    "PICKED_UP",
    "INBOUND_TO_SENDER_BRANCH",
    "AT_SENDER_BRANCH",
    "READY_FOR_INTERCITY_TRANSPORT",
    "INTERCITY_ASSIGNED",
    "IN_INTERCITY_TRANSIT",
    "AT_RECEIVER_BRANCH",
    "READY_FOR_LAST_MILE_DELIVERY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
]


# ============================================================
# BASE PARCEL SCHEMA
# ============================================================

class ParcelBase(BaseModel):
    tracking_number: str = Field(..., min_length=3, max_length=50)
    sender: str = Field(..., min_length=2, max_length=100)
    sender_phone: str | None = None
    receiver: str = Field(..., min_length=2, max_length=100)
    receiver_phone: str | None = None
    source_branch_id: int = Field(..., gt=0)
    destination_branch_id: int = Field(..., gt=0)
    source_address: str = Field(..., min_length=3, max_length=255)
    destination_address: str = Field(..., min_length=3, max_length=255)

    # Sender (Pickup) Coordinates
    sender_latitude: float = Field(default=9.9252, ge=-90, le=90)
    sender_longitude: float = Field(default=78.1198, ge=-180, le=180)

    # Receiver (Dropoff) Coordinates
    receiver_latitude: float = Field(default=9.9390, ge=-90, le=90)
    receiver_longitude: float = Field(default=78.1340, ge=-180, le=180)

    # Compatibility aliases
    latitude: float = Field(default=9.9390, ge=-90, le=90)
    longitude: float = Field(default=78.1340, ge=-180, le=180)

    service_type: str = Field(default="EXPRESS", min_length=2, max_length=50)
    priority: str = Field(default="NORMAL", min_length=2, max_length=30)
    weight: float = Field(default=1.0, gt=0)
    status: str = Field(default="REGISTERED", min_length=2, max_length=30)
    current_stage: str = Field(default="CREATED", min_length=2, max_length=50)

    current_branch_id: int | None = None
    current_vehicle_id: int | None = None
    current_employee_id: int | None = None

    expected_delivery_time: datetime | None = None

    @field_validator(
        "tracking_number",
        "sender",
        "receiver",
        "source_address",
        "destination_address",
    )
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        value = value.upper()
        allowed = {"LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"}
        if value not in allowed:
            raise ValueError("Priority must be LOW, NORMAL, HIGH, URGENT, or CRITICAL.")
        return value


# ============================================================
# CREATE PARCEL
# ============================================================

class ParcelCreate(ParcelBase):
    pass


# ============================================================
# UPDATE PARCEL
# ============================================================

class ParcelUpdate(BaseModel):
    sender: str | None = None
    sender_phone: str | None = None
    receiver: str | None = None
    receiver_phone: str | None = None
    source_branch_id: int | None = None
    destination_branch_id: int | None = None
    source_address: str | None = None
    destination_address: str | None = None
    sender_latitude: float | None = None
    sender_longitude: float | None = None
    receiver_latitude: float | None = None
    receiver_longitude: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    service_type: str | None = None
    priority: str | None = None
    weight: float | None = None
    status: str | None = None
    current_stage: str | None = None
    current_branch_id: int | None = None
    current_vehicle_id: int | None = None
    current_employee_id: int | None = None
    expected_delivery_time: datetime | None = None


# ============================================================
# STAGE TRANSITION & DISPATCH ACTIONS
# ============================================================

class AssignPickupRequest(BaseModel):
    employee_id: int
    notes: str | None = None


class ReceiveAtBranchRequest(BaseModel):
    branch_id: int
    remarks: str | None = None


class InterCityTransportRequest(BaseModel):
    vehicle_id: int
    driver_employee_id: int | None = None
    parcel_ids: list[int]
    notes: str | None = None


class AssignLastMileRequest(BaseModel):
    employee_id: int
    notes: str | None = None


class ConfirmDeliveryRequest(BaseModel):
    recipient_name: str | None = None
    otp_code: str | None = None
    remarks: str | None = None


# ============================================================
# JOURNEY EVENT RESPONSE
# ============================================================

class JourneyEventResponse(BaseModel):
    id: int
    parcel_id: int
    stage: str
    stage_title: str
    branch_id: int | None = None
    branch_name: str | None = None
    employee_id: int | None = None
    employee_name: str | None = None
    vehicle_id: int | None = None
    vehicle_reg: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    remarks: str | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PARCEL RESPONSE
# ============================================================

class ParcelResponse(ParcelBase):
    id: int
    source_branch_name: str | None = None
    destination_branch_name: str | None = None
    current_branch_name: str | None = None
    current_vehicle_reg: str | None = None
    current_employee_name: str | None = None
    actual_delivery_time: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParcelDetailResponse(ParcelResponse):
    journey_history: list[JourneyEventResponse] = []


# ============================================================
# PAGINATED RESPONSE
# ============================================================

class ParcelListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    parcels: list[ParcelResponse]