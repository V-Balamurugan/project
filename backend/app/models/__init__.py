from app.models.branch import Branch
from app.models.employee import Employee
from app.models.parcel import Parcel
from app.models.vehicle import Vehicle
from app.models.delivery_assignment import DeliveryAssignment
from app.models.delivery_tracking import DeliveryTracking
from app.models.route_plan import RoutePlan
from app.models.parcel_journey import ParcelJourneyEvent

__all__ = [
    "Branch",
    "Employee",
    "Parcel",
    "Vehicle",
    "DeliveryAssignment",
    "DeliveryTracking",
    "RoutePlan",
    "ParcelJourneyEvent",
]