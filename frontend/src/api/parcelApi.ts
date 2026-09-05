import api from "../services/api";
import type {
  Parcel,
  ParcelCreate,
  ParcelDetailResponse,
  ParcelFilters,
  ParcelListResponse,
  ParcelUpdate,
} from "../types/parcel";

export const getParcels = async (
  filters: ParcelFilters = {}
): Promise<ParcelListResponse> => {
  const params: Record<string, string | number> = {};

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.status) {
    params.status = filters.status;
  }
  if (filters.current_stage) {
    params.current_stage = filters.current_stage;
  }
  if (filters.priority) {
    params.priority = filters.priority;
  }
  if (filters.source_branch_id) {
    params.source_branch_id = filters.source_branch_id;
  }
  if (filters.destination_branch_id) {
    params.destination_branch_id = filters.destination_branch_id;
  }
  if (filters.current_branch_id) {
    params.current_branch_id = filters.current_branch_id;
  }

  params.page = filters.page ?? 1;
  params.limit = filters.limit ?? 10;

  const response = await api.get<ParcelListResponse>("/api/parcels", {
    params,
  });

  return response.data;
};

export const getParcelById = async (id: number): Promise<ParcelDetailResponse> => {
  const response = await api.get<ParcelDetailResponse>(`/api/parcels/${id}`);
  return response.data;
};

export const createParcel = async (
  parcel: ParcelCreate
): Promise<Parcel> => {
  const response = await api.post<Parcel>("/api/parcels", parcel);
  return response.data;
};

export const updateParcel = async (
  id: number,
  parcel: ParcelUpdate
): Promise<Parcel> => {
  const response = await api.put<Parcel>(`/api/parcels/${id}`, parcel);
  return response.data;
};

export const deleteParcel = async (id: number): Promise<void> => {
  await api.delete(`/api/parcels/${id}`);
};

// ============================================================
// 14-STAGE REALISTIC LIFECYCLE API CALLS
// ============================================================

// Stage 2: Assign Pickup
export const assignPickup = async (
  parcelId: number,
  employeeId: number,
  notes?: string
): Promise<Parcel> => {
  const response = await api.post<Parcel>(`/api/parcels/${parcelId}/assign-pickup`, {
    employee_id: employeeId,
    notes,
  });
  return response.data;
};

// Stage 3: Start Pickup
export const startPickup = async (parcelId: number): Promise<Parcel> => {
  const response = await api.post<Parcel>(`/api/parcels/${parcelId}/start-pickup`);
  return response.data;
};

// Stage 4: Confirm Pickup
export const confirmPickup = async (
  parcelId: number,
  remarks?: string
): Promise<Parcel> => {
  const response = await api.post<Parcel>(
    `/api/parcels/${parcelId}/confirm-pickup`,
    null,
    { params: { remarks } }
  );
  return response.data;
};

// Stage 5: Inbound to Sender Branch
export const startInbound = async (parcelId: number): Promise<Parcel> => {
  const response = await api.post<Parcel>(`/api/parcels/${parcelId}/start-inbound`);
  return response.data;
};

// Stage 6: Receive at Sender Branch Hub
export const receiveAtSenderBranch = async (
  parcelId: number,
  branchId: number,
  remarks?: string
): Promise<Parcel> => {
  const response = await api.post<Parcel>(
    `/api/parcels/${parcelId}/receive-at-sender-branch`,
    { branch_id: branchId, remarks }
  );
  return response.data;
};

// Stage 7: Prepare Inter-City
export const prepareIntercity = async (parcelId: number): Promise<Parcel> => {
  const response = await api.post<Parcel>(`/api/parcels/${parcelId}/prepare-intercity`);
  return response.data;
};

// Stage 8: Assign Inter-City Vehicle (Batch or Single)
export const assignIntercityVehicle = async (
  parcelIds: number[],
  vehicleId: number,
  driverEmployeeId?: number,
  notes?: string
): Promise<Parcel[]> => {
  const response = await api.post<Parcel[]>("/api/parcels/intercity/assign-vehicle", {
    parcel_ids: parcelIds,
    vehicle_id: vehicleId,
    driver_employee_id: driverEmployeeId,
    notes,
  });
  return response.data;
};

// Stage 9: Start Inter-City Transit
export const startIntercityTransit = async (parcelId: number): Promise<Parcel> => {
  const response = await api.post<Parcel>(
    `/api/parcels/${parcelId}/start-intercity-transit`
  );
  return response.data;
};

// Stage 10: Receive at Receiver Branch Hub
export const receiveAtReceiverBranch = async (
  parcelId: number,
  branchId: number,
  remarks?: string
): Promise<Parcel> => {
  const response = await api.post<Parcel>(
    `/api/parcels/${parcelId}/receive-at-receiver-branch`,
    { branch_id: branchId, remarks }
  );
  return response.data;
};

// Stage 11: Prepare Last-Mile Delivery
export const prepareLastMile = async (parcelId: number): Promise<Parcel> => {
  const response = await api.post<Parcel>(`/api/parcels/${parcelId}/prepare-last-mile`);
  return response.data;
};

// Stage 12: Assign Last-Mile Delivery Boy
export const assignLastMile = async (
  parcelId: number,
  employeeId: number,
  notes?: string
): Promise<Parcel> => {
  const response = await api.post<Parcel>(`/api/parcels/${parcelId}/assign-last-mile`, {
    employee_id: employeeId,
    notes,
  });
  return response.data;
};

// Stage 14: Confirm Delivery (POD)
export const confirmDelivery = async (
  parcelId: number,
  recipientName?: string,
  otpCode?: string,
  remarks?: string
): Promise<Parcel> => {
  const response = await api.post<Parcel>(
    `/api/parcels/${parcelId}/confirm-delivery`,
    {
      recipient_name: recipientName,
      otp_code: otpCode,
      remarks,
    }
  );
  return response.data;
};