from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_parcels: int
    today_deliveries: int
    pending_deliveries: int
    completed_deliveries: int
    delayed_parcels: int
    active_employees: int

    high_risk_deliveries: int
    predicted_delays: int
    average_predicted_delay: float
    route_optimization_savings: float
    average_employee_performance: float