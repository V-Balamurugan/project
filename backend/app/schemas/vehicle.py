from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: str = "VAN"  # VAN, TRUCK, MOTORCYCLE, EV_VAN
    capacity_kg: float = 500.0
    max_parcels: int = 50
    current_branch_id: int | None = None
    assigned_driver_id: int | None = None
    status: str = "AVAILABLE"
    current_latitude: float | None = None
    current_longitude: float | None = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    vehicle_type: str | None = None
    capacity_kg: float | None = None
    max_parcels: int | None = None
    current_branch_id: int | None = None
    assigned_driver_id: int | None = None
    status: str | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None


class VehicleLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    status: str | None = None


class VehicleResponse(VehicleBase):
    id: int
    branch_name: str | None = None
    driver_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleListResponse(BaseModel):
    total: int
    vehicles: list[VehicleResponse]
