from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# CREATE DELIVERY ASSIGNMENT
# ============================================================

class DeliveryAssignmentCreate(BaseModel):
    parcel_id: int = Field(
        ...,
        gt=0,
        description="ID of the parcel to be assigned"
    )

    employee_id: int = Field(
        ...,
        gt=0,
        description="ID of the employee responsible for delivery"
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional assignment notes"
    )


# ============================================================
# UPDATE DELIVERY ASSIGNMENT
# ============================================================

class DeliveryAssignmentUpdate(BaseModel):
    employee_id: int | None = Field(
        default=None,
        gt=0,
        description="New employee ID for reassignment"
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Updated assignment notes"
    )


# ============================================================
# UPDATE ASSIGNMENT STATUS
# ============================================================

class DeliveryAssignmentStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        description="New delivery assignment status"
    )


# ============================================================
# RESPONSE
# ============================================================

class DeliveryAssignmentResponse(BaseModel):
    id: int

    assignment_code: str

    parcel_id: int

    employee_id: int

    status: str

    assigned_at: datetime

    picked_up_at: datetime | None = None

    delivered_at: datetime | None = None

    notes: str | None = None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class DeliveryAssignmentListResponse(BaseModel):
    items: list[DeliveryAssignmentResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    model_config = ConfigDict(
        from_attributes=True
    )