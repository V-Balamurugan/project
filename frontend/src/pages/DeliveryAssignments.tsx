import React, { useCallback, useEffect, useState } from "react";
import { getParcels } from "../api/parcelApi";
import CreateAssignmentModal from "../components/delivery/CreateAssignmentModal";
import EditAssignmentModal from "../components/delivery/EditAssignmentModal";
import { getBranches } from "../services/branchService";
import {
  cancelDeliveryAssignment,
  getDeliveryAssignments,
  updateDeliveryAssignmentStatus,
  type DeliveryAssignment,
} from "../services/deliveryAssignmentService";
import { getEmployees } from "../services/employeeService";
import type { Branch } from "../types/branch";
import type { Employee } from "../types/employee";
import type { Parcel } from "../types/parcel";

const STATUS_OPTIONS = [
  "ALL",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const DeliveryAssignments: React.FC = () => {
  // ============================================================
  // DATA
  // ============================================================
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [parcelsMap, setParcelsMap] = useState<Record<number, Parcel>>({});
  const [employeesMap, setEmployeesMap] = useState<Record<number, Employee>>({});
  const [branchesMap, setBranchesMap] = useState<Record<number, Branch>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // ============================================================
  // SEARCH / FILTERS
  // ============================================================
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [employeeId, setEmployeeId] = useState("");
  const [parcelId, setParcelId] = useState("");

  // ============================================================
  // PAGINATION
  // ============================================================
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ============================================================
  // MODALS STATE
  // ============================================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editAssignment, setEditAssignment] =
    useState<DeliveryAssignment | null>(null);
  const [detailAssignment, setDetailAssignment] =
    useState<DeliveryAssignment | null>(null);

  // Status Modal
  const [statusAssignment, setStatusAssignment] =
    useState<DeliveryAssignment | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState("");

  // ============================================================
  // FETCH LOOKUP DATA (Parcels, Employees, Branches)
  // ============================================================
  const fetchLookupData = useCallback(async () => {
    try {
      const [parcelsRes, employeesRes, branchesRes] = await Promise.all([
        getParcels({ limit: 100 }),
        getEmployees({ limit: 100 }),
        getBranches(),
      ]);

      const pMap: Record<number, Parcel> = {};
      (parcelsRes.parcels || []).forEach((p) => {
        pMap[p.id] = p;
      });
      setParcelsMap(pMap);

      const eMap: Record<number, Employee> = {};
      (employeesRes.employees || []).forEach((e) => {
        eMap[e.id] = e;
      });
      setEmployeesMap(eMap);

      const bMap: Record<number, Branch> = {};
      (branchesRes || []).forEach((b) => {
        bMap[b.id] = b;
      });
      setBranchesMap(bMap);
    } catch (err) {
      console.error("Failed to load lookup data:", err);
    }
  }, []);

  useEffect(() => {
    fetchLookupData();
  }, [fetchLookupData]);

  // ============================================================
  // FETCH ASSIGNMENTS
  // ============================================================
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const employeeIdNumber = employeeId ? Number(employeeId) : undefined;
      const parcelIdNumber = parcelId ? Number(parcelId) : undefined;

      const response = await getDeliveryAssignments(
        search || undefined,
        status !== "ALL" ? status : undefined,
        employeeIdNumber,
        parcelIdNumber,
        page,
        limit
      );

      setAssignments(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 0);
    } catch (err: any) {
      console.error("Failed to fetch delivery assignments:", err);
      setError(
        err?.response?.data?.detail || "Unable to load delivery assignments."
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, employeeId, parcelId, page, limit]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast("");
    }, 5000);
  };

  // ============================================================
  // STATUS UPDATE HANDLER
  // ============================================================
  const handleOpenStatusModal = (assignment: DeliveryAssignment) => {
    setStatusAssignment(assignment);
    const possible = VALID_TRANSITIONS[assignment.status] || [];
    setNewStatus(possible[0] || "");
    setStatusError("");
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusAssignment || !newStatus) return;

    try {
      setStatusSubmitting(true);
      setStatusError("");

      await updateDeliveryAssignmentStatus(statusAssignment.id, {
        status: newStatus,
      });

      setStatusAssignment(null);
      showNotification(
        `Status updated to ${newStatus} for ${statusAssignment.assignment_code}.`
      );
      fetchAssignments();
    } catch (err: any) {
      console.error("Failed to update assignment status:", err);
      setStatusError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to update assignment status."
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  // ============================================================
  // CANCEL HANDLER
  // ============================================================
  const handleCancelAssignment = async (assignment: DeliveryAssignment) => {
    if (assignment.status === "DELIVERED") {
      alert("A delivered assignment cannot be cancelled.");
      return;
    }
    if (assignment.status === "CANCELLED") {
      alert("Assignment is already cancelled.");
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel assignment ${assignment.assignment_code}?`
    );
    if (!confirmCancel) return;

    try {
      await cancelDeliveryAssignment(assignment.id);
      showNotification(`Assignment ${assignment.assignment_code} cancelled.`);
      fetchAssignments();
    } catch (err: any) {
      console.error("Failed to cancel assignment:", err);
      alert(
        err?.response?.data?.detail ||
          "Failed to cancel assignment. Please try again."
      );
    }
  };

  // ============================================================
  // FORMAT UTILS
  // ============================================================
  const formatDate = (value: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const getStatusClass = (assignmentStatus: string) => {
    switch (assignmentStatus) {
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "PICKED_UP":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      case "DELIVERED":
        return "bg-green-100 text-green-700 border border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-700 border border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const getBranchCity = (branchId?: number) => {
    if (!branchId) return "-";
    const b = branchesMap[branchId];
    return b ? b.city || b.branch_name : `Branch #${branchId}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Delivery Assignments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage parcel delivery assignments and employee responsibilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAssignments}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span>+</span> Assign Delivery
          </button>
        </div>
      </div>

      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast("")}
            className="text-emerald-600 hover:text-emerald-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* FILTER CARD */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* SEARCH */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Search Assignment
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search DA000001..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All Statuses" : option.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* EMPLOYEE ID */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Employee ID
            </label>
            <input
              type="number"
              min="1"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setPage(1);
              }}
              placeholder="Filter Employee ID"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* PARCEL ID */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Parcel ID
            </label>
            <input
              type="number"
              min="1"
              value={parcelId}
              onChange={(e) => {
                setParcelId(e.target.value);
                setPage(1);
              }}
              placeholder="Filter Parcel ID"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* CLEAR FILTERS */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setEmployeeId("");
              setParcelId("");
              setPage(1);
            }}
            className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* TABLE CARD */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Assignment List</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {total} total assignment{total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="text-sm text-slate-500">Loading assignments...</p>
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-4xl">📦</div>
              <h3 className="font-semibold text-slate-900">
                No assignments found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters, or assign a new delivery.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                + Create New Assignment
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assignment
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tracking Number
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Employee
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Branch / Route
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Vehicle
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assigned At
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {assignments.map((assignment) => {
                  const parcel = parcelsMap[assignment.parcel_id];
                  const employee = employeesMap[assignment.employee_id];
                  const isDeliveredOrCancelled =
                    assignment.status === "DELIVERED" ||
                    assignment.status === "CANCELLED";

                  return (
                    <tr
                      key={assignment.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* ASSIGNMENT */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {assignment.assignment_code}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ID: #{assignment.id}
                        </div>
                      </td>

                      {/* TRACKING NUMBER */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {parcel ? parcel.tracking_number : `Parcel #${assignment.parcel_id}`}
                        </div>
                        {parcel && (
                          <div className="text-[11px] text-slate-500">
                            {parcel.priority} • {parcel.weight} kg
                          </div>
                        )}
                      </td>

                      {/* EMPLOYEE */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {employee ? employee.name : `Employee #${assignment.employee_id}`}
                        </div>
                        {employee && (
                          <div className="text-[11px] text-slate-500">
                            {employee.employee_code}
                          </div>
                        )}
                      </td>

                      {/* BRANCH / ROUTE */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                        {parcel ? (
                          <div>
                            <span>{getBranchCity(parcel.source_branch_id)}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span>{getBranchCity(parcel.destination_branch_id)}</span>
                          </div>
                        ) : employee ? (
                          getBranchCity(employee.branch_id)
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* VEHICLE */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-700">
                        {employee?.vehicle_type || "-"}
                      </td>

                      {/* ASSIGNED AT */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                        {formatDate(assignment.assigned_at)}
                      </td>

                      {/* STATUS */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(
                            assignment.status
                          )}`}
                        >
                          {assignment.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setDetailAssignment(assignment)}
                            className="font-medium text-slate-600 hover:text-slate-900"
                          >
                            View
                          </button>

                          {!isDeliveredOrCancelled && (
                            <>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setEditAssignment(assignment)}
                                className="font-medium text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>

                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(assignment)}
                                className="font-medium text-amber-600 hover:text-amber-800"
                              >
                                Status
                              </button>

                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleCancelAssignment(assignment)}
                                className="font-medium text-red-600 hover:text-red-800"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && assignments.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span> (
              {total} total records)
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newAssn) => {
          showNotification(
            `Delivery assigned successfully. Assignment: ${newAssn.assignment_code}`
          );
          fetchAssignments();
        }}
      />

      {/* EDIT MODAL */}
      <EditAssignmentModal
        isOpen={Boolean(editAssignment)}
        assignment={editAssignment}
        onClose={() => setEditAssignment(null)}
        onSuccess={(updated) => {
          showNotification(
            `Assignment ${updated.assignment_code} updated successfully.`
          );
          fetchAssignments();
        }}
      />

      {/* DETAIL MODAL */}
      {detailAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Assignment Details
                </h3>
                <p className="text-xs text-slate-500">
                  {detailAssignment.assignment_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailAssignment(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Status</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(
                    detailAssignment.status
                  )}`}
                >
                  {detailAssignment.status.replace("_", " ")}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Parcel Tracking</span>
                <span className="font-semibold text-slate-900">
                  {parcelsMap[detailAssignment.parcel_id]?.tracking_number ||
                    `Parcel #${detailAssignment.parcel_id}`}
                </span>
              </div>

              {parcelsMap[detailAssignment.parcel_id] && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Route</span>
                  <span className="font-medium text-slate-800">
                    {getBranchCity(
                      parcelsMap[detailAssignment.parcel_id].source_branch_id
                    )}{" "}
                    →{" "}
                    {getBranchCity(
                      parcelsMap[detailAssignment.parcel_id].destination_branch_id
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Courier / Employee</span>
                <span className="font-semibold text-slate-900">
                  {employeesMap[detailAssignment.employee_id]?.name ||
                    `Employee #${detailAssignment.employee_id}`}{" "}
                  (
                  {employeesMap[detailAssignment.employee_id]?.employee_code ||
                    "-"}
                  )
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Assigned At</span>
                <span className="text-slate-800">
                  {formatDate(detailAssignment.assigned_at)}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Picked Up At</span>
                <span className="text-slate-800">
                  {formatDate(detailAssignment.picked_up_at)}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Delivered At</span>
                <span className="text-slate-800">
                  {formatDate(detailAssignment.delivered_at)}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-500">
                  Notes
                </span>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {detailAssignment.notes || "No notes provided."}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 px-6 py-3">
              {detailAssignment.status !== "DELIVERED" &&
              detailAssignment.status !== "CANCELLED" ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailAssignment;
                    setDetailAssignment(null);
                    setEditAssignment(target);
                  }}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit Assignment
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setDetailAssignment(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {statusAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Update Assignment Status
                </h3>
                <p className="text-xs text-slate-500">
                  {statusAssignment.assignment_code} (Current:{" "}
                  {statusAssignment.status})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusAssignment(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              {statusError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {statusError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  New Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {(VALID_TRANSITIONS[statusAssignment.status] || []).map(
                    (st) => (
                      <option key={st} value={st}>
                        {st.replace("_", " ")}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStatusAssignment(null)}
                  disabled={statusSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting || !newStatus}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {statusSubmitting ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryAssignments;