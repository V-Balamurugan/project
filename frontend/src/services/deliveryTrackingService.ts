import api from "./api";

export type TrackingStatus =
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type VehicleMotionState =
  | "MOVING"
  | "TEMPORARILY_STOPPED"
  | "IDLE"
  | "LONG_IDLE";

export interface DeliveryTracking {
  id: number;
  parcel_id: number;
  assignment_id: number;
  employee_id: number;
  status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  location_name: string | null;
  remarks: string | null;
  timestamp: string;
  created_at: string;
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

export interface DynamicETA {
  parcel_id: number;
  assignment_id: number;
  remaining_distance_meters: number;
  current_speed_kmph: number;
  average_speed_kmph: number;
  is_stationary: boolean;
  speed_source: string;
  estimated_remaining_seconds: number;
  estimated_remaining_minutes: number;
  estimated_arrival_time: string;
  vehicle_status?: VehicleMotionState;
  idle_duration_minutes?: number;
  delay_warning?: boolean;
  route_plan_summary?: ActivePlanTrackingSummary | null;
}

export interface RoadRoute {
  parcel_id: number;
  assignment_id: number;
  current_latitude: number;
  current_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  distance_meters: number;
  duration_seconds: number;
  coordinates: [number, number][];
  current_speed_kmph?: number;
  average_speed_kmph?: number;
  is_stationary?: boolean;
  speed_source?: string;
  estimated_remaining_seconds?: number;
  estimated_remaining_minutes?: number;
  estimated_arrival_time?: string;
  is_route_deviated?: boolean;
  distance_from_route_meters?: number;
  deviation_threshold_meters?: number;
  route_recalculated?: boolean;
  vehicle_status?: VehicleMotionState;
  idle_duration_minutes?: number;
  delay_warning?: boolean;
  route_plan_summary?: ActivePlanTrackingSummary | null;
}


export interface RouteDeviationResponse {
  parcel_id: number;
  assignment_id: number;
  is_route_deviated: boolean;
  distance_from_route_meters: number;
  deviation_threshold_meters: number;
  route_recalculated: boolean;
  remaining_distance_meters: number;
  estimated_remaining_seconds: number;
  estimated_remaining_minutes: number;
  status_message: string;
  recalculated_route?: RoadRoute | null;
}

export interface IdleStatusResponse {
  parcel_id: number;
  assignment_id: number;
  vehicle_status: VehicleMotionState;
  is_idle: boolean;
  is_long_idle: boolean;
  idle_duration_seconds: number;
  idle_duration_minutes: number;
  idle_started_at: string | null;
  last_movement_at: string | null;
  current_speed_kmph: number;
  movement_distance_meters: number;
  stationary_radius_meters: number;
  status_description: string;
  delay_warning: boolean;
  estimated_delay_minutes: number;
}

export interface LocationUpdate {
  assignment_id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
  location_name?: string;
  remarks?: string;
}

export interface CreateTrackingEvent {
  parcel_id: number;
  assignment_id: number;
  employee_id: number;
  status: TrackingStatus;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  location_name?: string | null;
  remarks?: string | null;
}

export async function getTrackingByParcel(
  parcelId: number,
): Promise<DeliveryTracking[]> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}`,
  );
  return response.data;
}

export async function getLatestTracking(
  parcelId: number,
): Promise<DeliveryTracking> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}/latest`,
  );
  return response.data;
}

export async function getRoadRoute(
  parcelId: number,
  forceRecalculate: boolean = false,
  thresholdMeters: number = 150,
): Promise<RoadRoute> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}/route`,
    {
      params: {
        force_recalculate: forceRecalculate,
        threshold_meters: thresholdMeters,
      },
    },
  );
  return response.data;
}

export async function checkRouteDeviation(
  parcelId: number,
  thresholdMeters: number = 150,
): Promise<RouteDeviationResponse> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}/deviation`,
    {
      params: {
        threshold_meters: thresholdMeters,
      },
    },
  );
  return response.data;
}

export async function getIdleStatus(
  parcelId: number,
  minMovementMeters: number = 30,
  minMovingSpeed: number = 3,
): Promise<IdleStatusResponse> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}/idle-status`,
    {
      params: {
        min_movement_meters: minMovementMeters,
        min_moving_speed: minMovingSpeed,
      },
    },
  );
  return response.data;
}

export async function getDynamicETA(
  parcelId: number,
): Promise<DynamicETA> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}/eta`,
  );
  return response.data;
}

export async function updateLocation(
  data: LocationUpdate,
): Promise<DeliveryTracking> {
  const response = await api.post(
    "/api/delivery-tracking/location",
    data,
  );
  return response.data;
}

export async function createTrackingEvent(
  data: CreateTrackingEvent,
): Promise<DeliveryTracking> {
  const response = await api.post(
    "/api/delivery-tracking",
    data,
  );
  return response.data;
}