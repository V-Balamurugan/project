export interface Employee {
  id: number;
  employee_code: string;
  name: string;
  phone: string;
  email: string;
  branch_id: number;
  vehicle_type: string;
  status: "ACTIVE" | "INACTIVE";
  current_latitude: number | null;
  current_longitude: number | null;
  total_deliveries: number;
  completed_deliveries: number;
  delayed_deliveries: number;
  average_delivery_time: number;
  performance_score: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  employee_code: string;
  name: string;
  phone: string;
  email: string;
  branch_id: number;
  vehicle_type: string;
  status: "ACTIVE" | "INACTIVE";
  current_latitude: number | null;
  current_longitude: number | null;
}

export interface EmployeeUpdate {
  name?: string;
  phone?: string;
  email?: string;
  branch_id?: number;
  vehicle_type?: string;
  status?: "ACTIVE" | "INACTIVE";
  current_latitude?: number | null;
  current_longitude?: number | null;
}

export interface EmployeeListResponse {
  total: number;
  page: number;
  limit: number;
  employees: Employee[];
}

export interface Branch {
  id: number;
  branch_code?: string;
  branch_name: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  status?: string;
}