from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.models.branch import Branch
from app.models.employee import Employee
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse, VehicleListResponse


class VehicleService:

    @staticmethod
    def _to_response(v: Vehicle, db: Session) -> VehicleResponse:
        b = db.query(Branch).filter(Branch.id == v.current_branch_id).first() if v.current_branch_id else None
        e = db.query(Employee).filter(Employee.id == v.assigned_driver_id).first() if v.assigned_driver_id else None

        return VehicleResponse(
            id=v.id,
            registration_number=v.registration_number,
            vehicle_type=v.vehicle_type,
            capacity_kg=v.capacity_kg,
            max_parcels=v.max_parcels,
            current_branch_id=v.current_branch_id,
            branch_name=b.branch_name if b else None,
            assigned_driver_id=v.assigned_driver_id,
            driver_name=e.name if e else None,
            status=v.status,
            current_latitude=v.current_latitude,
            current_longitude=v.current_longitude,
            created_at=v.created_at,
            updated_at=v.updated_at,
        )

    @staticmethod
    def get_vehicles(
        db: Session,
        branch_id: int | None = None,
        status: str | None = None,
        vehicle_type: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> VehicleListResponse:
        query = db.query(Vehicle)
        if branch_id:
            query = query.filter(Vehicle.current_branch_id == branch_id)
        if status:
            query = query.filter(Vehicle.status == status.upper())
        if vehicle_type:
            query = query.filter(Vehicle.vehicle_type == vehicle_type.upper())

        total = query.count()
        vehicles = query.order_by(Vehicle.id.asc()).offset(offset).limit(limit).all()

        return VehicleListResponse(
            total=total,
            vehicles=[VehicleService._to_response(v, db) for v in vehicles],
        )

    @staticmethod
    def get_vehicle_by_id(db: Session, vehicle_id: int) -> VehicleResponse:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise LookupError(f"Vehicle #{vehicle_id} not found.")
        return VehicleService._to_response(vehicle, db)

    @staticmethod
    def create_vehicle(db: Session, data: VehicleCreate) -> VehicleResponse:
        existing = db.query(Vehicle).filter(Vehicle.registration_number == data.registration_number.strip().upper()).first()
        if existing:
            raise ValueError(f"Vehicle with registration number '{data.registration_number}' already exists.")

        vehicle = Vehicle(
            registration_number=data.registration_number.strip().upper(),
            vehicle_type=data.vehicle_type.upper(),
            capacity_kg=data.capacity_kg,
            max_parcels=data.max_parcels,
            current_branch_id=data.current_branch_id,
            assigned_driver_id=data.assigned_driver_id,
            status=data.status.upper(),
            current_latitude=data.current_latitude,
            current_longitude=data.current_longitude,
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
        return VehicleService._to_response(vehicle, db)

    @staticmethod
    def update_vehicle(db: Session, vehicle_id: int, data: VehicleUpdate) -> VehicleResponse:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise LookupError(f"Vehicle #{vehicle_id} not found.")

        for key, val in data.model_dump(exclude_unset=True).items():
            if val is not None:
                setattr(vehicle, key, val)

        db.commit()
        db.refresh(vehicle)
        return VehicleService._to_response(vehicle, db)

    @staticmethod
    def update_vehicle_location(
        db: Session, vehicle_id: int, lat: float, lon: float, status: str | None = None
    ) -> VehicleResponse:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise LookupError(f"Vehicle #{vehicle_id} not found.")

        vehicle.current_latitude = lat
        vehicle.current_longitude = lon
        if status:
            vehicle.status = status.upper()

        db.commit()
        db.refresh(vehicle)
        return VehicleService._to_response(vehicle, db)

    @staticmethod
    def delete_vehicle(db: Session, vehicle_id: int) -> None:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise LookupError(f"Vehicle #{vehicle_id} not found.")
        db.delete(vehicle)
        db.commit()
