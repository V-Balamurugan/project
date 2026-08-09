from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    branch_code: str = Field(
        ...,
        min_length=2,
        max_length=20,
        description="Unique branch code"
    )

    branch_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Branch name"
    )

    address: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Branch address"
    )

    city: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Branch city"
    )

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Geographical latitude"
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Geographical longitude"
    )

    phone: str | None = Field(
        default=None,
        min_length=7,
        max_length=20,
        description="Branch contact number"
    )

    status: str = Field(
        default="ACTIVE",
        min_length=1,
        max_length=20,
        description="Branch status"
    )


class BranchUpdate(BaseModel):
    branch_code: str | None = Field(
        default=None,
        min_length=2,
        max_length=20
    )

    branch_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    address: str | None = Field(
        default=None,
        min_length=3,
        max_length=255
    )

    city: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180
    )

    phone: str | None = Field(
        default=None,
        min_length=7,
        max_length=20
    )

    status: str | None = Field(
        default=None,
        min_length=1,
        max_length=20
    )


class BranchResponse(BaseModel):
    id: int
    branch_code: str
    branch_name: str
    address: str
    city: str
    latitude: float
    longitude: float
    phone: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )