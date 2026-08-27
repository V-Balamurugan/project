import React, { useEffect, useState } from "react";
import { getParcels } from "../../api/parcelApi";
import { getBranches } from "../../services/branchService";
import {
  updateDeliveryAssignment,
  type DeliveryAssignment,
} from "../../services/deliveryAssignmentService";
import { getEmployees } from "../../services/employeeService";
import type { Branch } from "../../types/branch";
import type { Employee } from "../../types/employee";
import type { Parcel } from "../../types/parcel";

interface EditAssignmentModalProps {
  isOpen: boolean;
  assignment: DeliveryAssignment | null;
  onClose: () => void;
  onSuccess: (updated: DeliveryAssignment) => void;
}

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  assignment,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [parcel, setParcel] = useState<Parcel | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const isDeliveredOrCancelled =
    assignment?.status === "DELIVERED" || assignment?.status === "CANCELLED";

  useEffect(() => {
    if (!isOpen || !assignment) {
      setSelectedEmployeeId("");
      setNotes("");
      setError("");
      setParcel(null);
      return;
    }

    setSelectedEmployeeId(String(assignment.employee_id));
    setNotes(assignment.notes || "");
    setError("");

    const loadData = async () => {
      try {
        setLoadingData(true);

        const [employeesRes, branchesRes, parcelsRes] = await Promise.all([
          getEmployees({ status: "ACTIVE", limit: 100 }),
          getBranches(),
          getParcels({ limit: 100 }),
        ]);

        setEmployees(
          (employeesRes.employees || []).filter((e) => e.status === "ACTIVE")
        );
        setBranches(branchesRes || []);

        const targetParcel = (parcelsRes.parcels || []).find(
          (p) => p.id === assignment.parcel_id
        );
        if (targetParcel) {
          setParcel(targetParcel);
        }
      } catch (err: any) {
        console.error("Failed to load edit modal options:", err);
      } finally {
        setLoadingData(false);
      }
    };

    void loadData();
  }, [isOpen, assignment]);

  if (!isOpen || !assignment) return null;

  const getBranchName = (branchId: number) => {
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.city || branch.branch_name : `Branch #${branchId}`;
  };

  const getSelectedEmployeeDetails = () => {
    return employees.find((e) => String(e.id) === selectedEmployeeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId) {
      setError("Please select an active employee.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const updated = await updateDeliveryAssignment(assignment.id, {
        employee_id: Number(selectedEmployeeId),
        notes: notes.trim() || null,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to update assignment:", err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to update assignment. Please try again.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmployee = getSelectedEmployeeDetails();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700";
      case "PICKED_UP":
        return "bg-yellow-100 text-yellow-700";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-700";
      case "DELIVERED":
        return "bg-green-100 text-green-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Edit Delivery Assignment
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                  assignment.status
                )}`}
              >
                {assignment.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Update employee assignment or instructions for{" "}
              <span className="font-semibold text-slate-700">
                {assignment.assignment_code}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span className="shrink-0 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {isDeliveredOrCancelled && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
              ⚠️ This assignment is marked as {assignment.status}. Completed or cancelled assignments cannot be reassigned.
            </div>
          )}

          {loadingData ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="mt-3 text-sm text-slate-500">
                Loading assignment details...
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Parcel Information (Read Only) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Assigned Parcel Details
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {parcel ? parcel.tracking_number : `Parcel #${assignment.parcel_id}`}
                  </span>
                  {parcel && (
                    <span className="text-xs text-slate-500">
                      {parcel.priority} Priority • {parcel.weight} kg
                    </span>
                  )}
                </div>
                {parcel && (
                  <p className="mt-1 text-xs text-slate-600">
                    Route: {getBranchName(parcel.source_branch_id)} → {getBranchName(parcel.destination_branch_id)}
                  </p>
                )}
              </div>

              {/* Employee Reassignment */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Assigned Active Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    setError("");
                  }}
                  disabled={isDeliveredOrCancelled}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Active Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.name} ({emp.vehicle_type || "Vehicle"}) - {getBranchName(emp.branch_id)}
                    </option>
                  ))}
                </select>

                {/* Selected Employee Preview */}
                {selectedEmployee && (
                  <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">
                        {selectedEmployee.name} ({selectedEmployee.employee_code})
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                        {selectedEmployee.status}
                      </span>
                    </div>
                    <p className="mt-1">
                      Vehicle: {selectedEmployee.vehicle_type} | Branch: {getBranchName(selectedEmployee.branch_id)}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      Phone: {selectedEmployee.phone} | Score: {selectedEmployee.performance_score}%
                    </p>
                  </div>
                )}
              </div>

              {/* Assignment Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Assignment Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Update instructions or reasons for reassignment..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loadingData}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssignmentModal;
