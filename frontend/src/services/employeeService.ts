import api from "./api";

import type {
  Employee,
  EmployeeCreate,
  EmployeeListResponse,
  EmployeeUpdate,
} from "../types/employee";

export interface EmployeeFilters {
  search?: string;
  status?: string;
  branch_id?: number;
  page?: number;
  limit?: number;
}

// ============================================================
// GET EMPLOYEES
// ============================================================

export const getEmployees = async (
  filters: EmployeeFilters = {}
): Promise<EmployeeListResponse> => {
  const params: Record<string, string | number> = {};

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.status) {
    params.status = filters.status;
  }

  if (filters.branch_id) {
    params.branch_id = filters.branch_id;
  }

  params.page = filters.page ?? 1;
  params.limit = filters.limit ?? 10;

  const response = await api.get<EmployeeListResponse>(
    "/api/employees",
    {
      params,
    }
  );

  return response.data;
};

// ============================================================
// GET EMPLOYEE BY ID
// ============================================================

export const getEmployee = async (
  employeeId: number
): Promise<Employee> => {
  const response = await api.get<Employee>(
    `/api/employees/${employeeId}`
  );

  return response.data;
};

// ============================================================
// CREATE EMPLOYEE
// ============================================================

export const createEmployee = async (
  employee: EmployeeCreate
): Promise<Employee> => {
  const response = await api.post<Employee>(
    "/api/employees",
    employee
  );

  return response.data;
};

// ============================================================
// UPDATE EMPLOYEE
// ============================================================

export const updateEmployee = async (
  employeeId: number,
  employee: EmployeeUpdate
): Promise<Employee> => {
  const response = await api.put<Employee>(
    `/api/employees/${employeeId}`,
    employee
  );

  return response.data;
};

// ============================================================
// DEACTIVATE EMPLOYEE
// Backend returns 204 No Content
// ============================================================

export const deactivateEmployee = async (
  employeeId: number
): Promise<void> => {
  await api.delete(
    `/api/employees/${employeeId}`
  );
};