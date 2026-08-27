import api from "./api";

// ============================================================
// TYPES
// ============================================================

export interface DeliveryAssignment {
  id: number;
  assignment_code: string;
  parcel_id: number;
  employee_id: number;
  status: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAssignmentCreate {
  parcel_id: number;
  employee_id: number;
  notes?: string | null;
}

export interface DeliveryAssignmentUpdate {
  employee_id?: number | null;
  notes?: string | null;
}

export interface DeliveryAssignmentStatusUpdate {
  status: string;
}

export interface DeliveryAssignmentListResponse {
  items: DeliveryAssignment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================================
// GET ALL ASSIGNMENTS
// ============================================================

export const getDeliveryAssignments = async (
  search?: string,
  status?: string,
  employeeId?: number,
  parcelId?: number,
  page: number = 1,
  limit: number = 10
): Promise<DeliveryAssignmentListResponse> => {
  const response = await api.get(
    "/api/delivery-assignments",
    {
      params: {
        search: search || undefined,
        status: status || undefined,
        employee_id: employeeId || undefined,
        parcel_id: parcelId || undefined,
        page,
        limit,
      },
    }
  );

  return response.data;
};

// ============================================================
// GET ASSIGNMENT BY ID
// ============================================================

export const getDeliveryAssignmentById = async (
  assignmentId: number
): Promise<DeliveryAssignment> => {
  const response = await api.get(
    `/api/delivery-assignments/${assignmentId}`
  );

  return response.data;
};

// ============================================================
// CREATE ASSIGNMENT
// ============================================================

export const createDeliveryAssignment = async (
  data: DeliveryAssignmentCreate
): Promise<DeliveryAssignment> => {
  const response = await api.post(
    "/api/delivery-assignments",
    data
  );

  return response.data;
};

// ============================================================
// UPDATE / REASSIGN
// ============================================================

export const updateDeliveryAssignment = async (
  assignmentId: number,
  data: DeliveryAssignmentUpdate
): Promise<DeliveryAssignment> => {
  const response = await api.put(
    `/api/delivery-assignments/${assignmentId}`,
    data
  );

  return response.data;
};

// ============================================================
// UPDATE STATUS
// ============================================================

export const updateDeliveryAssignmentStatus = async (
  assignmentId: number,
  data: DeliveryAssignmentStatusUpdate
): Promise<DeliveryAssignment> => {
  const response = await api.patch(
    `/api/delivery-assignments/${assignmentId}/status`,
    data
  );

  return response.data;
};

// ============================================================
// CANCEL ASSIGNMENT
// ============================================================

export const cancelDeliveryAssignment = async (
  assignmentId: number
): Promise<DeliveryAssignment> => {
  const response = await api.delete(
    `/api/delivery-assignments/${assignmentId}`
  );

  return response.data;
};

// ============================================================
// GET ASSIGNMENTS BY EMPLOYEE
// ============================================================

export const getAssignmentsByEmployee = async (
  employeeId: number
): Promise<DeliveryAssignment[]> => {
  const response = await api.get(
    `/api/delivery-assignments/employee/${employeeId}`
  );

  return response.data;
};

// ============================================================
// GET ASSIGNMENTS BY PARCEL
// ============================================================

export const getAssignmentsByParcel = async (
  parcelId: number
): Promise<DeliveryAssignment[]> => {
  const response = await api.get(
    `/api/delivery-assignments/parcel/${parcelId}`
  );

  return response.data;
};