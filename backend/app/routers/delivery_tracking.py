from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.delivery_tracking import (
    DeliveryTrackingCreate,
    DeliveryTrackingResponse,
    DynamicETAResponse,
    IdleStatusResponse,
    LocationUpdateCreate,
    RoadRouteResponse,
    RouteDeviationResponse,
)
from app.services.delivery_tracking_service import (
    DeliveryTrackingService,
)


router = APIRouter(
    prefix="/api/delivery-tracking",
    tags=["Delivery Tracking"],
)


# ============================================================
# CREATE TRACKING EVENT
# ============================================================

@router.post(
    "",
    response_model=DeliveryTrackingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_tracking_event(
    data: DeliveryTrackingCreate,
    db: Session = Depends(get_db),
):
    try:
        return DeliveryTrackingService.create_tracking_event(
            db=db,
            data=data,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tracking event: {error}",
        )


# ============================================================
# RECORD LIVE GPS LOCATION UPDATE
# ============================================================

@router.post(
    "/location",
    response_model=DeliveryTrackingResponse,
    status_code=status.HTTP_201_CREATED,
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
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record location: {error}",
        )


# ============================================================
# GET TRACKING HISTORY FOR A PARCEL
# ============================================================

@router.get(
    "/parcel/{parcel_id}",
    response_model=list[DeliveryTrackingResponse],
    status_code=status.HTTP_200_OK,
)
def get_parcel_tracking(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return DeliveryTrackingService.get_parcel_tracking(
            db=db,
            parcel_id=parcel_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tracking history: {error}",
        )


# ============================================================
# GET LATEST TRACKING FOR A PARCEL
# ============================================================

@router.get(
    "/parcel/{parcel_id}/latest",
    response_model=DeliveryTrackingResponse,
    status_code=status.HTTP_200_OK,
)
def get_latest_tracking(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return DeliveryTrackingService.get_latest_tracking(
            db=db,
            parcel_id=parcel_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve latest tracking: {error}",
        )


# ============================================================
# GET REMAINING ROAD ROUTE & DEVIATION DETECTION
# ============================================================

@router.get(
    "/parcel/{parcel_id}/route",
    response_model=RoadRouteResponse,
    status_code=status.HTTP_200_OK,
)
async def get_road_route(
    parcel_id: int,
    force_recalculate: bool = Query(
        default=False,
        description="Force recalculate new ORS route ignoring deviation cache",
    ),
    threshold_meters: float = Query(
        default=150.0,
        ge=10.0,
        le=5000.0,
        description="Route deviation threshold in meters",
    ),
    db: Session = Depends(get_db),
):
    try:
        return await DeliveryTrackingService.get_road_route(
            db=db,
            parcel_id=parcel_id,
            force_recalculate=force_recalculate,
            threshold_meters=threshold_meters,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute road route: {error}",
        )


# ============================================================
# CHECK ROUTE DEVIATION
# ============================================================

@router.get(
    "/parcel/{parcel_id}/deviation",
    response_model=RouteDeviationResponse,
    status_code=status.HTTP_200_OK,
)
async def check_route_deviation(
    parcel_id: int,
    threshold_meters: float = Query(
        default=150.0,
        ge=10.0,
        le=5000.0,
        description="Allowed deviation distance in meters",
    ),
    db: Session = Depends(get_db),
):
    try:
        return await DeliveryTrackingService.check_route_deviation(
            db=db,
            parcel_id=parcel_id,
            threshold_meters=threshold_meters,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check route deviation: {error}",
        )


# ============================================================
# GET SMART STOP & IDLE DETECTION STATUS
# ============================================================

@router.get(
    "/parcel/{parcel_id}/idle-status",
    response_model=IdleStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_idle_status(
    parcel_id: int,
    min_movement_meters: float = Query(
        default=30.0,
        ge=5.0,
        le=500.0,
        description="Minimum distance in meters to be considered actual movement",
    ),
    min_moving_speed: float = Query(
        default=3.0,
        ge=0.5,
        le=50.0,
        description="Minimum speed in km/h to be considered active motion",
    ),
    db: Session = Depends(get_db),
):
    try:
        return DeliveryTrackingService.detect_vehicle_idle_status(
            db=db,
            parcel_id=parcel_id,
            min_movement_meters=min_movement_meters,
            min_moving_speed=min_moving_speed,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve idle status: {error}",
        )


# ============================================================
# GET DYNAMIC ETA
# ============================================================

@router.get(
    "/parcel/{parcel_id}/eta",
    response_model=DynamicETAResponse,
    status_code=status.HTTP_200_OK,
)
async def get_dynamic_eta(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return await DeliveryTrackingService.get_dynamic_eta(
            db=db,
            parcel_id=parcel_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate ETA: {error}",
        )


# ============================================================
# GET TRACKING HISTORY FOR AN ASSIGNMENT
# ============================================================

@router.get(
    "/assignment/{assignment_id}",
    response_model=list[DeliveryTrackingResponse],
    status_code=status.HTTP_200_OK,
)
def get_assignment_tracking(
    assignment_id: int,
    db: Session = Depends(get_db),
):
    try:
        return DeliveryTrackingService.get_assignment_tracking(
            db=db,
            assignment_id=assignment_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve assignment tracking: {error}",
        )