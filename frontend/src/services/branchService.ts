import api from "./api";
import type {
  Branch,
  BranchCreate,
  BranchUpdate,
} from "../types/branch";

export const getBranches = async (
  search?: string
): Promise<Branch[]> => {
  const response = await api.get<Branch[]>("/api/branches", {
    params: search ? { search } : {},
  });

  return response.data;
};

export const getBranchById = async (
  id: number
): Promise<Branch> => {
  const response = await api.get<Branch>(
    `/api/branches/${id}`
  );

  return response.data;
};

export const createBranch = async (
  branch: BranchCreate
): Promise<Branch> => {
  const response = await api.post<Branch>(
    "/api/branches",
    branch
  );

  return response.data;
};

export const updateBranch = async (
  id: number,
  branch: BranchUpdate
): Promise<Branch> => {
  const response = await api.put<Branch>(
    `/api/branches/${id}`,
    branch
  );

  return response.data;
};

export const deleteBranch = async (
  id: number
): Promise<void> => {
  await api.delete(`/api/branches/${id}`);
};