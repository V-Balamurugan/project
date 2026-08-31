import api from "./api";

export type TrackingStatus =
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

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
): Promise<RoadRoute> {
  const response = await api.get(
    `/api/delivery-tracking/parcel/${parcelId}/route`,
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