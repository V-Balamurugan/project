import React, { useEffect, useState } from "react";
import { getParcels } from "../../api/parcelApi";
import { getBranches } from "../../services/branchService";
import {
  createDeliveryAssignment,
  getDeliveryAssignments,
  type DeliveryAssignment,
} from "../../services/deliveryAssignmentService";
import { getEmployees } from "../../services/employeeService";
import type { Branch } from "../../types/branch";
import type { Employee } from "../../types/employee";
import type { Parcel } from "../../types/parcel";

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assignment: DeliveryAssignment) => void;
  preSelectedParcelId?: number;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedParcelId,
}) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedParcelId, setSelectedParcelId] = useState<string>(
    preSelectedParcelId ? String(preSelectedParcelId) : ""
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedParcelId(preSelectedParcelId ? String(preSelectedParcelId) : "");
      setSelectedEmployeeId("");
      setNotes("");
      setError("");
      return;
    }

    const loadFormData = async () => {
      try {
        setLoadingData(true);
        setError("");

        const [parcelsRes, employeesRes, branchesRes, assignmentsRes] =
          await Promise.all([
            getParcels({ limit: 100 }),
            getEmployees({ status: "ACTIVE", limit: 100 }),
            getBranches(),
            getDeliveryAssignments(undefined, undefined, undefined, undefined, 1, 100),
          ]);

        // Identify parcel IDs that currently have an active delivery assignment
        const activeAssignedParcelIds = new Set(
          (assignmentsRes.items || [])
            .filter((a) =>
              ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(a.status)
            )
            .map((a) => a.parcel_id)
        );

        // Filter out parcels that cannot be assigned:
        // 1. Status DELIVERED or CANCELLED
        // 2. Already actively assigned (unless it's the preSelectedParcelId)
        const assignableParcels = (parcelsRes.parcels || []).filter((p) => {
          if (p.status === "DELIVERED" || p.status === "CANCELLED") {
            return false;
          }
          if (
            activeAssignedParcelIds.has(p.id) &&
            p.id !== preSelectedParcelId
          ) {
            return false;
          }
          return true;
        });

        setParcels(assignableParcels);
        setEmployees(
          (employeesRes.employees || []).filter((e) => e.status === "ACTIVE")
        );
        setBranches(branchesRes || []);

        if (preSelectedParcelId) {
          setSelectedParcelId(String(preSelectedParcelId));
        }
      } catch (err: unknown) {
        console.error("Failed to load assignment form options:", err);
        setError("Unable to load active employees or parcels. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };

    void loadFormData();
  }, [isOpen, preSelectedParcelId]);

  if (!isOpen) return null;

  const getBranchName = (branchId: number) => {
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.city || branch.branch_name : `Branch #${branchId}`;
  };

  const getSelectedParcelDetails = () => {
    return parcels.find((p) => String(p.id) === selectedParcelId);
  };

  const getSelectedEmployeeDetails = () => {
    return employees.find((e) => String(e.id) === selectedEmployeeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedParcelId) {
      setError("Please select a parcel to assign.");
      return;
    }

    if (!selectedEmployeeId) {
      setError("Please select an active employee for delivery.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const assignment = await createDeliveryAssignment({
        parcel_id: Number(selectedParcelId),
        employee_id: Number(selectedEmployeeId),
        notes: notes.trim() || undefined,
      });

      onSuccess(assignment);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create assignment:", err);
      const apiErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const detail =
        apiErr?.response?.data?.detail ||
        apiErr?.message ||
        "Failed to assign delivery. Please try again.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedParcel = getSelectedParcelDetails();
  const selectedEmployee = getSelectedEmployeeDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Create Delivery Assignment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Assign an active delivery employee to a parcel
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
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
              <span className="shrink-0 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="mt-3 text-sm text-slate-500">
                Loading available parcels and active employees...
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Parcel Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Parcel <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedParcelId}
                  onChange={(e) => {
                    setSelectedParcelId(e.target.value);
                    setError("");
                  }}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">-- Select Parcel --</option>
                  {parcels.map((parcel) => (
                    <option key={parcel.id} value={parcel.id}>
                      {parcel.tracking_number} ({getBranchName(parcel.source_branch_id)} → {getBranchName(parcel.destination_branch_id)}) - {parcel.priority} / {parcel.weight} kg
                    </option>
                  ))}
                </select>

                {/* Selected Parcel Preview */}
                {selectedParcel && (
                  <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">
                        {selectedParcel.tracking_number}
                      </span>
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
                        {selectedParcel.status}
                      </span>
                    </div>
                    <p className="mt-1">
                      Route: {getBranchName(selectedParcel.source_branch_id)} → {getBranchName(selectedParcel.destination_branch_id)}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      Priority: {selectedParcel.priority} | Weight: {selectedParcel.weight} kg | Service: {selectedParcel.service_type}
                    </p>
                  </div>
                )}
              </div>

              {/* Employee Selection */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Active Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    setError("");
                  }}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional assignment instructions or notes..."
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
                  Assigning...
                </>
              ) : (
                "Assign Delivery"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssignmentModal;
