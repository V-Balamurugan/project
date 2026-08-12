export interface Parcel {
  id: number;
  tracking_number: string;

  sender: string;
  receiver: string;

  source_branch_id: number;
  destination_branch_id: number;

  source_address: string;
  destination_address: string;

  latitude: number;
  longitude: number;

  service_type: string;
  priority: string;

  weight: number;

  status: string;

  expected_delivery_time?: string | null;
  actual_delivery_time?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface ParcelCreate {
  tracking_number: string;
  sender: string;
  receiver: string;

  source_branch_id: number;
  destination_branch_id: number;

  source_address: string;
  destination_address: string;

  latitude: number;
  longitude: number;

  service_type: string;
  priority: string;

  weight: number;

  status: string;

  expected_delivery_time?: string | null;
}

export interface ParcelUpdate {
  sender?: string;
  receiver?: string;

  source_branch_id?: number;
  destination_branch_id?: number;

  source_address?: string;
  destination_address?: string;

  latitude?: number;
  longitude?: number;

  service_type?: string;
  priority?: string;

  weight?: number;

  status?: string;

  expected_delivery_time?: string | null;
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
  priority?: string;
  source_branch_id?: number;
  destination_branch_id?: number;
  page?: number;
  limit?: number;
}