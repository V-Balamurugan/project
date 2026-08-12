import api from "../services/api";
import type {
  Parcel,
  ParcelCreate,
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
  if (filters.priority) {
    params.priority = filters.priority;
  }
  if (filters.source_branch_id) {
    params.source_branch_id = filters.source_branch_id;
  }
  if (filters.destination_branch_id) {
    params.destination_branch_id = filters.destination_branch_id;
  }

  params.page = filters.page ?? 1;
  params.limit = filters.limit ?? 10;

  const response = await api.get<ParcelListResponse>("/api/parcels", {
    params,
  });

  return response.data;
};

export const getParcelById = async (id: number): Promise<Parcel> => {
  const response = await api.get<Parcel>(`/api/parcels/${id}`);
  return response.data;
};

export const getParcelByTrackingNumber = async (
  trackingNumber: string
): Promise<Parcel> => {
  const response = await api.get<Parcel>(
    `/api/parcels/tracking/${trackingNumber}`
  );
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

export const updateParcelStatus = async (
  id: number,
  status: string
): Promise<Parcel> => {
  const response = await api.patch<Parcel>(`/api/parcels/${id}/status`, null, {
    params: { new_status: status },
  });
  return response.data;
};

export const deleteParcel = async (id: number): Promise<void> => {
  await api.delete(`/api/parcels/${id}`);
};