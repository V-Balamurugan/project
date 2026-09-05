import React, { useEffect, useState } from "react";
import {
  PackageCheck,
  UserCheck,
  Navigation,
  CheckCircle2,
  Building2,
  RefreshCw,
  Search,
  MapPin,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";
import {
  getParcels,
  assignPickup,
  startPickup,
  confirmPickup,
  startInbound,
  receiveAtSenderBranch,
} from "../api/parcelApi";
import type { Parcel } from "../types/parcel";
import { getEmployees } from "../services/employeeService";
import type { Employee } from "../types/employee";

export const PickupOperations: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"NEW" | "ASSIGNED" | "IN_PROGRESS" | "PICKED_UP" | "INBOUND">("NEW");

  // Assign Modal
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<number | undefined>();
  const [pickupNotes, setPickupNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, eRes] = await Promise.all([
        getParcels({ limit: 100 }),
        getEmployees({ limit: 100 }),
      ]);
      setParcels(pRes.parcels || []);
      setEmployees(eRes.employees || []);
    } catch (err) {
      console.error("Failed to load pickup operational data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel || !selectedRiderId) return;

    try {
      setAssigning(true);
      await assignPickup(selectedParcel.id, selectedRiderId, pickupNotes);
      setSelectedParcel(null);
      setSelectedRiderId(undefined);
      setPickupNotes("");
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to assign pickup rider");
    } finally {
      setAssigning(false);
    }
  };

  const handleStartPickup = async (pId: number) => {
    try {
      await startPickup(pId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start pickup");
    }
  };

  const handleConfirmPickup = async (pId: number) => {
    const remarks = prompt("Enter pickup notes / package verification remarks (optional):");
    try {
      await confirmPickup(pId, remarks || undefined);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to confirm pickup");
    }
  };

  const handleStartInbound = async (pId: number) => {
    try {
      await startInbound(pId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start inbound transport");
    }
  };

  const handleReceiveAtBranch = async (parcel: Parcel) => {
    try {
      await receiveAtSenderBranch(parcel.id, parcel.source_branch_id, "Scanned & Received at Sender Hub sorting bay");
      alert(`Parcel ${parcel.tracking_number} checked into Sender Hub sorting bay!`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to check into hub");
    }
  };

  // Filter parcels according to pickup stages
  const newRequests = parcels.filter((p) => p.current_stage === "CREATED");
  const assignedParcels = parcels.filter((p) => p.current_stage === "PICKUP_ASSIGNED");
  const inProgressParcels = parcels.filter((p) => p.current_stage === "PICKUP_IN_PROGRESS");
  const pickedUpParcels = parcels.filter((p) => p.current_stage === "PICKED_UP");
  const inboundParcels = parcels.filter((p) => p.current_stage === "INBOUND_TO_SENDER_BRANCH");

  const getActiveList = () => {
    switch (activeTab) {
      case "NEW":
        return newRequests;
      case "ASSIGNED":
        return assignedParcels;
      case "IN_PROGRESS":
        return inProgressParcels;
      case "PICKED_UP":
        return pickedUpParcels;
      case "INBOUND":
        return inboundParcels;
      default:
        return [];
    }
  };

  const filteredList = getActiveList().filter(
    (p) =>
      p.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
      p.sender.toLowerCase().includes(search.toLowerCase()) ||
      p.source_address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <PackageCheck className="w-7 h-7 text-emerald-400" />
            First-Mile Pickup Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage Stages 1 to 6: Customer booking, rider assignment, sender doorstep collection, and inbound hub receipt.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stage Stepper Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab("NEW")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "NEW"
              ? "bg-indigo-600/15 border-indigo-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Stage 1</span>
          <span className="text-sm font-bold text-white mt-1">New Bookings</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{newRequests.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("ASSIGNED")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "ASSIGNED"
              ? "bg-blue-600/15 border-blue-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Stage 2</span>
          <span className="text-sm font-bold text-white mt-1">Rider Assigned</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{assignedParcels.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("IN_PROGRESS")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "IN_PROGRESS"
              ? "bg-amber-600/15 border-amber-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Stage 3</span>
          <span className="text-sm font-bold text-white mt-1">Rider En Route</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{inProgressParcels.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("PICKED_UP")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "PICKED_UP"
              ? "bg-emerald-600/15 border-emerald-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Stage 4</span>
          <span className="text-sm font-bold text-white mt-1">Collected</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{pickedUpParcels.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("INBOUND")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "INBOUND"
              ? "bg-purple-600/15 border-purple-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Stage 5</span>
          <span className="text-sm font-bold text-white mt-1">Inbound Hub Transit</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{inboundParcels.length} Parcels</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking #, sender name, pickup address..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Showing {filteredList.length} items
        </span>
      </div>

      {/* Parcel Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredList.map((parcel) => (
          <div
            key={parcel.id}
            className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition duration-200 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-400 font-mono">
                    {parcel.tracking_number}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    Sender: {parcel.sender}
                  </h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {parcel.weight} kg • {parcel.priority}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 font-medium">Pickup: {parcel.source_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Sender Hub: {parcel.source_branch_name || `Branch #${parcel.source_branch_id}`}</span>
                </div>
                {parcel.current_employee_name && (
                  <div className="flex items-center gap-2 text-blue-300 pt-1 border-t border-slate-800/80">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Assigned Rider: <strong>{parcel.current_employee_name}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons based on Active Tab */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {parcel.created_at ? new Date(parcel.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
              </span>

              {activeTab === "NEW" && (
                <button
                  onClick={() => setSelectedParcel(parcel)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Assign Pickup Rider
                </button>
              )}

              {activeTab === "ASSIGNED" && (
                <button
                  onClick={() => handleStartPickup(parcel.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Rider Starts Pickup Run
                </button>
              )}

              {activeTab === "IN_PROGRESS" && (
                <button
                  onClick={() => handleConfirmPickup(parcel.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Doorstep Pickup
                </button>
              )}

              {activeTab === "PICKED_UP" && (
                <button
                  onClick={() => handleStartInbound(parcel.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Start Inbound Transport to Hub
                </button>
              )}

              {activeTab === "INBOUND" && (
                <button
                  onClick={() => handleReceiveAtBranch(parcel)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Scan & Receive at Sender Hub
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredList.length === 0 && !loading && (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No parcels in this stage</h3>
          <p className="text-xs text-slate-500 mt-1">Check other stage tabs or create new parcel bookings.</p>
        </div>
      )}

      {/* Assign Rider Modal */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Assign Pickup Rider
              </h2>
              <button
                onClick={() => setSelectedParcel(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignPickup} className="mt-4 space-y-4">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 text-xs space-y-1">
                <div className="text-slate-400">Tracking #: <strong className="text-white font-mono">{selectedParcel.tracking_number}</strong></div>
                <div className="text-slate-400">Sender: <strong className="text-white">{selectedParcel.sender}</strong></div>
                <div className="text-slate-400">Address: <span className="text-slate-300">{selectedParcel.source_address}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Rider Employee *
                </label>
                <select
                  required
                  value={selectedRiderId || ""}
                  onChange={(e) => setSelectedRiderId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose available employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.vehicle_type || "Rider"}) - {emp.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pickup Instructions / Remarks
                </label>
                <textarea
                  rows={2}
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="e.g. Call sender before reaching gate..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedParcel(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
