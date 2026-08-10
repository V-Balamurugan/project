from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeUpdate,
)
from app.services.employee_service import EmployeeService


router = APIRouter(
    prefix="/api/employees",
    tags=["Employees"]
)


# ============================================================
# GET ALL EMPLOYEES
# ============================================================

@router.get(
    "",
    response_model=EmployeeListResponse,
    status_code=status.HTTP_200_OK
)
def get_employees(
    search: str | None = Query(
        default=None
    ),

    status_filter: str | None = Query(
        default=None,
        alias="status"
    ),

    branch_id: int | None = Query(
        default=None,
        gt=0
    ),

    page: int = Query(
        default=1,
        ge=1
    ),

    limit: int = Query(
        default=10,
        ge=1,
        le=100
    ),

    db: Session = Depends(get_db)
):

    try:

        result = EmployeeService.get_employees(
            db=db,
            search=search,
            status=status_filter,
            branch_id=branch_id,
            page=page,
            limit=limit
        )

        return result

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve employees"
        )


# ============================================================
# CREATE EMPLOYEE
# ============================================================

@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db)
):

    try:

        employee = EmployeeService.create_employee(
            db=db,
            employee_data=employee_data
        )

        return employee

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error)
        )

    except LookupError as error:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create employee"
        )


# ============================================================
# GET EMPLOYEE BY ID
# ============================================================

@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db)
):

    try:

        employee = EmployeeService.get_employee_by_id(
            db=db,
            employee_id=employee_id
        )

        if not employee:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )

        return employee

    except HTTPException:
        raise

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve employee"
        )


# ============================================================
# UPDATE EMPLOYEE
# ============================================================

@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK
)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db)
):

    try:

        employee = EmployeeService.update_employee(
            db=db,
            employee_id=employee_id,
            employee_data=employee_data
        )

        return employee

    except LookupError as error:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )

    except ValueError as error:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error)
        )

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update employee"
        )


# ============================================================
# DELETE / DEACTIVATE EMPLOYEE
# ============================================================

@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db)
):

    try:

        EmployeeService.deactivate_employee(
            db=db,
            employee_id=employee_id
        )

        return None

    except LookupError as error:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate employee"
        )