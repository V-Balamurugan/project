from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.delivery_tracking import (
    DeliveryTrackingCreate,
    DeliveryTrackingResponse,
    LocationUpdateCreate,
    RoadRouteResponse,
)
from app.services.delivery_tracking_service import (
    DeliveryTrackingService,
)

router = APIRouter(
    prefix="/api/delivery-tracking",
    tags=["Delivery Tracking"],
)


# ============================================================
# RECEIVE DELIVERY BOY MOBILE GPS LOCATION
# ============================================================

@router.post(
    "/location",
    response_model=DeliveryTrackingResponse,
    status_code=201,
)
def record_location(
    data: LocationUpdateCreate,
    db: Session = Depends(get_db),
):
    try:
        return DeliveryTrackingService.record_location(
            db=db,
            data=data,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# ============================================================
# CREATE TRACKING EVENT
# ============================================================

@router.post(
    "",
    response_model=DeliveryTrackingResponse,
    status_code=201,
)
def create_tracking_event(
    data: DeliveryTrackingCreate,
    db: Session = Depends(get_db),
):
    try:
        return (
            DeliveryTrackingService
            .create_tracking_event(
                db=db,
                data=data,
            )
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        )


# ============================================================
# PARCEL HISTORY
# ============================================================

@router.get(
    "/parcel/{parcel_id}",
    response_model=list[
        DeliveryTrackingResponse
    ],
)
def get_parcel_tracking(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return (
            DeliveryTrackingService
            .get_parcel_tracking(
                db=db,
                parcel_id=parcel_id,
            )
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ============================================================
# LATEST TRACKING
# ============================================================

@router.get(
    "/parcel/{parcel_id}/latest",
    response_model=DeliveryTrackingResponse,
)
def get_latest_tracking(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return (
            DeliveryTrackingService
            .get_latest_tracking(
                db=db,
                parcel_id=parcel_id,
            )
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ============================================================
# ASSIGNMENT HISTORY
# ============================================================

@router.get(
    "/assignment/{assignment_id}",
    response_model=list[
        DeliveryTrackingResponse
    ],
)
def get_assignment_tracking(
    assignment_id: int,
    db: Session = Depends(get_db),
):
    try:
        return (
            DeliveryTrackingService
            .get_assignment_tracking(
                db=db,
                assignment_id=assignment_id,
            )
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ============================================================
# ORS ROAD ROUTE
# ============================================================

@router.get(
    "/parcel/{parcel_id}/route",
    response_model=RoadRouteResponse,
)
async def get_road_route(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return await (
            DeliveryTrackingService
            .get_road_route(
                db=db,
                parcel_id=parcel_id,
            )
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )