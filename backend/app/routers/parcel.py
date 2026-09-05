from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.parcel import (
    ParcelCreate,
    ParcelUpdate,
    ParcelResponse,
    ParcelDetailResponse,
    ParcelListResponse,
    AssignPickupRequest,
    ReceiveAtBranchRequest,
    InterCityTransportRequest,
    AssignLastMileRequest,
    ConfirmDeliveryRequest,
)
from app.services.parcel_service import ParcelService

router = APIRouter(
    prefix="/api/parcels",
    tags=["Parcels & 14-Stage Lifecycle"],
)


@router.get("", response_model=ParcelListResponse)
def get_parcels(
    search: str | None = Query(default=None, max_length=100),
    status: str | None = None,
    current_stage: str | None = None,
    priority: str | None = None,
    source_branch_id: int | None = Query(default=None, gt=0),
    destination_branch_id: int | None = Query(default=None, gt=0),
    current_branch_id: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    try:
        return ParcelService.get_parcels(
            db=db,
            search=search,
            status=status,
            current_stage=current_stage,
            priority=priority,
            source_branch_id=source_branch_id,
            destination_branch_id=destination_branch_id,
            current_branch_id=current_branch_id,
            page=page,
            limit=limit,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve parcels: {str(e)}",
        )


@router.get("/{parcel_id}", response_model=ParcelDetailResponse)
def get_parcel(parcel_id: int, db: Session = Depends(get_db)):
    try:
        return ParcelService.get_parcel_by_id(db=db, parcel_id=parcel_id)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.post("", response_model=ParcelResponse, status_code=status.HTTP_201_CREATED)
def create_parcel(parcel_data: ParcelCreate, db: Session = Depends(get_db)):
    try:
        parcel = ParcelService.create_parcel(db=db, data=parcel_data)
        return ParcelService._to_response(parcel, db)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.put("/{parcel_id}", response_model=ParcelResponse)
def update_parcel(
    parcel_id: int, parcel_data: ParcelUpdate, db: Session = Depends(get_db)
):
    try:
        return ParcelService.update_parcel(db=db, parcel_id=parcel_id, data=parcel_data)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.delete("/{parcel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_parcel(parcel_id: int, db: Session = Depends(get_db)):
    try:
        ParcelService.delete_parcel(db=db, parcel_id=parcel_id)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


# ============================================================
# 14-STAGE REALISTIC LIFECYCLE ENDPOINTS
# ============================================================

# Stage 2: Assign Pickup Rider
@router.post("/{parcel_id}/assign-pickup", response_model=ParcelResponse)
def assign_pickup(
    parcel_id: int, payload: AssignPickupRequest, db: Session = Depends(get_db)
):
    try:
        return ParcelService.assign_pickup_employee(
            db=db,
            parcel_id=parcel_id,
            employee_id=payload.employee_id,
            notes=payload.notes,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 3: Start Pickup
@router.post("/{parcel_id}/start-pickup", response_model=ParcelResponse)
def start_pickup(parcel_id: int, db: Session = Depends(get_db)):
    try:
        return ParcelService.start_pickup(db=db, parcel_id=parcel_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 4: Confirm Pickup
@router.post("/{parcel_id}/confirm-pickup", response_model=ParcelResponse)
def confirm_pickup(
    parcel_id: int, remarks: str | None = None, db: Session = Depends(get_db)
):
    try:
        return ParcelService.confirm_pickup(db=db, parcel_id=parcel_id, remarks=remarks)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 5: Inbound to Sender Branch
@router.post("/{parcel_id}/start-inbound", response_model=ParcelResponse)
def start_inbound(parcel_id: int, db: Session = Depends(get_db)):
    try:
        return ParcelService.start_inbound_transfer(db=db, parcel_id=parcel_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 6: Receive at Sender Branch
@router.post("/{parcel_id}/receive-at-sender-branch", response_model=ParcelResponse)
def receive_at_sender_branch(
    parcel_id: int, payload: ReceiveAtBranchRequest, db: Session = Depends(get_db)
):
    try:
        return ParcelService.receive_at_sender_branch(
            db=db, parcel_id=parcel_id, branch_id=payload.branch_id
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 7: Prepare Intercity
@router.post("/{parcel_id}/prepare-intercity", response_model=ParcelResponse)
def prepare_intercity(parcel_id: int, db: Session = Depends(get_db)):
    try:
        return ParcelService.prepare_intercity_transport(db=db, parcel_id=parcel_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 8: Assign Intercity Vehicle
@router.post("/intercity/assign-vehicle", response_model=list[ParcelResponse])
def assign_intercity_vehicle(
    payload: InterCityTransportRequest, db: Session = Depends(get_db)
):
    try:
        results = []
        for p_id in payload.parcel_ids:
            res = ParcelService.assign_intercity_vehicle(
                db=db,
                parcel_id=p_id,
                vehicle_id=payload.vehicle_id,
                driver_id=payload.driver_employee_id,
            )
            results.append(res)
        return results
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 9: Start Intercity Transit
@router.post("/{parcel_id}/start-intercity-transit", response_model=ParcelResponse)
def start_intercity_transit(parcel_id: int, db: Session = Depends(get_db)):
    try:
        return ParcelService.start_intercity_transit(db=db, parcel_id=parcel_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 10: Receive at Receiver Branch
@router.post("/{parcel_id}/receive-at-receiver-branch", response_model=ParcelResponse)
def receive_at_receiver_branch(
    parcel_id: int, payload: ReceiveAtBranchRequest, db: Session = Depends(get_db)
):
    try:
        return ParcelService.receive_at_receiver_branch(
            db=db, parcel_id=parcel_id, branch_id=payload.branch_id
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 11: Prepare Last-Mile Delivery
@router.post("/{parcel_id}/prepare-last-mile", response_model=ParcelResponse)
def prepare_last_mile(parcel_id: int, db: Session = Depends(get_db)):
    try:
        return ParcelService.prepare_last_mile(db=db, parcel_id=parcel_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 12: Assign Last-Mile Courier
@router.post("/{parcel_id}/assign-last-mile", response_model=ParcelResponse)
def assign_last_mile(
    parcel_id: int, payload: AssignLastMileRequest, db: Session = Depends(get_db)
):
    try:
        return ParcelService.assign_last_mile_delivery(
            db=db,
            parcel_id=parcel_id,
            employee_id=payload.employee_id,
            notes=payload.notes,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Stage 14: Confirm Final Delivery (POD)
@router.post("/{parcel_id}/confirm-delivery", response_model=ParcelResponse)
def confirm_delivery(
    parcel_id: int, payload: ConfirmDeliveryRequest, db: Session = Depends(get_db)
):
    try:
        return ParcelService.confirm_delivery(
            db=db,
            parcel_id=parcel_id,
            recipient_name=payload.recipient_name,
            otp_code=payload.otp_code,
            remarks=payload.remarks,
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))