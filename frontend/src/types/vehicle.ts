export type VehicleType = "VAN" | "TRUCK" | "MOTORCYCLE" | "EV_VAN";
export type VehicleStatus = "AVAILABLE" | "ASSIGNED" | "LOADING" | "IN_TRANSIT" | "IDLE" | "MAINTENANCE";

export interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: VehicleType;
  capacity_kg: number;
  max_parcels: number;
  current_branch_id?: number | null;
  branch_name?: string | null;
  assigned_driver_id?: number | null;
  driver_name?: string | null;
  status: VehicleStatus;
  current_latitude?: number | null;
  current_longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  registration_number: string;
  vehicle_type: VehicleType;
  capacity_kg: number;
  max_parcels: number;
  current_branch_id?: number | null;
  assigned_driver_id?: number | null;
  status: VehicleStatus;
}

export interface VehicleUpdate {
  vehicle_type?: VehicleType;
  capacity_kg?: number;
  max_parcels?: number;
  current_branch_id?: number | null;
  assigned_driver_id?: number | null;
  status?: VehicleStatus;
  current_latitude?: number | null;
  current_longitude?: number | null;
}

export interface VehicleListResponse {
  total: number;
  vehicles: Vehicle[];
}
