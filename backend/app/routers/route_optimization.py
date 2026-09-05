from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.route_optimization import (
    OptimizeRouteRequest,
    RoutePlanResponse,
)
from app.services.route_optimization_service import (
    RouteOptimizationService,
)

router = APIRouter(
    prefix="/api/route-optimization",
    tags=["Route Optimization"],
)


@router.post(
    "/optimize",
    response_model=RoutePlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def optimize_route(
    request: OptimizeRouteRequest,
    db: Session = Depends(get_db),
):
    try:
        return await RouteOptimizationService.optimize_route(
            db=db,
            request=request,
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
            detail=f"Failed to optimize route: {error}",
        )


@router.get(
    "/plans",
    response_model=list[RoutePlanResponse],
    status_code=status.HTTP_200_OK,
)
def list_route_plans(
    employee_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return RouteOptimizationService.list_route_plans(
        db=db,
        employee_id=employee_id,
        status=status,
        limit=limit,
    )


@router.get(
    "/plans/{plan_id}",
    response_model=RoutePlanResponse,
    status_code=status.HTTP_200_OK,
)
def get_route_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    try:
        return RouteOptimizationService.get_route_plan(
            db=db,
            plan_id=plan_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


@router.get(
    "/employee/{employee_id}/active",
    response_model=RoutePlanResponse | None,
    status_code=status.HTTP_200_OK,
)
def get_active_plan_for_employee(
    employee_id: int,
    db: Session = Depends(get_db),
):
    return RouteOptimizationService.get_active_plan_for_employee(
        db=db,
        employee_id=employee_id,
    )


@router.get(
    "/parcel/{parcel_id}/active",
    response_model=RoutePlanResponse | None,
    status_code=status.HTTP_200_OK,
)
def get_active_plan_for_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    return RouteOptimizationService.get_active_plan_for_parcel(
        db=db,
        parcel_id=parcel_id,
    )


@router.post(
    "/plans/{plan_id}/start",
    response_model=RoutePlanResponse,
    status_code=status.HTTP_200_OK,
)
def start_route_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    try:
        return RouteOptimizationService.start_route_plan(
            db=db,
            plan_id=plan_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


@router.post(
    "/plans/{plan_id}/stops/{parcel_id}/complete",
    response_model=RoutePlanResponse,
    status_code=status.HTTP_200_OK,
)
def complete_stop(
    plan_id: int,
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:
        return RouteOptimizationService.complete_stop(
            db=db,
            plan_id=plan_id,
            parcel_id=parcel_id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
