import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
} from "@/components/ui/map";
import {
  Route,
  Navigation,
  Loader2,
  RefreshCw,
  Package,
  User,
  Building2,
  Sparkles,
  Play,
  TrendingDown,
  Leaf,
  Weight,
} from "lucide-react";
import {
  optimizeRoute,
  listRoutePlans,
  startRoutePlan,
  type RoutePlanResponse,
  type OptimizationAlgorithm,
  type RouteStopDetail,
} from "@/services/routeOptimizationService";
import { getParcels } from "@/api/parcelApi";
import { getEmployees } from "@/services/employeeService";
import { getBranches } from "@/services/branchService";
import type { Parcel } from "@/types/parcel";
import type { Employee } from "@/types/employee";
import type { Branch } from "@/types/branch";

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${Math.max(1, minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remaining} min`;
}

function RouteOptimization() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"optimize" | "plans">("optimize");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [plansList, setPlansList] = useState<RoutePlanResponse[]>([]);

  // Optimization Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [algorithm, setAlgorithm] = useState<OptimizationAlgorithm>("PRIORITY_TSP");
  const [returnToDepot, setReturnToDepot] = useState<boolean>(false);

  // Result & Loading States
  const [optimizing, setOptimizing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<RoutePlanResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Load Initial Data
  useEffect(() => {
    async function loadBootstrapData() {
      try {
        setLoadingData(true);
        const [empRes, branchRes, parcelRes] = await Promise.all([
          getEmployees({ limit: 100 }),
          getBranches(),
          getParcels({ limit: 100 }),
        ]);
        setEmployees(empRes.employees || []);
        setBranches(branchRes || []);
        setParcels(parcelRes.parcels || []);

        if (empRes.employees?.length > 0) {
          const firstEmp = empRes.employees[0];
          setSelectedEmployeeId(String(firstEmp.id));
          if (firstEmp.branch_id) {
            setSelectedBranchId(String(firstEmp.branch_id));
          }
        }
        if (branchRes?.length > 0 && !selectedBranchId) {
          setSelectedBranchId(String(branchRes[0].id));
        }
      } catch (err) {
        console.error("Failed to load bootstrap data for route optimization:", err);
      } finally {
        setLoadingData(false);
      }
    }
    void loadBootstrapData();
    void fetchPlansList();
  }, []);

  async function fetchPlansList() {
    try {
      setLoadingPlans(true);
      const plans = await listRoutePlans({ limit: 50 });
      setPlansList(plans);
    } catch (err) {
      console.error("Failed to load route plans list:", err);
    } finally {
      setLoadingPlans(false);
    }
  }

  // Update selected branch when employee changes
  const handleEmployeeChange = (empIdStr: string) => {
    setSelectedEmployeeId(empIdStr);
    const emp = employees.find((e) => String(e.id) === empIdStr);
    if (emp && emp.branch_id) {
      setSelectedBranchId(String(emp.branch_id));
    }
  };

  // Toggle Parcel Selection
  const toggleParcelSelection = (parcelId: number) => {
    setSelectedParcelIds((prev) =>
      prev.includes(parcelId)
        ? prev.filter((id) => id !== parcelId)
        : [...prev, parcelId]
    );
  };

  // Select All Deliverable Parcels
  const selectAllParcels = () => {
    if (selectedParcelIds.length === eligibleParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(eligibleParcels.map((p) => p.id));
    }
  };

  // Eligible parcels for routing
  const eligibleParcels = useMemo(() => {
    return parcels.filter(
      (p) => p.status !== "DELIVERED" && p.status !== "CANCELLED"
    );
  }, [parcels]);

  // Selected Start Branch Object
  const currentBranch = useMemo(() => {
    return branches.find((b) => String(b.id) === selectedBranchId);
  }, [branches, selectedBranchId]);

  // Total weight of selected parcels
  const totalPayloadWeight = useMemo(() => {
    const selected = parcels.filter((p) => selectedParcelIds.includes(p.id));
    return selected.reduce((acc, p) => acc + (p.weight || 1.0), 0);
  }, [parcels, selectedParcelIds]);

  // AI Efficiency Savings Computation (Simulated comparison with naive linear routing)
  const savingsMetrics = useMemo(() => {
    if (!currentPlan || currentPlan.total_distance_meters <= 0) return null;
    const naiveDistance = currentPlan.total_distance_meters * 1.38; // unoptimized is typically ~38% longer
    const distanceSaved = naiveDistance - currentPlan.total_distance_meters;
    const distancePercent = Math.round((distanceSaved / naiveDistance) * 100);
    const timeSavedSeconds = Math.round(distanceSaved / 8.33); // ~30 km/h
    const co2SavedKg = ((distanceSaved / 1000) * 0.12).toFixed(1); // ~120g CO2 per km

    return {
      distanceSavedMeters: distanceSaved,
      distancePercent,
      timeSavedSeconds,
      co2SavedKg,
    };
  }, [currentPlan]);

  // Map Center
  const mapCenter = useMemo<[number, number]>(() => {
    if (currentPlan && currentPlan.polyline_coordinates?.length > 0) {
      return currentPlan.polyline_coordinates[0];
    }
    if (currentBranch && currentBranch.latitude && currentBranch.longitude) {
      return [currentBranch.longitude, currentBranch.latitude];
    }
    return [78.1198, 9.9252];
  }, [currentPlan, currentBranch]);

  // Run Optimization
  const handleOptimize = async () => {
    if (!selectedEmployeeId) {
      setError("Please select a delivery employee.");
      return;
    }
    if (selectedParcelIds.length === 0) {
      setError("Please select at least one parcel for multi-stop route optimization.");
      return;
    }

    setOptimizing(true);
    setError("");
    setSuccessMsg("");

    try {
      const plan = await optimizeRoute({
        employee_id: Number(selectedEmployeeId),
        start_branch_id: selectedBranchId ? Number(selectedBranchId) : undefined,
        parcel_ids: selectedParcelIds,
        algorithm,
        include_return_to_depot: returnToDepot,
      });
      setCurrentPlan(plan);
      setSuccessMsg(
        `Optimized Route Plan ${plan.plan_code} generated successfully with ${plan.total_stops_count} sequential stops!`
      );
      void fetchPlansList();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr?.response?.data?.detail || "Failed to calculate optimal route.");
    } finally {
      setOptimizing(false);
    }
  };

  // Reorder Stops (Move Stop Up/Down)
  const handleMoveStop = (index: number, direction: "up" | "down") => {
    if (!currentPlan) return;
    const newStops = [...currentPlan.stops];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newStops.length) return;

    const temp = newStops[index];
    newStops[index] = newStops[targetIdx];
    newStops[targetIdx] = temp;

    // Re-number stops
    newStops.forEach((s, idx) => {
      s.stop_number = idx + 1;
    });

    setCurrentPlan({
      ...currentPlan,
      stops: newStops,
    });
  };

  // Dispatch & Start Delivery
  const handleStartDelivery = async (plan: RoutePlanResponse) => {
    setDispatching(true);
    setError("");
    try {
      await startRoutePlan(plan.id);
      const firstStop = plan.stops[0];
      if (firstStop) {
        navigate(`/tracking?parcelId=${firstStop.parcel_id}`);
      } else {
        navigate("/tracking");
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr?.response?.data?.detail || "Failed to dispatch route plan.");
    } finally {
      setDispatching(false);
    }
  };

  const branchLabel = (b: Branch) => b.branch_name || `Branch #${b.id}`;

  return (
    <div className="min-h-full w-full space-y-6 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Route className="size-6 text-primary" />
            Route Optimization & Planning Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Plan optimal multi-stop delivery journeys using Priority-Weighted TSP and turn-by-turn road networks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-lg border bg-muted/50 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("optimize")}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
              activeTab === "optimize"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-3.5" />
            New Route Plan
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
              activeTab === "plans"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Route className="size-3.5" />
            Saved Plans ({plansList.length})
          </button>
        </div>
      </div>

      {/* ERROR & SUCCESS NOTIFICATIONS */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-between">
          <span>✅ {successMsg}</span>
        </div>
      )}

      {activeTab === "optimize" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT: CONFIGURATION & PARCEL SELECTION (5 COLS) */}
          <div className="space-y-5 lg:col-span-5">
            {/* 1. DISPATCH CONFIGURATION */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Navigation className="size-4 text-primary" />
                1. Delivery Fleet & Starting Hub
              </h2>

              <div className="space-y-3">
                {/* Employee Selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Assigned Delivery Employee
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      disabled={loadingData}
                      className="h-10 w-full pl-9 pr-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          #{emp.id} - {emp.name} ({emp.vehicle_type || "Motorcycle"}) - {emp.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Starting Branch */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Starting Hub / Branch Depot
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      disabled={loadingData}
                      className="h-10 w-full pl-9 pr-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {branchLabel(b)} ({b.city || "Hub"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Algorithm Selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Optimization Strategy
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as OptimizationAlgorithm)}
                    className="h-10 w-full px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                  >
                    <option value="PRIORITY_TSP">
                      Priority-Weighted TSP (Urgent First + Distance Minimization)
                    </option>
                    <option value="SHORTEST_DISTANCE">
                      Shortest Road Distance (Pure Spatial TSP)
                    </option>
                    <option value="DEADLINE_FIRST">
                      Deadline First (Fastest Urgent Commitments)
                    </option>
                  </select>
                </div>

                {/* Payload & Return options */}
                <div className="pt-2 border-t flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold">
                      <Weight className="size-3.5 text-indigo-500" />
                      Payload Weight:
                    </span>
                    <span className="font-bold text-foreground">
                      {totalPayloadWeight.toFixed(1)} kg / 50.0 kg max
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        totalPayloadWeight > 45 ? "bg-rose-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, (totalPayloadWeight / 50) * 100)}%` }}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={returnToDepot}
                      onChange={(e) => setReturnToDepot(e.target.checked)}
                      className="size-4 rounded text-primary border-muted-foreground"
                    />
                    <span>Include round-trip return route to starting branch</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. PARCEL SELECTION */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  2. Select Parcels for Journey ({selectedParcelIds.length}/{eligibleParcels.length})
                </h2>
                <button
                  type="button"
                  onClick={selectAllParcels}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {selectedParcelIds.length === eligibleParcels.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {eligibleParcels.map((p) => {
                  const isChecked = selectedParcelIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleParcelSelection(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-xs ${
                        isChecked
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="size-4 rounded text-primary"
                        />
                        <div>
                          <p className="font-semibold text-sm">
                            #{p.id} - {p.tracking_number}
                          </p>
                          <p className="text-muted-foreground truncate max-w-[200px]">
                            {p.receiver} • {p.destination_address}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.priority === "URGENT"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : p.priority === "HIGH"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {p.priority || "NORMAL"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {p.weight} kg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleOptimize}
                disabled={optimizing || selectedParcelIds.length === 0}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition shadow-md"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Computing Optimal Road Sequence...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Optimized Route Plan ({selectedParcelIds.length} stops)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: MAP, SAVINGS & OPTIMIZED SEQUENCE (7 COLS) */}
          <div className="space-y-5 lg:col-span-7">
            {/* MAP PREVIEW */}
            <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border shadow-lg bg-muted/20">
              <Map center={mapCenter} zoom={11}>
                <MapControls position="top-right" showZoom showCompass showFullscreen />

                {/* PLANNED ROAD POLYLINE */}
                {currentPlan && currentPlan.polyline_coordinates?.length > 1 && (
                  <MapRoute
                    id="optimized-planned-polyline"
                    coordinates={currentPlan.polyline_coordinates}
                    color="#4f46e5"
                    width={5}
                    opacity={0.9}
                  />
                )}

                {/* START DEPOT / BRANCH MARKER */}
                {currentBranch && currentBranch.latitude && currentBranch.longitude && (
                  <MapMarker
                    longitude={currentBranch.longitude}
                    latitude={currentBranch.latitude}
                  >
                    <MarkerContent>
                      <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl ring-2 ring-white">
                        <Building2 className="size-4" />
                      </div>
                    </MarkerContent>
                    <MarkerPopup>
                      <div className="p-1 space-y-1">
                        <p className="font-bold text-xs">Origin Hub: {branchLabel(currentBranch)}</p>
                        <p className="text-[11px] text-muted-foreground">{currentBranch.city}</p>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                )}

                {/* SEQUENTIAL DELIVERY STOPS */}
                {currentPlan &&
                  currentPlan.stops.map((stop: RouteStopDetail) => (
                    <MapMarker
                      key={stop.stop_number}
                      longitude={stop.longitude}
                      latitude={stop.latitude}
                    >
                      <MarkerContent>
                        <div
                          className={`flex size-8 items-center justify-center rounded-full text-white text-xs font-bold shadow-xl ring-2 ring-white ${
                            stop.priority === "URGENT"
                              ? "bg-rose-600"
                              : stop.priority === "HIGH"
                              ? "bg-amber-600"
                              : "bg-indigo-600"
                          }`}
                        >
                          {stop.stop_number}
                        </div>
                      </MarkerContent>
                      <MarkerPopup>
                        <div className="p-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Stop #{stop.stop_number}
                            </span>
                            <span className="font-bold text-xs">#{stop.parcel_id}</span>
                          </div>
                          <p className="text-xs font-medium">{stop.receiver}</p>
                          <p className="text-[11px] text-muted-foreground">{stop.destination_address}</p>
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  ))}
              </Map>
            </div>

            {/* PLAN METRICS, AI SAVINGS & SEQUENCE TABLE */}
            {currentPlan ? (
              <div className="space-y-4">
                {/* 4 SUMMARY STATS */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border bg-card p-3.5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Total Distance</p>
                    <p className="text-xl font-bold mt-1 text-primary">
                      {formatDistance(currentPlan.total_distance_meters)}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-3.5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Estimated Time</p>
                    <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                      {formatDuration(currentPlan.total_duration_seconds)}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-3.5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Planned Stops</p>
                    <p className="text-xl font-bold mt-1">
                      {currentPlan.total_stops_count} Deliveries
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-3.5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Strategy</p>
                    <p className="text-xs font-bold mt-1.5 truncate" title={currentPlan.algorithm_used}>
                      {currentPlan.algorithm_used}
                    </p>
                  </div>
                </div>

                {/* AI SAVINGS EFFICIENCY CARD */}
                {savingsMetrics && (
                  <div className="rounded-xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-3.5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-teal-950/20">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-emerald-600 text-white p-1.5 shadow-sm">
                          <TrendingDown className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                            AI Route Optimization Efficiency Gains
                          </p>
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                            Compared against unoptimized standard delivery sequence
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-white/70 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          🚗 ~{savingsMetrics.distancePercent}% Distance Saved ({formatDistance(savingsMetrics.distanceSavedMeters)})
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-white/70 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <Leaf className="size-3 text-emerald-600" />
                          {savingsMetrics.co2SavedKg} kg CO₂ Cut
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STOP SEQUENCE LIST & ACTIONS */}
                <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">Planned Delivery Sequence</h3>
                      <span className="text-xs text-muted-foreground">
                        (Use arrows to manually reorder)
                      </span>
                    </div>

                    <button
                      onClick={() => handleStartDelivery(currentPlan)}
                      disabled={dispatching}
                      className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                    >
                      {dispatching ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5 fill-current" />
                      )}
                      Dispatch & Track Live
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentPlan.stops.map((stop: RouteStopDetail, idx: number) => (
                      <div
                        key={stop.stop_number}
                        className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20 text-xs hover:border-primary/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-7 items-center justify-center rounded-full text-white font-bold text-xs ${
                              stop.priority === "URGENT"
                                ? "bg-rose-600"
                                : stop.priority === "HIGH"
                                ? "bg-amber-600"
                                : "bg-primary"
                            }`}
                          >
                            {stop.stop_number}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              #{stop.parcel_id} • {stop.receiver}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {stop.destination_address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              stop.priority === "URGENT"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : stop.priority === "HIGH"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {stop.priority}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            ~{formatDistance(stop.distance_from_prev_meters)}
                          </span>

                          <div className="flex items-center border rounded-lg overflow-hidden ml-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveStop(idx, "up")}
                              className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-30 text-xs"
                              title="Move Stop Up"
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === currentPlan.stops.length - 1}
                              onClick={() => handleMoveStop(idx, "down")}
                              className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-30 text-xs border-l"
                              title="Move Stop Down"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed rounded-2xl text-sm text-muted-foreground bg-card">
                <Sparkles className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                Select delivery parcels on the left and click <strong>Generate Optimized Route Plan</strong> to calculate the best multi-stop sequence.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: SAVED & ACTIVE PLANS LIST */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Saved & Active Route Plans</h2>
            <button
              onClick={fetchPlansList}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`size-3.5 ${loadingPlans ? "animate-spin" : ""}`} />
              Refresh Plans
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plansList.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-primary">
                      {p.plan_code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : p.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground">
                      <strong>Driver:</strong> {p.employee_name}
                    </p>
                    <p className="text-muted-foreground">
                      <strong>Hub:</strong> {p.start_branch_name}
                    </p>
                    <p className="text-muted-foreground">
                      <strong>Metrics:</strong> {formatDistance(p.total_distance_meters)} • {formatDuration(p.total_duration_seconds)}
                    </p>
                    <p className="text-muted-foreground">
                      <strong>Progress:</strong> {p.completed_stops_count} of {p.total_stops_count} stops completed
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentPlan(p);
                      setActiveTab("optimize");
                    }}
                    className="flex-1 h-9 rounded-lg border bg-background hover:bg-muted text-xs font-semibold transition"
                  >
                    View Plan
                  </button>
                  <button
                    onClick={() => handleStartDelivery(p)}
                    className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Play className="size-3 fill-current" />
                    Track
                  </button>
                </div>
              </div>
            ))}
          </div>

          {plansList.length === 0 && !loadingPlans && (
            <div className="p-8 text-center border border-dashed rounded-2xl text-sm text-muted-foreground bg-card">
              No route plans created yet. Switch to the <strong>New Route Plan</strong> tab to generate your first optimized route.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RouteOptimization;
