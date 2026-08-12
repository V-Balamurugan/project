import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

import {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
} from "../services/employeeService";

import EmployeeForm from "../components/employee/EmployeeForm";
import EmployeeDetails from "../components/employee/EmployeeDetails";
import DeleteEmployeeModal from "../components/employee/DeleteEmployeeModal";

import type {
  Branch,
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
} from "../types/employee";

interface ApiErrorResponse {
  detail?: string;
}

const EmployeeManagement = () => {
  // ==========================================================
  // STATE
  // ==========================================================

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] =
    useState(true);

  const [formLoading, setFormLoading] =
    useState(false);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [branchError, setBranchError] =
    useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("");

  const [branchFilter, setBranchFilter] =
    useState("");

  const [page, setPage] = useState(1);

  const limit = 10;

  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] =
    useState(false);

  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [deleteEmployee, setDeleteEmployee] =
    useState<Employee | null>(null);

  // ==========================================================
  // ERROR MESSAGE HELPER
  // ==========================================================

  const getErrorMessage = (
    error: unknown,
    fallback: string
  ): string => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error
    ) {
      const response = (
        error as {
          response?: {
            data?: ApiErrorResponse;
          };
        }
      ).response;

      if (response?.data?.detail) {
        return response.data.detail;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  };

  // ==========================================================
  // LOAD BRANCHES
  // ==========================================================

  const loadBranches = useCallback(async () => {
    try {
      setBranchesLoading(true);
      setBranchError("");

      const response = await api.get(
        "/api/branches"
      );

      const data = response.data;

      /*
        Supported API responses:

        1. [
             {
               id: 1,
               branch_name: "Madurai"
             }
           ]

        2. {
             branches: [...]
           }

        3. {
             data: [...]
           }

        4. {
             items: [...]
           }
      */

      let branchList: unknown = data;

      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        if (
          "branches" in data &&
          Array.isArray(data.branches)
        ) {
          branchList = data.branches;
        } else if (
          "data" in data &&
          Array.isArray(data.data)
        ) {
          branchList = data.data;
        } else if (
          "items" in data &&
          Array.isArray(data.items)
        ) {
          branchList = data.items;
        }
      }

      if (!Array.isArray(branchList)) {
        throw new Error(
          "Invalid branch API response."
        );
      }

      // ======================================================
      // NORMALIZE BRANCH DATA
      // ======================================================

      const normalizedBranches: Branch[] = [];

      for (const item of branchList) {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          continue;
        }

        const branch =
          item as Record<string, unknown>;

        const id = Number(branch.id);

        const branchName =
          branch.branch_name ??
          branch.name ??
          branch.branchName;

        // Required fields
        if (
          !Number.isFinite(id) ||
          typeof branchName !== "string"
        ) {
          continue;
        }

        const normalizedBranch: Branch = {
          id: id,

          branch_name: branchName,

          branch_code:
            typeof branch.branch_code === "string"
              ? branch.branch_code
              : undefined,

          address:
            typeof branch.address === "string"
              ? branch.address
              : undefined,

          city:
            typeof branch.city === "string"
              ? branch.city
              : undefined,

          latitude:
            typeof branch.latitude === "number"
              ? branch.latitude
              : null,

          longitude:
            typeof branch.longitude === "number"
              ? branch.longitude
              : null,

          phone:
            typeof branch.phone === "string"
              ? branch.phone
              : undefined,

          status:
            typeof branch.status === "string"
              ? branch.status
              : undefined,
        };

        normalizedBranches.push(
          normalizedBranch
        );
      }

      setBranches(normalizedBranches);

      console.log(
        "Branches loaded:",
        normalizedBranches
      );
    } catch (error) {
      console.error(
        "Failed to load branches:",
        error
      );

      setBranches([]);

      setBranchError(
        getErrorMessage(
          error,
          "Failed to load branches."
        )
      );
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  // ==========================================================
  // LOAD EMPLOYEES
  // ==========================================================

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getEmployees({
        search:
          search.trim() || undefined,

        status:
          statusFilter || undefined,

        branch_id: branchFilter
          ? Number(branchFilter)
          : undefined,

        page: page,

        limit: limit,
      });

      setEmployees(
        Array.isArray(result.employees)
          ? result.employees
          : []
      );

      setTotal(
        Number(result.total) || 0
      );
    } catch (error) {
      console.error(
        "Failed to load employees:",
        error
      );

      setEmployees([]);

      setError(
        getErrorMessage(
          error,
          "Failed to load employees."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statusFilter,
    branchFilter,
    page,
  ]);

  // ==========================================================
  // INITIAL LOAD — BRANCHES
  // ==========================================================

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) {
        void loadBranches();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [loadBranches]);

  // ==========================================================
  // LOAD EMPLOYEES
  // ==========================================================

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        loadEmployees();
      },
      search.trim() ? 400 : 0
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadEmployees, search]);

  // ==========================================================
  // CREATE EMPLOYEE
  // ==========================================================

  const handleCreate = async (
    data: EmployeeCreate | EmployeeUpdate
  ) => {
    try {
      setFormLoading(true);

      await createEmployee(
        data as EmployeeCreate
      );

      setShowForm(false);
      setEditingEmployee(null);

      setPage(1);

      await loadEmployees();
    } catch (error) {
      console.error(
        "Create employee error:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Failed to create employee."
        )
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ==========================================================
  // UPDATE EMPLOYEE
  // ==========================================================

  const handleUpdate = async (
    data: EmployeeCreate | EmployeeUpdate
  ) => {
    if (!editingEmployee) {
      return;
    }

    try {
      setFormLoading(true);

      await updateEmployee(
        editingEmployee.id,
        data as EmployeeUpdate
      );

      setShowForm(false);
      setEditingEmployee(null);

      await loadEmployees();
    } catch (error) {
      console.error(
        "Update employee error:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Failed to update employee."
        )
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ==========================================================
  // DEACTIVATE EMPLOYEE
  // ==========================================================

  const handleDeactivate = async () => {
    if (!deleteEmployee) {
      return;
    }

    try {
      setDeleteLoading(true);
      setError("");

      console.log(
        "Deactivating employee:",
        deleteEmployee.id
      );

      await deactivateEmployee(
        deleteEmployee.id
      );

      /*
        Backend should return:

        204 No Content

        This is a successful response.
      */

      setDeleteEmployee(null);

      await loadEmployees();
    } catch (error) {
      console.error(
        "Deactivate employee error:",
        error
      );

      setError(
        getErrorMessage(
          error,
          "Failed to deactivate employee."
        )
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // ==========================================================
  // VIEW EMPLOYEE
  // ==========================================================

  const handleView = async (
    employeeId: number
  ) => {
    try {
      const employee =
        await getEmployee(employeeId);

      setSelectedEmployee(employee);
    } catch (error) {
      console.error(
        "Get employee error:",
        error
      );

      alert(
        getErrorMessage(
          error,
          "Failed to load employee details."
        )
      );
    }
  };

  // ==========================================================
  // OPEN ADD FORM
  // ==========================================================

  const openAddForm = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  // ==========================================================
  // OPEN EDIT FORM
  // ==========================================================

  const openEditForm = (
    employee: Employee
  ) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  // ==========================================================
  // GET BRANCH NAME
  // ==========================================================

  const getBranchName = (
    branchId: number
  ): string => {
    const branch = branches.find(
      (item) => item.id === branchId
    );

    if (branch) {
      return branch.branch_name;
    }

    return `Branch #${branchId}`;
  };

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];

    const start = Math.max(
      1,
      page - 2
    );

    const end = Math.min(
      totalPages,
      page + 2
    );

    for (
      let current = start;
      current <= end;
      current++
    ) {
      pages.push(current);
    }

    return pages;
  }, [page, totalPages]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6">

      {/* ====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employee Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage delivery employees, vehicles,
            locations and performance.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          disabled={
            branchesLoading ||
            branches.length === 0
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add Employee
        </button>
      </div>

      {/* ====================================================
          BRANCH ERROR
      ===================================================== */}

      {branchError && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 md:flex-row md:items-center md:justify-between">

          <span>
            {branchError}
          </span>

          <button
            type="button"
            onClick={loadBranches}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ====================================================
          FILTER BAR
      ===================================================== */}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          {/* Search */}
          <div className="relative">

            <span className="absolute left-3 top-2.5 text-gray-400">
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );

                setPage(1);
              }}
              placeholder="Search employees..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );

              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="">
              All Status
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>

          {/* Branch */}
          <select
            value={branchFilter}
            onChange={(event) => {
              setBranchFilter(
                event.target.value
              );

              setPage(1);
            }}
            disabled={branchesLoading}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {branchesLoading
                ? "Loading branches..."
                : "All Branches"}
            </option>

            {branches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.branch_name}
                </option>
              )
            )}
          </select>

        </div>
      </div>

      {/* ====================================================
          GENERAL ERROR
      ===================================================== */}

      {error && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={loadEmployees}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ====================================================
          EMPLOYEE TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

              <p className="mt-3 text-sm text-gray-500">
                Loading employees...
              </p>

            </div>
          </div>

        ) : employees.length === 0 ? (

          /* Empty */
          <div className="flex min-h-[400px] items-center justify-center p-6">

            <div className="text-center">

              <div className="text-5xl">
                👥
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No employees found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filters.
              </p>

            </div>
          </div>

        ) : (

          /* Table */
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px] text-left">

              <thead className="border-b bg-gray-50">

                <tr>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Employee
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Branch
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Vehicle
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Deliveries
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Performance
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {employees.map(
                  (employee) => (

                    <tr
                      key={employee.id}
                      className="transition hover:bg-gray-50"
                    >

                      {/* Employee */}
                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                            {employee.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>

                            <p className="font-medium text-gray-900">
                              {employee.name}
                            </p>

                            <p className="text-xs text-gray-500">
                              {employee.employee_code}
                            </p>

                            <p className="text-xs text-gray-400">
                              {employee.phone}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* Branch */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {getBranchName(
                          employee.branch_id
                        )}
                      </td>

                      {/* Vehicle */}
                      <td className="px-5 py-4">

                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          🚚{" "}
                          {employee.vehicle_type}
                        </span>

                      </td>

                      {/* Deliveries */}
                      <td className="px-5 py-4">

                        <p className="text-sm font-medium text-gray-800">
                          {
                            employee.completed_deliveries
                          }{" "}
                          /{" "}
                          {
                            employee.total_deliveries
                          }
                        </p>

                        <p className="text-xs text-gray-500">
                          {
                            employee.delayed_deliveries
                          }{" "}
                          delayed
                        </p>

                      </td>

                      {/* Performance */}
                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">

                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    employee.performance_score,
                                    0
                                  ),
                                  100
                                )}%`,
                              }}
                            />

                          </div>

                          <span className="text-xs font-medium text-gray-700">
                            {
                              employee.performance_score
                            }
                            %
                          </span>

                        </div>

                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            employee.status ===
                            "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {employee.status}
                        </span>

                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">

                        <div className="flex items-center gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              handleView(
                                employee.id
                              )
                            }
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                employee
                              )
                            }
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Edit
                          </button>

                          {employee.status ===
                            "ACTIVE" && (

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteEmployee(
                                  employee
                                )
                              }
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Deactivate
                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

        {/* ==================================================
            PAGINATION
        =================================================== */}

        {!loading &&
          employees.length > 0 && (

            <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-gray-500">

                Showing{" "}

                <span className="font-medium text-gray-800">
                  {(page - 1) * limit + 1}
                </span>

                {" - "}

                <span className="font-medium text-gray-800">
                  {Math.min(
                    page * limit,
                    total
                  )}
                </span>

                {" of "}

                <span className="font-medium text-gray-800">
                  {total}
                </span>

              </p>

              <div className="flex items-center gap-1">

                {/* Previous */}
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage(
                      (current) =>
                        current - 1
                    )
                  }
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                {/* Pages */}
                {pageNumbers.map(
                  (pageNumber) => (

                    <button
                      type="button"
                      key={pageNumber}
                      onClick={() =>
                        setPage(pageNumber)
                      }
                      className={`h-8 min-w-8 rounded-lg px-2 text-sm ${
                        pageNumber === page
                          ? "bg-blue-600 text-white"
                          : "border text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </button>

                  )
                )}

                {/* Next */}
                <button
                  type="button"
                  disabled={
                    page === totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>

              </div>

            </div>

          )}

      </div>

      {/* ====================================================
          ADD / EDIT FORM
      ===================================================== */}

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          branches={branches}
          loading={formLoading}
          onCancel={() => {

            if (!formLoading) {
              setShowForm(false);
              setEditingEmployee(null);
            }

          }}
          onSubmit={
            editingEmployee
              ? handleUpdate
              : handleCreate
          }
        />
      )}

      {/* ====================================================
          EMPLOYEE DETAILS
      ===================================================== */}

      {selectedEmployee && (
        <EmployeeDetails
          employee={selectedEmployee}
          branches={branches}
          onClose={() =>
            setSelectedEmployee(null)
          }
        />
      )}

      {/* ====================================================
          DEACTIVATE MODAL
      ===================================================== */}

      {deleteEmployee && (
        <DeleteEmployeeModal
          employeeName={
            deleteEmployee.name
          }
          loading={deleteLoading}
          onCancel={() => {

            if (!deleteLoading) {
              setDeleteEmployee(null);
            }

          }}
          onConfirm={
            handleDeactivate
          }
        />
      )}

    </div>
  );
};

export default EmployeeManagement;