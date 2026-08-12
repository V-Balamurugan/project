from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.schemas.parcel import (
    ParcelCreate,
    ParcelListResponse,
    ParcelResponse,
    ParcelUpdate,
)

from app.services.parcel_service import (
    ParcelService,
)


router = APIRouter(
    prefix="/api/parcels",
    tags=["Parcels"],
)


# ============================================================
# GET ALL PARCELS
# ============================================================

@router.get(
    "",
    response_model=ParcelListResponse,
    status_code=status.HTTP_200_OK,
)
def get_parcels(
    search: str | None = Query(
        default=None,
        max_length=100,
    ),

    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),

    priority: str | None = Query(
        default=None,
    ),

    source_branch_id: int | None = Query(
        default=None,
        gt=0,
    ),

    destination_branch_id: int | None = Query(
        default=None,
        gt=0,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    limit: int = Query(
        default=10,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),
):
    try:

        parcels, total = (
            ParcelService.get_parcels(
                db=db,
                search=search,
                status=status_filter,
                priority=priority,
                source_branch_id=source_branch_id,
                destination_branch_id=destination_branch_id,
                page=page,
                limit=limit,
            )
        )

        total_pages = (
            (total + limit - 1)
            // limit
            if total > 0
            else 1
        )

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "parcels": parcels,
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve parcels.",
        )


# ============================================================
# GET PARCEL BY TRACKING NUMBER
# ============================================================

@router.get(
    "/tracking/{tracking_number}",
    response_model=ParcelResponse,
    status_code=status.HTTP_200_OK,
)
def get_parcel_by_tracking_number(
    tracking_number: str,
    db: Session = Depends(get_db),
):

    try:

        return (
            ParcelService.get_by_tracking_number(
                db=db,
                tracking_number=tracking_number,
            )
        )

    except LookupError as error:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ============================================================
# GET PARCEL BY ID
# ============================================================

@router.get(
    "/{parcel_id}",
    response_model=ParcelResponse,
    status_code=status.HTTP_200_OK,
)
def get_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
):

    try:

        return (
            ParcelService.get_parcel_by_id(
                db=db,
                parcel_id=parcel_id,
            )
        )

    except LookupError as error:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ============================================================
# CREATE PARCEL
# ============================================================

@router.post(
    "",
    response_model=ParcelResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_parcel(
    parcel_data: ParcelCreate,
    db: Session = Depends(get_db),
):

    try:

        return (
            ParcelService.create_parcel(
                db=db,
                parcel_data=parcel_data,
            )
        )

    except LookupError as error:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create parcel.",
        )


# ============================================================
# UPDATE PARCEL
# ============================================================

@router.put(
    "/{parcel_id}",
    response_model=ParcelResponse,
    status_code=status.HTTP_200_OK,
)
def update_parcel(
    parcel_id: int,
    parcel_data: ParcelUpdate,
    db: Session = Depends(get_db),
):

    try:

        return (
            ParcelService.update_parcel(
                db=db,
                parcel_id=parcel_id,
                parcel_data=parcel_data,
            )
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

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update parcel.",
        )


# ============================================================
# UPDATE PARCEL STATUS
# ============================================================

@router.patch(
    "/{parcel_id}/status",
    response_model=ParcelResponse,
    status_code=status.HTTP_200_OK,
)
def update_parcel_status(
    parcel_id: int,

    new_status: str = Query(
        ...,
        min_length=2,
        max_length=30,
    ),

    db: Session = Depends(get_db),
):

    try:

        return (
            ParcelService.update_status(
                db=db,
                parcel_id=parcel_id,
                status=new_status,
            )
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

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update parcel status.",
        )


# ============================================================
# CANCEL PARCEL
# ============================================================

@router.delete(
    "/{parcel_id}",
    response_model=ParcelResponse,
    status_code=status.HTTP_200_OK,
)
def cancel_parcel(
    parcel_id: int,
    db: Session = Depends(get_db),
):

    try:

        return (
            ParcelService.cancel_parcel(
                db=db,
                parcel_id=parcel_id,
            )
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

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel parcel.",
        )