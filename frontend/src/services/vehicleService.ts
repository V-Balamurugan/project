import api from "./api";
import type {
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  VehicleListResponse,
} from "../types/vehicle";

export const getVehicles = async (params?: {
  branch_id?: number;
  status?: string;
  vehicle_type?: string;
  limit?: number;
  offset?: number;
}): Promise<VehicleListResponse> => {
  const response = await api.get<VehicleListResponse>("/api/vehicles", { params });
  return response.data;
};

export const getVehicleById = async (id: number): Promise<Vehicle> => {
  const response = await api.get<Vehicle>(`/api/vehicles/${id}`);
  return response.data;
};

export const createVehicle = async (data: VehicleCreate): Promise<Vehicle> => {
  const response = await api.post<Vehicle>("/api/vehicles", data);
  return response.data;
};

export const updateVehicle = async (id: number, data: VehicleUpdate): Promise<Vehicle> => {
  const response = await api.put<Vehicle>(`/api/vehicles/${id}`, data);
  return response.data;
};

export const updateVehicleLocation = async (
  id: number,
  lat: number,
  lon: number,
  status?: string
): Promise<Vehicle> => {
  const response = await api.post<Vehicle>(`/api/vehicles/${id}/location`, {
    latitude: lat,
    longitude: lon,
    status,
  });
  return response.data;
};

export const deleteVehicle = async (id: number): Promise<void> => {
  await api.delete(`/api/vehicles/${id}`);
};

export const vehicleService = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateLocation: updateVehicleLocation,
  deleteVehicle,
};
