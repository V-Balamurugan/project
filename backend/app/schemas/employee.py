from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ============================================================
# CREATE EMPLOYEE
# ============================================================

class EmployeeCreate(BaseModel):

    employee_code: str = Field(
        ...,
        min_length=3,
        max_length=20
    )

    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    phone: str = Field(
        ...,
        min_length=7,
        max_length=20
    )

    email: EmailStr

    branch_id: int = Field(
        ...,
        gt=0
    )

    vehicle_type: str = Field(
        ...,
        min_length=2,
        max_length=50
    )

    status: str = Field(
        default="ACTIVE",
        max_length=30
    )

    current_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90
    )

    current_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180
    )


# ============================================================
# UPDATE EMPLOYEE
# ============================================================

class EmployeeUpdate(BaseModel):

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    phone: str | None = Field(
        default=None,
        min_length=7,
        max_length=20
    )

    email: EmailStr | None = None

    branch_id: int | None = Field(
        default=None,
        gt=0
    )

    vehicle_type: str | None = Field(
        default=None,
        min_length=2,
        max_length=50
    )

    status: str | None = Field(
        default=None,
        max_length=30
    )

    current_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90
    )

    current_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180
    )


# ============================================================
# EMPLOYEE RESPONSE
# ============================================================

class EmployeeResponse(BaseModel):

    id: int

    employee_code: str

    name: str

    phone: str

    email: str

    branch_id: int

    vehicle_type: str

    status: str

    current_latitude: float | None

    current_longitude: float | None

    total_deliveries: int

    completed_deliveries: int

    delayed_deliveries: int

    average_delivery_time: float

    performance_score: float

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# EMPLOYEE LIST RESPONSE
# ============================================================

class EmployeeListResponse(BaseModel):

    total: int

    page: int

    limit: int

    employees: list[EmployeeResponse]