import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getParcels } from "../api/parcelApi";
import CreateAssignmentModal from "../components/delivery/CreateAssignmentModal";
import EditAssignmentModal from "../components/delivery/EditAssignmentModal";
import { getDashboardSummary } from "../services/dashboardService";
import {
  getDeliveryAssignments,
  type DeliveryAssignment,
} from "../services/deliveryAssignmentService";
import { getEmployees } from "../services/employeeService";
import type { DashboardSummary } from "../types/dashboard";
import type { Employee } from "../types/employee";
import type { Parcel } from "../types/parcel";

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [recentAssignments, setRecentAssignments] = useState<
    DeliveryAssignment[]
  >([]);
  const [unassignedParcelsCount, setUnassignedParcelsCount] = useState<number>(0);
  const [employeesMap, setEmployeesMap] = useState<Record<number, Employee>>({});
  const [parcelsMap, setParcelsMap] = useState<Record<number, Parcel>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Notification State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<DeliveryAssignment | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    code: string;
    parcel: string;
    employee: string;
    status: string;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [summaryRes, assignmentsRes, parcelsRes, employeesRes] =
        await Promise.all([
          getDashboardSummary(),
          getDeliveryAssignments(undefined, undefined, undefined, undefined, 1, 5),
          getParcels({ limit: 100 }),
          getEmployees({ limit: 100 }),
        ]);

      setData(summaryRes);
      setRecentAssignments(assignmentsRes.items || []);

      // Build employee mapping
      const empMap: Record<number, Employee> = {};
      (employeesRes.employees || []).forEach((emp) => {
        empMap[emp.id] = emp;
      });
      setEmployeesMap(empMap);

      // Build parcel mapping
      const pkgMap: Record<number, Parcel> = {};
      (parcelsRes.parcels || []).forEach((pkg) => {
        pkgMap[pkg.id] = pkg;
      });
      setParcelsMap(pkgMap);

      // Calculate unassigned parcels (Registered or Processing parcels without active assignment)
      const unassigned = (parcelsRes.parcels || []).filter(
        (p) => p.status === "REGISTERED" || p.status === "PROCESSING"
      ).length;
      setUnassignedParcelsCount(unassigned);

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleAssignmentSuccess = async (assignment: DeliveryAssignment) => {
    await loadDashboard();

    const empName =
      employeesMap[assignment.employee_id]?.name ||
      `Employee #${assignment.employee_id}`;
    const pkgCode =
      parcelsMap[assignment.parcel_id]?.tracking_number ||
      `Parcel #${assignment.parcel_id}`;

    setSuccessMessage({
      code: assignment.assignment_code,
      parcel: pkgCode,
      employee: empName,
      status: assignment.status,
    });

    // Auto dismiss after 8 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 8000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700";
      case "PICKED_UP":
        return "bg-amber-100 text-amber-700";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-700";
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-700";
      case "CANCELLED":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">No dashboard data available.</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Parcels",
      value: data.total_parcels,
    },
    {
      title: "Today's Deliveries",
      value: data.today_deliveries,
    },
    {
      title: "Pending Deliveries",
      value: data.pending_deliveries,
    },
    {
      title: "Completed Deliveries",
      value: data.completed_deliveries,
    },
    {
      title: "Delayed Parcels",
      value: data.delayed_parcels,
    },
    {
      title: "Active Employees",
      value: data.active_employees,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Smart Delivery Control Center
        </h1>

        <p className="mt-2 text-slate-500">
          Real-time overview of postal and courier operations
        </p>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-200 text-emerald-800 font-bold">
              ✓
            </span>
            <div>
              <p className="font-semibold">Delivery assigned successfully.</p>
              <p className="text-xs text-emerald-700">
                Assignment:{" "}
                <span className="font-bold">{successMessage.code}</span> |
                Parcel:{" "}
                <span className="font-bold">{successMessage.parcel}</span> |
                Employee:{" "}
                <span className="font-bold">{successMessage.employee}</span> |
                Status:{" "}
                <span className="font-bold">{successMessage.status}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="rounded p-1 text-emerald-600 hover:bg-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.title}</p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Delivery Assignment Quick Section */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Delivery Assignment
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                Operations
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Assign packages to active couriers and monitor ongoing delivery tasks
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/assignments"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              View All Assignments →
            </Link>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
            >
              <span>+</span> Assign Delivery
            </button>
          </div>
        </div>

        {/* Quick Assignment Statistics */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Unassigned Parcels
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {unassignedParcelsCount}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Recent Assignments
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {recentAssignments.length}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Active couriers Available
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {data.active_employees}
            </p>
          </div>
        </div>

        {/* Recent Assignments Mini-Table */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recent Delivery Assignments
          </p>

          {recentAssignments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
              <p className="text-sm text-slate-500">
                No delivery assignments created yet.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Assign your first delivery
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Assignment Code
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Parcel
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Employee
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Assigned Date
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {recentAssignments.map((assignment) => {
                    const parcel = parcelsMap[assignment.parcel_id];
                    const employee = employeesMap[assignment.employee_id];
                    const isEditable =
                      assignment.status !== "DELIVERED" &&
                      assignment.status !== "CANCELLED";

                    return (
                      <tr key={assignment.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">
                          {assignment.assignment_code}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {parcel ? (
                            <div>
                              <span className="font-medium text-slate-900">
                                {parcel.tracking_number}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {parcel.priority} • {parcel.weight} kg
                              </span>
                            </div>
                          ) : (
                            `Parcel #${assignment.parcel_id}`
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {employee ? (
                            <div>
                              <span className="font-medium text-slate-900">
                                {employee.name}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {employee.employee_code} • {employee.vehicle_type}
                              </span>
                            </div>
                          ) : (
                            `Employee #${assignment.employee_id}`
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {assignment.assigned_at
                            ? new Date(assignment.assigned_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(
                              assignment.status
                            )}`}
                          >
                            {assignment.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                          {isEditable ? (
                            <button
                              type="button"
                              onClick={() => setEditingAssignment(assignment)}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Intelligence & System Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            AI Delivery Intelligence
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-500">High-Risk Deliveries</span>
              <span className="font-semibold">
                {data.high_risk_deliveries}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Predicted Delays</span>
              <span className="font-semibold">
                {data.predicted_delays}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Average Predicted Delay</span>
              <span className="font-semibold">
                {data.average_predicted_delay} min
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Route Savings</span>
              <span className="font-semibold">
                {data.route_optimization_savings} km
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Employee Performance</span>
              <span className="font-semibold">
                {data.average_employee_performance}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            System Status
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Backend API</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                Online
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Database</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">AI Engine</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAssignmentSuccess}
      />

      {/* Edit Assignment Modal */}
      <EditAssignmentModal
        isOpen={Boolean(editingAssignment)}
        assignment={editingAssignment}
        onClose={() => setEditingAssignment(null)}
        onSuccess={() => {
          setEditingAssignment(null);
          loadDashboard();
        }}
      />
    </div>
  );
}