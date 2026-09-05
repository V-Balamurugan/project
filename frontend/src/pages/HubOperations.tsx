import React, { useEffect, useState } from "react";
import {
  Building2,
  Truck,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Search,
  Layers,
  Zap,
  X,
} from "lucide-react";
import {
  getParcels,
  prepareIntercity,
  assignIntercityVehicle,
  startIntercityTransit,
  receiveAtReceiverBranch,
  prepareLastMile,
} from "../api/parcelApi";
import type { Parcel } from "../types/parcel";
import { vehicleService } from "../services/vehicleService";
import type { Vehicle } from "../types/vehicle";

export const HubOperations: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"OUTBOUND" | "READY_LINEHAUL" | "TRANSIT" | "DEST_HUB">("OUTBOUND");

  // Dispatch Van Modal
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, vRes] = await Promise.all([
        getParcels({ limit: 100 }),
        vehicleService.getVehicles(),
      ]);
      setParcels(pRes.parcels || []);
      setVehicles(vRes.vehicles || []);
    } catch (err) {
      console.error("Failed to load hub operations data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrepareIntercity = async (pId: number) => {
    try {
      await prepareIntercity(pId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to prepare parcel");
    }
  };

  const handleBatchDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || selectedParcelIds.length === 0) return;

    try {
      setDispatching(true);
      await assignIntercityVehicle(selectedParcelIds, selectedVehicleId);
      setShowDispatchModal(false);
      setSelectedParcelIds([]);
      setSelectedVehicleId(undefined);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to dispatch vehicle");
    } finally {
      setDispatching(false);
    }
  };

  const handleStartTransit = async (pId: number) => {
    try {
      await startIntercityTransit(pId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to start highway transit");
    }
  };

  const handleReceiveAtDestHub = async (parcel: Parcel) => {
    try {
      await receiveAtReceiverBranch(parcel.id, parcel.destination_branch_id, "Arrived at Destination City Hub");
      alert(`Parcel ${parcel.tracking_number} checked into Destination Hub!`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to check into destination hub");
    }
  };

  const handlePrepareLastMile = async (pId: number) => {
    try {
      await prepareLastMile(pId);
      alert("Parcel moved to Last-Mile Dispatch Queue!");
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to queue for last-mile");
    }
  };

  const toggleSelectParcel = (id: number) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Groupings for Stages 6-10
  const outboundParcels = parcels.filter((p) => p.current_stage === "AT_SENDER_BRANCH");
  const readyIntercity = parcels.filter((p) => p.current_stage === "READY_FOR_INTERCITY_TRANSPORT" || p.current_stage === "INTERCITY_ASSIGNED");
  const transitParcels = parcels.filter((p) => p.current_stage === "IN_INTERCITY_TRANSIT");
  const destHubParcels = parcels.filter((p) => p.current_stage === "AT_RECEIVER_BRANCH");

  const getActiveList = () => {
    switch (activeTab) {
      case "OUTBOUND":
        return outboundParcels;
      case "READY_LINEHAUL":
        return readyIntercity;
      case "TRANSIT":
        return transitParcels;
      case "DEST_HUB":
        return destHubParcels;
      default:
        return [];
    }
  };

  const filteredList = getActiveList().filter(
    (p) =>
      p.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
      p.source_address.toLowerCase().includes(search.toLowerCase()) ||
      p.destination_address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-indigo-400" />
            Middle-Mile Hub Operations & Inter-City Linehaul
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage Stages 6 to 10: Sender hub sorting, inter-city van manifest batching, highway transit, and receiver hub arrival.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab("OUTBOUND")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "OUTBOUND"
              ? "bg-indigo-600/15 border-indigo-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Stage 6</span>
          <span className="text-sm font-bold text-white mt-1">Sender Hub Bay</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{outboundParcels.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("READY_LINEHAUL")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "READY_LINEHAUL"
              ? "bg-amber-600/15 border-amber-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Stages 7 & 8</span>
          <span className="text-sm font-bold text-white mt-1">Ready for Van Dispatch</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{readyIntercity.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("TRANSIT")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "TRANSIT"
              ? "bg-blue-600/15 border-blue-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Stage 9</span>
          <span className="text-sm font-bold text-white mt-1">Highway Transit</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{transitParcels.length} Parcels</span>
        </button>

        <button
          onClick={() => setActiveTab("DEST_HUB")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeTab === "DEST_HUB"
              ? "bg-emerald-600/15 border-emerald-500 text-white"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Stage 10</span>
          <span className="text-sm font-bold text-white mt-1">Arrived at Receiver Hub</span>
          <span className="text-xs text-slate-400 mt-2 font-semibold">{destHubParcels.length} Parcels</span>
        </button>
      </div>

      {/* Action Bar for Batch Dispatch */}
      {activeTab === "READY_LINEHAUL" && selectedParcelIds.length > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-500/40 p-3 rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>{selectedParcelIds.length} parcels selected for Inter-City Van Transport</span>
          </div>
          <button
            onClick={() => setShowDispatchModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20"
          >
            <Truck className="w-4 h-4" />
            Assign Van / Truck & Dispatch
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking #, origin, destination..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Showing {filteredList.length} items
        </span>
      </div>

      {/* Parcel Hub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredList.map((parcel) => {
          const isSelected = selectedParcelIds.includes(parcel.id);

          return (
            <div
              key={parcel.id}
              className={`bg-slate-900/70 border p-5 rounded-2xl transition duration-200 flex flex-col justify-between shadow-lg ${
                isSelected ? "border-indigo-500 bg-indigo-950/20" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {activeTab === "READY_LINEHAUL" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectParcel(parcel.id)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    <div>
                      <span className="text-xs font-bold text-indigo-400 font-mono">
                        {parcel.tracking_number}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {parcel.weight} kg • {parcel.service_type}
                      </h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {parcel.priority}
                  </span>
                </div>

                {/* Hub Transit Route */}
                <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Origin Hub</span>
                    <p className="font-semibold text-white">{parcel.source_branch_name || `Hub #${parcel.source_branch_id}`}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Destination Hub</span>
                    <p className="font-semibold text-emerald-400">{parcel.destination_branch_name || `Hub #${parcel.destination_branch_id}`}</p>
                  </div>
                </div>

                {/* Assigned Intercity Vehicle if any */}
                {parcel.current_vehicle_reg && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-300 bg-blue-950/30 p-2 rounded-lg border border-blue-800/50">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Transport Vehicle: <strong>{parcel.current_vehicle_reg}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Stage: {parcel.current_stage}</span>

                {activeTab === "OUTBOUND" && (
                  <button
                    onClick={() => handlePrepareIntercity(parcel.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Queue for Inter-City Transit
                  </button>
                )}

                {activeTab === "READY_LINEHAUL" && parcel.current_stage === "INTERCITY_ASSIGNED" && (
                  <button
                    onClick={() => handleStartTransit(parcel.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Depart Highway Linehaul
                  </button>
                )}

                {activeTab === "TRANSIT" && (
                  <button
                    onClick={() => handleReceiveAtDestHub(parcel)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Arrived & Unloaded at Dest Hub
                  </button>
                )}

                {activeTab === "DEST_HUB" && (
                  <button
                    onClick={() => handlePrepareLastMile(parcel.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Move to Last-Mile Dispatch
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && !loading && (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No hub parcels in this stage</h3>
          <p className="text-xs text-slate-500 mt-1">Check other stages or queue parcels from the sender hub bay.</p>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                Assign Inter-City Vehicle
              </h2>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchDispatch} className="mt-4 space-y-4">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 text-xs">
                <p className="text-slate-300">
                  Assigning <strong>{selectedParcelIds.length}</strong> selected parcels to linehaul transport.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Van / Heavy Truck *
                </label>
                <select
                  required
                  value={selectedVehicleId || ""}
                  onChange={(e) => setSelectedVehicleId(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Choose transport vehicle</option>
                  {vehicles.map((veh) => (
                    <option key={veh.id} value={veh.id}>
                      {veh.registration_number} ({veh.vehicle_type} - {veh.capacity_kg}kg) • {veh.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg disabled:opacity-50"
                >
                  {dispatching ? "Dispatching..." : "Confirm & Load Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
