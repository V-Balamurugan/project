from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.branch import (
    BranchCreate,
    BranchResponse,
    BranchUpdate,
)
from app.services.branch_service import BranchService


router = APIRouter(
    prefix="/api/branches",
    tags=["Branches"]
)


@router.post(
    "",
    response_model=BranchResponse,
    status_code=status.HTTP_201_CREATED
)
def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db)
):
    try:
        return BranchService.create_branch(
            db,
            branch_data
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc)
        )


@router.get(
    "",
    response_model=list[BranchResponse]
)
def get_branches(
    search: str | None = Query(
        default=None,
        min_length=1,
        max_length=100
    ),
    db: Session = Depends(get_db)
):
    return BranchService.get_branches(
        db,
        search
    )


@router.get(
    "/{branch_id}",
    response_model=BranchResponse
)
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db)
):
    branch = BranchService.get_branch_by_id(
        db,
        branch_id
    )

    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )

    return branch


@router.put(
    "/{branch_id}",
    response_model=BranchResponse
)
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db)
):
    try:
        branch = BranchService.update_branch(
            db,
            branch_id,
            branch_data
        )

        if not branch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Branch not found"
            )

        return branch

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc)
        )


@router.delete(
    "/{branch_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db)
):
    try:
        deleted = BranchService.delete_branch(
            db,
            branch_id
        )

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Branch not found"
            )

        return Response(
            status_code=status.HTTP_204_NO_CONTENT
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc)
        )