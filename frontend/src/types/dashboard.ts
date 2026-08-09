export interface DashboardSummary {
  total_parcels: number;
  today_deliveries: number;
  pending_deliveries: number;
  completed_deliveries: number;
  delayed_parcels: number;
  active_employees: number;

  high_risk_deliveries: number;
  predicted_delays: number;
  average_predicted_delay: number;
  route_optimization_savings: number;
  average_employee_performance: number;
}