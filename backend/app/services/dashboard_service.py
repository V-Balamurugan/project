from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.parcel import Parcel


class DashboardService:

    @staticmethod
    def get_summary(db: Session):

        total_parcels = (
            db.query(func.count(Parcel.id))
            .scalar()
            or 0
        )

        active_employees = (
            db.query(func.count(Employee.id))
            .filter(Employee.status == "ACTIVE")
            .scalar()
            or 0
        )

        pending_deliveries = (
            db.query(func.count(Parcel.id))
            .filter(
                Parcel.status.in_([
                    "REGISTERED",
                    "PROCESSING",
                    "DISPATCHED",
                    "IN_TRANSIT",
                    "OUT_FOR_DELIVERY"
                ])
            )
            .scalar()
            or 0
        )

        completed_deliveries = (
            db.query(func.count(Parcel.id))
            .filter(Parcel.status == "DELIVERED")
            .scalar()
            or 0
        )

        delayed_parcels = (
            db.query(func.count(Parcel.id))
            .filter(Parcel.status == "DELAYED")
            .scalar()
            or 0
        )

        today = datetime.utcnow().date()

        today_deliveries = (
            db.query(func.count(Parcel.id))
            .filter(
                func.date(Parcel.created_at) == today
            )
            .scalar()
            or 0
        )

        average_performance = (
            db.query(func.avg(Employee.performance_score))
            .filter(Employee.status == "ACTIVE")
            .scalar()
            or 0
        )

        return {
            "total_parcels": total_parcels,
            "today_deliveries": today_deliveries,
            "pending_deliveries": pending_deliveries,
            "completed_deliveries": completed_deliveries,
            "delayed_parcels": delayed_parcels,

            "active_employees": active_employees,

            # AI modules are not implemented yet.
            # These remain zero until the AI module exists.
            "high_risk_deliveries": 0,
            "predicted_delays": 0,
            "average_predicted_delay": 0.0,
            "route_optimization_savings": 0.0,

            "average_employee_performance": round(
                float(average_performance),
                2
            )
        }