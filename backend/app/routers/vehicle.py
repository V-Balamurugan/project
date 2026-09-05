from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleUpdate,
    VehicleLocationUpdate,
    VehicleResponse,
    VehicleListResponse,
)
from app.services.vehicle_service import VehicleService

router = APIRouter(
    prefix="/api/vehicles",
    tags=["Vehicles & Fleet Management"],
)


@router.get("", response_model=VehicleListResponse)
def list_vehicles(
    branch_id: int | None = None,
    status: str | None = None,
    vehicle_type: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return VehicleService.get_vehicles(
        db=db,
        branch_id=branch_id,
        status=status,
        vehicle_type=vehicle_type,
        limit=limit,
        offset=offset,
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    try:
        return VehicleService.get_vehicle_by_id(db=db, vehicle_id=vehicle_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    try:
        return VehicleService.create_vehicle(db=db, data=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db)
):
    try:
        return VehicleService.update_vehicle(db=db, vehicle_id=vehicle_id, data=payload)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{vehicle_id}/location", response_model=VehicleResponse)
def update_location(
    vehicle_id: int, payload: VehicleLocationUpdate, db: Session = Depends(get_db)
):
    try:
        return VehicleService.update_vehicle_location(
            db=db,
            vehicle_id=vehicle_id,
            lat=payload.latitude,
            lon=payload.longitude,
            status=payload.status,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    try:
        VehicleService.delete_vehicle(db=db, vehicle_id=vehicle_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
