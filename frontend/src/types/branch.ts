export interface Branch {
  id: number;
  branch_code: string;
  branch_name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BranchCreate {
  branch_code: string;
  branch_name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  status: string;
}

export interface BranchUpdate {
  branch_code?: string;
  branch_name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  status?: string;
}