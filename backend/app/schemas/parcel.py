from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ============================================================
# BASE PARCEL SCHEMA
# ============================================================

class ParcelBase(BaseModel):
    tracking_number: str = Field(
        ...,
        min_length=3,
        max_length=50,
    )

    sender: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    receiver: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    source_branch_id: int = Field(
        ...,
        gt=0,
    )

    destination_branch_id: int = Field(
        ...,
        gt=0,
    )

    source_address: str = Field(
        ...,
        min_length=3,
        max_length=255,
    )

    destination_address: str = Field(
        ...,
        min_length=3,
        max_length=255,
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

    service_type: str = Field(
        ...,
        min_length=2,
        max_length=50,
    )

    priority: str = Field(
        default="NORMAL",
        min_length=2,
        max_length=30,
    )

    weight: float = Field(
        ...,
        gt=0,
    )

    status: str = Field(
        default="REGISTERED",
        min_length=2,
        max_length=30,
    )

    expected_delivery_time: datetime | None = None

    # ----------------------------------------------------------
    # VALIDATORS
    # ----------------------------------------------------------

    @field_validator(
        "tracking_number",
        "sender",
        "receiver",
        "source_address",
        "destination_address",
        "service_type",
        "priority",
        "status",
    )
    @classmethod
    def validate_text_fields(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "This field cannot be empty."
            )

        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(
        cls,
        value: str,
    ) -> str:
        value = value.upper()

        allowed = {
            "LOW",
            "NORMAL",
            "HIGH",
            "URGENT",
        }

        if value not in allowed:
            raise ValueError(
                "Priority must be LOW, NORMAL, HIGH, or URGENT."
            )

        return value

    @field_validator("status")
    @classmethod
    def validate_status(
        cls,
        value: str,
    ) -> str:
        value = value.upper()

        allowed = {
            "REGISTERED",
            "PROCESSING",
            "DISPATCHED",
            "IN_TRANSIT",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "DELAYED",
            "CANCELLED",
            "RETURNED",
        }

        if value not in allowed:
            raise ValueError(
                "Invalid parcel status."
            )

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
    sender: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    receiver: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    source_branch_id: int | None = Field(
        default=None,
        gt=0,
    )

    destination_branch_id: int | None = Field(
        default=None,
        gt=0,
    )

    source_address: str | None = Field(
        default=None,
        min_length=3,
        max_length=255,
    )

    destination_address: str | None = Field(
        default=None,
        min_length=3,
        max_length=255,
    )

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

    service_type: str | None = Field(
        default=None,
        min_length=2,
        max_length=50,
    )

    priority: str | None = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    weight: float | None = Field(
        default=None,
        gt=0,
    )

    status: str | None = Field(
        default=None,
        min_length=2,
        max_length=30,
    )

    expected_delivery_time: datetime | None = None

    # ----------------------------------------------------------
    # VALIDATORS
    # ----------------------------------------------------------

    @field_validator(
        "sender",
        "receiver",
        "source_address",
        "destination_address",
        "service_type",
    )
    @classmethod
    def validate_text_fields(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if not value:
            raise ValueError(
                "This field cannot be empty."
            )

        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.upper()

        allowed = {
            "LOW",
            "NORMAL",
            "HIGH",
            "URGENT",
        }

        if value not in allowed:
            raise ValueError(
                "Priority must be LOW, NORMAL, HIGH, or URGENT."
            )

        return value

    @field_validator("status")
    @classmethod
    def validate_status(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.upper()

        allowed = {
            "REGISTERED",
            "PROCESSING",
            "DISPATCHED",
            "IN_TRANSIT",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "DELAYED",
            "CANCELLED",
            "RETURNED",
        }

        if value not in allowed:
            raise ValueError(
                "Invalid parcel status."
            )

        return value


# ============================================================
# PARCEL RESPONSE
# ============================================================

class ParcelResponse(ParcelBase):
    id: int

    actual_delivery_time: datetime | None = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# PAGINATED RESPONSE
# ============================================================

class ParcelListResponse(BaseModel):
    total: int

    page: int

    limit: int

    total_pages: int

    parcels: list[ParcelResponse]