export type JourneyStage =
  | "CREATED"
  | "PICKUP_ASSIGNED"
  | "PICKUP_IN_PROGRESS"
  | "PICKED_UP"
  | "INBOUND_TO_SENDER_BRANCH"
  | "AT_SENDER_BRANCH"
  | "READY_FOR_INTERCITY_TRANSPORT"
  | "INTERCITY_ASSIGNED"
  | "IN_INTERCITY_TRANSIT"
  | "AT_RECEIVER_BRANCH"
  | "READY_FOR_LAST_MILE_DELIVERY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface JourneyHistoryEvent {
  id: number;
  parcel_id: number;
  stage: JourneyStage;
  stage_title: string;
  branch_id?: number | null;
  branch_name?: string | null;
  employee_id?: number | null;
  employee_name?: string | null;
  vehicle_id?: number | null;
  vehicle_reg?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  remarks?: string | null;
  timestamp: string;
}

export interface Parcel {
  id: number;
  tracking_number: string;
  sender: string;
  sender_phone?: string | null;
  receiver: string;
  receiver_phone?: string | null;
  source_branch_id: number;
  source_branch_name?: string | null;
  destination_branch_id: number;
  destination_branch_name?: string | null;
  source_address: string;
  destination_address: string;
  sender_latitude: number;
  sender_longitude: number;
  receiver_latitude: number;
  receiver_longitude: number;
  latitude: number;
  longitude: number;
  service_type: string;
  priority: string;
  weight: number;
  status: string;
  current_stage: JourneyStage;
  current_branch_id?: number | null;
  current_branch_name?: string | null;
  current_vehicle_id?: number | null;
  current_vehicle_reg?: string | null;
  current_employee_id?: number | null;
  current_employee_name?: string | null;
  expected_delivery_time?: string | null;
  actual_delivery_time?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ParcelCreate {
  tracking_number: string;
  sender: string;
  sender_phone?: string | null;
  receiver: string;
  receiver_phone?: string | null;
  source_branch_id: number;
  destination_branch_id: number;
  source_address: string;
  destination_address: string;
  sender_latitude?: number;
  sender_longitude?: number;
  receiver_latitude?: number;
  receiver_longitude?: number;
  latitude?: number;
  longitude?: number;
  service_type?: string;
  priority?: string;
  weight: number;
  status?: string;
  expected_delivery_time?: string | null;
}

export interface ParcelUpdate {
  sender?: string;
  sender_phone?: string | null;
  receiver?: string;
  receiver_phone?: string | null;
  source_branch_id?: number;
  destination_branch_id?: number;
  source_address?: string;
  destination_address?: string;
  sender_latitude?: number;
  sender_longitude?: number;
  receiver_latitude?: number;
  receiver_longitude?: number;
  latitude?: number;
  longitude?: number;
  service_type?: string;
  priority?: string;
  weight?: number;
  status?: string;
  current_stage?: JourneyStage;
  current_branch_id?: number | null;
  current_vehicle_id?: number | null;
  current_employee_id?: number | null;
  expected_delivery_time?: string | null;
}

export interface ParcelDetailResponse extends Parcel {
  journey_history: JourneyHistoryEvent[];
}

export interface ParcelListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  parcels: Parcel[];
}

export interface ParcelFilters {
  search?: string;
  status?: string;
  current_stage?: string;
  priority?: string;
  source_branch_id?: number;
  destination_branch_id?: number;
  current_branch_id?: number;
  page?: number;
  limit?: number;
}