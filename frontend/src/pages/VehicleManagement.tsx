import React, { useEffect, useState } from "react";
import {
  Truck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Gauge,
  MapPin,
  User,
  CheckCircle2,
  X,
  Shield,
  Zap,
} from "lucide-react";
import { vehicleService } from "../services/vehicleService";
import type { Vehicle, VehicleCreate, VehicleType, VehicleStatus } from "../types/vehicle";
import { getBranches } from "../services/branchService";
import { getEmployees } from "../services/employeeService";
import type { Branch } from "../types/branch";
import type { Employee } from "../types/employee";

export const VehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [regNum, setRegNum] = useState("");
  const [vType, setVType] = useState<VehicleType>("VAN");
  const [capacity, setCapacity] = useState<number>(800);
  const [maxParcels, setMaxParcels] = useState<number>(60);
  const [branchId, setBranchId] = useState<number | undefined>();
  const [driverId, setDriverId] = useState<number | undefined>();
  const [vStatus, setVStatus] = useState<VehicleStatus>("AVAILABLE");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, bRes, eRes] = await Promise.all([
        vehicleService.getVehicles(),
        getBranches(),
        getEmployees({ limit: 100 }),
      ]);
      setVehicles(vRes.vehicles || []);
      setBranches(bRes || []);
      setEmployees(eRes.employees || []);
    } catch (err) {
      console.error("Failed to load vehicle fleet data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNum.trim()) return;

    try {
      setSubmitting(true);
      const payload: VehicleCreate = {
        registration_number: regNum.trim().toUpperCase(),
        vehicle_type: vType,
        capacity_kg: capacity,
        max_parcels: maxParcels,
        current_branch_id: branchId,
        assigned_driver_id: driverId,
        status: vStatus,
      };
      await vehicleService.createVehicle(payload);
      setShowModal(false);
      setRegNum("");
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      (v.branch_name && v.branch_name.toLowerCase().includes(search.toLowerCase())) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    const matchesType = typeFilter === "ALL" || v.vehicle_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Available</span>;
      case "IN_TRANSIT":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">In Transit</span>;
      case "LOADING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Loading / Hub</span>;
      case "MAINTENANCE":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Maintenance</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-indigo-400" />
            Fleet & Transport Vehicle Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-world fleet telematics, inter-city transport linehaul vans, and local branch distribution trucks.
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
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Register Vehicle
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Fleet</span>
            <Truck className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{vehicles.length}</p>
          <p className="text-xs text-slate-500 mt-1">Registered vehicles</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available / Ready</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {vehicles.filter((v) => v.status === "AVAILABLE").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Ready for dispatch</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Linehaul</span>
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-2">
            {vehicles.filter((v) => v.status === "IN_TRANSIT").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Highway inter-city transit</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Hub / Loading</span>
            <Gauge className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">
            {vehicles.filter((v) => v.status === "LOADING").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">At postal hub sorting bay</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reg number, driver, branch..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="LOADING">Loading</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="VAN">Delivery Van</option>
            <option value="TRUCK">Heavy Truck</option>
            <option value="EV_VAN">Eco Electric Van</option>
            <option value="MOTORCYCLE">Rider Motorcycle</option>
          </select>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition duration-200 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {vehicle.vehicle_type}
                  </span>
                  <h3 className="text-lg font-black text-white mt-1.5 tracking-wide">
                    {vehicle.registration_number}
                  </h3>
                </div>
                {getStatusBadge(vehicle.status)}
              </div>

              {/* Specs & Payload Barometer */}
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-500" />
                    Weight Capacity:
                  </span>
                  <span className="text-slate-200 font-bold">{vehicle.capacity_kg} kg</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    Max Parcel Volume:
                  </span>
                  <span className="text-slate-200 font-bold">{vehicle.max_parcels} Parcels</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">Hub: {vehicle.branch_name || "Unassigned Branch"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Driver: {vehicle.driver_name || "No Driver Assigned"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Telemetry: {vehicle.current_latitude ? `${vehicle.current_latitude.toFixed(4)}, ${vehicle.current_longitude?.toFixed(4)}` : "GPS Idle"}</span>
              <span className="font-semibold text-slate-400">ID #{vehicle.id}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && !loading && (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No vehicles found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or register a new vehicle.</p>
        </div>
      )}

      {/* Create Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                Register New Fleet Vehicle
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  placeholder="e.g. TN-01-AB-1234"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="VAN">Delivery Van</option>
                    <option value="TRUCK">Heavy Truck</option>
                    <option value="EV_VAN">Electric Van</option>
                    <option value="MOTORCYCLE">Motorcycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={vStatus}
                    onChange={(e) => setVStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="LOADING">Loading</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Capacity (kg)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={capacity}
                    onChange={(e) => setCapacity(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Parcels
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxParcels}
                    onChange={(e) => setMaxParcels(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Home Base Branch
                </label>
                <select
                  value={branchId || ""}
                  onChange={(e) => setBranchId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Branch Hub</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={driverId || ""}
                  onChange={(e) => setDriverId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No Driver Assigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.vehicle_type || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Register Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
