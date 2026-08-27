from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.delivery_assignment import (
    DeliveryAssignmentCreate,
    DeliveryAssignmentListResponse,
    DeliveryAssignmentResponse,
    DeliveryAssignmentStatusUpdate,
    DeliveryAssignmentUpdate,
)
from app.services.delivery_assignment_service import (
    DeliveryAssignmentService,
)


router = APIRouter(
    prefix="/api/delivery-assignments",
    tags=["Delivery Assignments"],
)


# ============================================================
# GET ALL DELIVERY ASSIGNMENTS
# ============================================================

@router.get(
    "",
    response_model=DeliveryAssignmentListResponse,
    status_code=status.HTTP_200_OK,
)
def get_assignments(
    search: str | None = Query(
        default=None,
        description="Search by assignment code",
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter by assignment status",
    ),
    employee_id: int | None = Query(
        default=None,
        gt=0,
        description="Filter by employee ID",
    ),
    parcel_id: int | None = Query(
        default=None,
        gt=0,
        description="Filter by parcel ID",
    ),
    page: int = Query(
        default=1,
        ge=1,
        description="Page number",
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Number of records per page",
    ),
    db: Session = Depends(get_db),
):
    assignments, total = (
        DeliveryAssignmentService.get_assignments(
            db=db,
            search=search,
            status=status_filter,
            employee_id=employee_id,
            parcel_id=parcel_id,
            page=page,
            limit=limit,
        )
    )

    total_pages = (
        (total + limit - 1) // limit
        if total > 0
        else 0
    )

    return {
        "items": assignments,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


# ============================================================
# CREATE DELIVERY ASSIGNMENT
# ============================================================

@router.post(
    "",
    response_model=DeliveryAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    assignment_data: DeliveryAssignmentCreate,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.create_assignment(
            db=db,
            assignment_data=assignment_data,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


# ============================================================
# GET ASSIGNMENT BY ID
# ============================================================

@router.get(
    "/{assignment_id}",
    response_model=DeliveryAssignmentResponse,
    status_code=status.HTTP_200_OK,
)
def get_assignment_by_id(
    assignment_id: int,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.get_assignment_by_id(
            db=db,
            assignment_id=assignment_id,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


# ============================================================
# GET ASSIGNMENTS BY EMPLOYEE
# ============================================================

@router.get(
    "/employee/{employee_id}",
    response_model=list[DeliveryAssignmentResponse],
    status_code=status.HTTP_200_OK,
)
def get_assignments_by_employee(
    employee_id: int,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.get_by_employee(
            db=db,
            employee_id=employee_id,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


# ============================================================
# GET ASSIGNMENTS BY PARCEL
# ============================================================

@router.get(
    "/parcel/{parcel_id}",
    response_model=list[DeliveryAssignmentResponse],
    status_code=status.HTTP_200_OK,
)
def get_assignments_by_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.get_by_parcel(
            db=db,
            parcel_id=parcel_id,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


# ============================================================
# UPDATE / REASSIGN
# ============================================================

@router.put(
    "/{assignment_id}",
    response_model=DeliveryAssignmentResponse,
    status_code=status.HTTP_200_OK,
)
def update_assignment(
    assignment_id: int,
    assignment_data: DeliveryAssignmentUpdate,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.update_assignment(
            db=db,
            assignment_id=assignment_id,
            assignment_data=assignment_data,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


# ============================================================
# UPDATE ASSIGNMENT STATUS
# ============================================================

@router.patch(
    "/{assignment_id}/status",
    response_model=DeliveryAssignmentResponse,
    status_code=status.HTTP_200_OK,
)
def update_assignment_status(
    assignment_id: int,
    status_data: DeliveryAssignmentStatusUpdate,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.update_status(
            db=db,
            assignment_id=assignment_id,
            status=status_data.status,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


# ============================================================
# CANCEL ASSIGNMENT
# ============================================================

@router.delete(
    "/{assignment_id}",
    response_model=DeliveryAssignmentResponse,
    status_code=status.HTTP_200_OK,
)
def cancel_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
):
    try:

        return DeliveryAssignmentService.cancel_assignment(
            db=db,
            assignment_id=assignment_id,
        )

    except LookupError as exc:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )