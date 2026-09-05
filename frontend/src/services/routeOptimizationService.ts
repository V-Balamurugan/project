import api from "./api";

export type StopStatus = "PENDING" | "COMPLETED" | "SKIPPED";
export type PlanStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type OptimizationAlgorithm = "PRIORITY_TSP" | "SHORTEST_DISTANCE" | "DEADLINE_FIRST";

export interface RouteStopDetail {
  stop_number: number;
  parcel_id: number;
  assignment_id?: number | null;
  tracking_number: string;
  receiver: string;
  destination_address: string;
  latitude: number;
  longitude: number;
  priority: string;
  weight: number;
  status: StopStatus;
  distance_from_prev_meters: number;
  duration_from_prev_seconds: number;
  completed_at?: string | null;
}

export interface OptimizeRouteRequest {
  employee_id: number;
  start_branch_id?: number | null;
  parcel_ids: number[];
  algorithm?: OptimizationAlgorithm;
  include_return_to_depot?: boolean;
}

export interface RoutePlanResponse {
  id: number;
  plan_code: string;
  employee_id: number;
  employee_name?: string | null;
  start_branch_id: number;
  start_branch_name?: string | null;
  start_latitude: number;
  start_longitude: number;
  total_distance_meters: number;
  total_duration_seconds: number;
  total_stops_count: number;
  completed_stops_count: number;
  status: PlanStatus;
  algorithm_used: string;
  stops: RouteStopDetail[];
  polyline_coordinates: [number, number][];
  active_stop?: RouteStopDetail | null;
  created_at: string;
  updated_at: string;
}

export interface ActivePlanTrackingSummary {
  route_plan_id: number;
  plan_code: string;
  total_stops: number;
  completed_stops: number;
  current_stop_number?: number | null;
  current_stop_parcel_id?: number | null;
  current_stop_destination?: string | null;
  is_on_optimized_route: boolean;
  distance_from_planned_route_meters: number;
  plan_status: string;
}

export async function optimizeRoute(
  data: OptimizeRouteRequest
): Promise<RoutePlanResponse> {
  const response = await api.post("/api/route-optimization/optimize", data);
  return response.data;
}

export async function listRoutePlans(params?: {
  employee_id?: number;
  status?: string;
  limit?: number;
}): Promise<RoutePlanResponse[]> {
  const response = await api.get("/api/route-optimization/plans", { params });
  return response.data;
}

export async function getRoutePlan(
  planId: number
): Promise<RoutePlanResponse> {
  const response = await api.get(`/api/route-optimization/plans/${planId}`);
  return response.data;
}

export async function getActivePlanForEmployee(
  employeeId: number
): Promise<RoutePlanResponse | null> {
  const response = await api.get(
    `/api/route-optimization/employee/${employeeId}/active`
  );
  return response.data;
}

export async function getActivePlanForParcel(
  parcelId: number
): Promise<RoutePlanResponse | null> {
  const response = await api.get(
    `/api/route-optimization/parcel/${parcelId}/active`
  );
  return response.data;
}

export async function startRoutePlan(
  planId: number
): Promise<RoutePlanResponse> {
  const response = await api.post(`/api/route-optimization/plans/${planId}/start`);
  return response.data;
}

export async function completeStop(
  planId: number,
  parcelId: number
): Promise<RoutePlanResponse> {
  const response = await api.post(
    `/api/route-optimization/plans/${planId}/stops/${parcelId}/complete`
  );
  return response.data;
}
