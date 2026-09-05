import { useEffect, useMemo, useState, useRef } from "react";
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
  Truck,
  PackageCheck,
  Navigation,
  Loader2,
  Clock3,
  Route,
  MapPin,
  Radio,
  RefreshCw,
  Package,
  Gauge,
  Zap,
  Info,
  AlertTriangle,
  Compass,
  Timer,
  ShieldAlert,
  Play,
  Pause,
  Building2,
  User,
  Phone,
  Send,
  Eye,
  Check,
  XCircle,
  FileSignature,
  ShieldCheck,
} from "lucide-react";
import {
  getRoadRoute,
  getTrackingByParcel,
  getIdleStatus,
  updateLocation,
  createTrackingEvent,
  type DeliveryTracking as TrackingEvent,
  type RoadRoute,
  type IdleStatusResponse,
  type VehicleMotionState,
} from "@/services/deliveryTrackingService";
import { getActivePlanForParcel, type RoutePlanResponse } from "@/services/routeOptimizationService";
import { getParcels } from "@/api/parcelApi";
import type { Parcel } from "@/types/parcel";

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

function formatArrivalTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function DeliveryTracking() {
  const navigate = useNavigate();

  const [parcelId, setParcelId] = useState("");
  const [parcelsList, setParcelsList] = useState<Parcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [idleStatus, setIdleStatus] = useState<IdleStatusResponse | null>(null);
  const [activePlan, setActivePlan] = useState<RoutePlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [liveGpsActive, setLiveGpsActive] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState("");

  // Map Layer & Breadcrumb Controls
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);

  // Digital Proof of Delivery (POD) Dialog State
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [podRecipientName, setPodRecipientName] = useState("");
  const [podOtpCode, setPodOtpCode] = useState("");
  const [podRemarks, setPodRemarks] = useState("");
  const [podSubmitting, setPodSubmitting] = useState(false);

  // Customer Notification Simulation
  const [notifyingCustomer, setNotifyingCustomer] = useState(false);
  const [customerNotificationSent, setCustomerNotificationSent] = useState(false);

  // Live Simulation Player State
  const [simulating, setSimulating] = useState(false);
  const simIntervalRef = useRef<number | null>(null);
  const simStepRef = useRef<number>(0);

  const watchIdRef = useRef<number | null>(null);

  const latest = tracking.length > 0 ? tracking[tracking.length - 1] : null;

  // Selected parcel metadata if available
  const selectedParcelMeta = useMemo(() => {
    return parcelsList.find((p) => String(p.id) === parcelId);
  }, [parcelsList, parcelId]);

  // Vehicle location (either latest mobile GPS or parcel origin from route)
  const vehicleLocation = useMemo(() => {
    if (latest && latest.latitude !== null && latest.longitude !== null) {
      return {
        lat: latest.latitude,
        lng: latest.longitude,
        status: latest.status,
        employeeId: latest.employee_id,
        speed: latest.speed ?? 0,
        locationName: latest.location_name || "GPS Checkpoint",
        isLiveGps: true,
      };
    }
    if (route) {
      return {
        lat: route.current_latitude,
        lng: route.current_longitude,
        status: selectedParcelMeta?.status || "REGISTERED",
        employeeId: route.assignment_id || "Unassigned",
        speed: route.current_speed_kmph ?? 0,
        locationName: "Departure Origin",
        isLiveGps: false,
      };
    }
    return null;
  }, [latest, route, selectedParcelMeta]);

  const center = useMemo<[number, number]>(() => {
    if (vehicleLocation) {
      return [vehicleLocation.lng, vehicleLocation.lat];
    }
    if (route) {
      return [route.current_longitude, route.current_latitude];
    }
    return [78.1198, 9.9252];
  }, [vehicleLocation, route]);

  // Load list of available parcels for dropdown selection
  useEffect(() => {
    async function fetchParcels() {
      try {
        setLoadingParcels(true);
        const res = await getParcels({ limit: 100 });
        setParcelsList(res.parcels || []);
      } catch (err) {
        console.error("Failed to load parcels for tracking dropdown:", err);
      } finally {
        setLoadingParcels(false);
      }
    }
    void fetchParcels();
  }, []);

  async function loadTracking(id: number, forceRecalc: boolean = false) {
    if (forceRecalc) {
      setRecalculating(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      // 1. Fetch tracking history
      try {
        const history = await getTrackingByParcel(id);
        setTracking(history);
      } catch {
        setTracking([]);
      }

      // 2. Fetch road route and dynamic ETA
      setRouteLoading(true);
      try {
        const roadRoute = await getRoadRoute(id, forceRecalc);
        setRoute(roadRoute);
      } catch (routeErr: unknown) {
        const apiErr = routeErr as { response?: { data?: { detail?: string } } };
        setError(
          apiErr?.response?.data?.detail || "Unable to calculate road route.",
        );
      } finally {
        setRouteLoading(false);
      }

      // 3. Fetch smart stop & idle status
      try {
        const idle = await getIdleStatus(id);
        setIdleStatus(idle);
      } catch {
        setIdleStatus(null);
      }

      // 4. Fetch linked active route plan (if any)
      try {
        const plan = await getActivePlanForParcel(id);
        setActivePlan(plan);
      } catch {
        setActivePlan(null);
      }
    } catch (err: unknown) {
      setTracking([]);
      setRoute(null);
      setIdleStatus(null);
      setActivePlan(null);
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(
        apiErr?.response?.data?.detail || "Unable to load delivery tracking.",
      );
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }

  async function handleTrack(idToTrack?: number) {
    const targetId = idToTrack !== undefined ? idToTrack : Number(parcelId);
    if (!targetId || !Number.isInteger(targetId) || targetId <= 0) {
      setError("Please select or enter a valid parcel ID.");
      return;
    }
    await loadTracking(targetId);
  }

  const handleSelectParcel = (selectedVal: string) => {
    setParcelId(selectedVal);
    if (selectedVal) {
      const id = Number(selectedVal);
      if (Number.isInteger(id) && id > 0) {
        void handleTrack(id);
      }
    }
  };

  // Toggle Delivery Boy Device Mobile GPS broadcasting
  const toggleLiveGpsBroadcast = () => {
    if (liveGpsActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLiveGpsActive(false);
      setGpsStatusMsg("Mobile GPS broadcasting stopped.");
      return;
    }

    const assignmentId = latest?.assignment_id || route?.assignment_id;

    if (!assignmentId) {
      setError("Please select a parcel with an active delivery assignment to broadcast GPS.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser/device.");
      return;
    }

    setLiveGpsActive(true);
    setGpsStatusMsg("Acquiring GPS location...");

    const currentParcelId = Number(parcelId);

    const handlePosition = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      const rawSpeed = pos.coords.speed;
      const speedKmph =
        rawSpeed !== null && rawSpeed >= 0
          ? Math.round(rawSpeed * 3.6 * 10) / 10
          : 0.0;
      const heading = pos.coords.heading !== null ? pos.coords.heading : undefined;

      try {
        await updateLocation({
          assignment_id: assignmentId,
          latitude: lat,
          longitude: lon,
          accuracy: accuracy || undefined,
          speed: speedKmph,
          heading: heading || undefined,
          timestamp: new Date().toISOString(),
          location_name: "Mobile GPS Location",
        });
        setGpsStatusMsg(
          `GPS active: ${lat.toFixed(4)}, ${lon.toFixed(4)} | Speed: ${speedKmph.toFixed(1)} km/h | Acc: ±${Math.round(accuracy)}m`,
        );
        await loadTracking(currentParcelId);
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { detail?: string } } };
        setGpsStatusMsg(apiErr?.response?.data?.detail || "Failed to send GPS position.");
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      setGpsStatusMsg(`GPS error: ${err.message}`);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  // Live GPS Movement Simulation (Demo Player)
  const toggleSimulation = () => {
    if (simulating) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setSimulating(false);
      setGpsStatusMsg("Vehicle simulation paused.");
      return;
    }

    if (!route || !route.coordinates || route.coordinates.length < 2) {
      setError("Please load a route before starting the vehicle simulation.");
      return;
    }

    const assignmentId = latest?.assignment_id || route.assignment_id;
    if (!assignmentId) {
      setError("Active delivery assignment required for simulation.");
      return;
    }

    setSimulating(true);
    setGpsStatusMsg("Simulating real-time vehicle movement along road route...");

    const coords = route.coordinates;
    const currentParcelId = Number(parcelId);

    simIntervalRef.current = window.setInterval(async () => {
      simStepRef.current = (simStepRef.current + 1) % coords.length;
      const currentCoord = coords[simStepRef.current];
      const simLon = currentCoord[0];
      const simLat = currentCoord[1];
      const simSpeed = 32.0 + Math.random() * 8.0;

      try {
        await updateLocation({
          assignment_id: assignmentId,
          latitude: simLat,
          longitude: simLon,
          accuracy: 5.0,
          speed: Math.round(simSpeed * 10) / 10,
          timestamp: new Date().toISOString(),
          location_name: "Simulated Vehicle GPS",
        });
        setGpsStatusMsg(
          `Simulated GPS: ${simLat.toFixed(4)}, ${simLon.toFixed(4)} | Speed: ${simSpeed.toFixed(1)} km/h`,
        );
        await loadTracking(currentParcelId);
      } catch {
        // Continue simulation
      }
    }, 4000);
  };

  // Simulate Deviation Event (+300m off road)
  const triggerDeviationSimulation = async () => {
    const assignmentId = latest?.assignment_id || route?.assignment_id;
    if (!assignmentId || !vehicleLocation) {
      setError("Please track a valid delivery before simulating deviation.");
      return;
    }
    const currentParcelId = Number(parcelId);
    const deviatedLat = vehicleLocation.lat + 0.0035;
    const deviatedLon = vehicleLocation.lng + 0.0035;

    try {
      await updateLocation({
        assignment_id: assignmentId,
        latitude: deviatedLat,
        longitude: deviatedLon,
        speed: 25.0,
        timestamp: new Date().toISOString(),
        location_name: "Simulated Off-Route Location",
      });
      setGpsStatusMsg(`Simulated deviation coordinate sent: ${deviatedLat.toFixed(4)}, ${deviatedLon.toFixed(4)}`);
      await loadTracking(currentParcelId, true);
    } catch {
      setError("Failed to simulate deviation coordinate.");
    }
  };

  // Complete Stop with Proof of Delivery (POD)
  const handleConfirmPOD = async () => {
    if (!latest && !route) return;
    const currentParcelId = Number(parcelId);
    const assignmentId = latest?.assignment_id || route?.assignment_id;
    const employeeId = latest?.employee_id || 1;

    setPodSubmitting(true);
    try {
      const remarksText = `Digital POD: Received by ${podRecipientName || "Customer"} (OTP: ${podOtpCode || "VERIFIED"}). ${podRemarks || ""}`.trim();

      await createTrackingEvent({
        parcel_id: currentParcelId,
        assignment_id: assignmentId || 1,
        employee_id: employeeId,
        status: "DELIVERED",
        remarks: remarksText,
      });

      setPodModalOpen(false);
      setSuccessMsg(`Delivery successfully verified and marked DELIVERED for Parcel #${currentParcelId}!`);

      await loadTracking(currentParcelId);

      // Advance to next stop in plan if available
      if (activePlan) {
        const remainingStops = activePlan.stops.filter(
          (s) => s.status === "PENDING" && s.parcel_id !== currentParcelId
        );
        if (remainingStops.length > 0) {
          const nextStop = remainingStops[0];
          setTimeout(() => {
            setParcelId(String(nextStop.parcel_id));
            void loadTracking(nextStop.parcel_id);
          }, 1400);
        }
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(apiErr?.response?.data?.detail || "Failed to submit Proof of Delivery.");
    } finally {
      setPodSubmitting(false);
    }
  };

  // Simulate Sending Customer Notification SMS
  const handleSendCustomerSMS = () => {
    setNotifyingCustomer(true);
    setTimeout(() => {
      setNotifyingCustomer(false);
      setCustomerNotificationSent(true);
      setTimeout(() => setCustomerNotificationSent(false), 5000);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get("parcelId");
    if (!queryId) {
      return;
    }
    const id = Number(queryId);
    if (!Number.isInteger(id) || id <= 0) {
      return;
    }
    setParcelId(queryId);
    void loadTracking(id);
  }, []);

  const currentSpeed = route?.current_speed_kmph ?? latest?.speed ?? 0.0;
  const isStationary = route?.is_stationary ?? currentSpeed <= 1.5;
  const remainingSeconds = route?.estimated_remaining_seconds ?? route?.duration_seconds ?? 0;
  const isDeviated = route?.is_route_deviated ?? false;
  const deviationDistance = route?.distance_from_route_meters ?? 0.0;
  const isRecalculated = route?.route_recalculated ?? false;

  const motionStatus: VehicleMotionState =
    idleStatus?.vehicle_status ??
    route?.vehicle_status ??
    (currentSpeed > 3.0 ? "MOVING" : isStationary ? "TEMPORARILY_STOPPED" : "MOVING");

  const idleMins = idleStatus?.idle_duration_minutes ?? route?.idle_duration_minutes ?? 0;
  const hasDelayWarning = idleStatus?.delay_warning ?? route?.delay_warning ?? false;

  return (
    <div className="min-h-full w-full space-y-5 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Compass className="size-6 text-primary" />
            Live Delivery Tracking & Telemetry Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time GPS tracking, smart idle detection, route deviation monitoring, and dynamic speed-based ETA.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Breadcrumb Toggle */}
          <button
            onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border ${
              showBreadcrumbs
                ? "bg-secondary text-secondary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            <Eye className="size-3.5" />
            {showBreadcrumbs ? "Hide GPS Trail" : "Show GPS Trail"}
          </button>

          {/* Simulation Toggle */}
          {route && (
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border ${
                simulating
                  ? "bg-amber-600 text-white border-amber-700 animate-pulse"
                  : "bg-background hover:bg-muted text-foreground"
              }`}
            >
              {simulating ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
              {simulating ? "Pause Simulator" : "Simulate GPS Run"}
            </button>
          )}

          {(latest?.assignment_id || route?.assignment_id) && (
            <button
              onClick={toggleLiveGpsBroadcast}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                liveGpsActive
                  ? "bg-red-600 text-white animate-pulse"
                  : "border bg-background hover:bg-muted text-foreground"
              }`}
            >
              <Radio className="size-4" />
              {liveGpsActive ? "Broadcasting Mobile GPS" : "Broadcast Device GPS"}
            </button>
          )}
        </div>
      </div>

      {gpsStatusMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          📍 {gpsStatusMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✅ {successMsg}
        </div>
      )}

      {/* MULTI-STOP ROUTE PLAN PROGRESS & STEPPER */}
      {activePlan && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-background to-purple-50/50 p-4 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-purple-950/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 text-white p-1.5 shadow-sm">
                <Route className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Active Multi-Stop Plan: {activePlan.plan_code}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Driver: {activePlan.employee_name} • {activePlan.completed_stops_count} of {activePlan.total_stops_count} Deliveries Completed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPodModalOpen(true)}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
              >
                <FileSignature className="size-3.5" />
                Proof of Delivery (POD)
              </button>
              <button
                onClick={() => navigate("/routes")}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                View Full Plan →
              </button>
            </div>
          </div>

          {/* Interactive Stops Stepper */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {/* Depot */}
            <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold">
              <Building2 className="size-3" />
              <span>Depot</span>
            </div>
            <span className="text-muted-foreground">→</span>

            {activePlan.stops.map((stop, idx) => {
              const isCurrent = String(stop.parcel_id) === parcelId;
              const isCompleted = stop.status === "COMPLETED";
              return (
                <div key={stop.stop_number} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setParcelId(String(stop.parcel_id));
                      void loadTracking(stop.parcel_id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow ring-2 ring-primary/30 font-bold"
                        : isCompleted
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="size-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                      {isCompleted ? "✓" : stop.stop_number}
                    </span>
                    <span>#{stop.parcel_id} {stop.receiver}</span>
                  </button>
                  {idx < activePlan.stops.length - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PROLONGED IDLE DELAY ALERT BANNER */}
      {hasDelayWarning && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="size-5 shrink-0" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Prolonged Vehicle Idle Alert ({idleMins} mins stationary)
                </h3>
                <span className="rounded-full bg-rose-200/60 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-900/80 dark:text-rose-300">
                  Potential Delivery Delay
                </span>
              </div>
              <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-300/80">
                The delivery vehicle has been stationary for over 15 minutes. The Dynamic ETA has been adjusted to account for the unexpected stoppage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ROUTE DEVIATION BANNER */}
      {isDeviated && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5 shrink-0" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Route Deviation Detected ({deviationDistance}m off route)
                </h3>
                <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/80 dark:text-amber-300">
                  Threshold: {route?.deviation_threshold_meters ?? 150}m
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/80">
                The delivery vehicle moved away from the planned route. A new road route and Dynamic ETA have been automatically recalculated from the current position to destination.
              </p>
            </div>
            <button
              onClick={() => void loadTracking(Number(parcelId), true)}
              disabled={recalculating}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
            >
              <RefreshCw className={`size-3.5 ${recalculating ? "animate-spin" : ""}`} />
              Recalculate
            </button>
          </div>
        </div>
      )}

      {/* PARCEL SELECTION & SEARCH */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* Dropdown Selector */}
          <div className="flex-1">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Package className="size-3.5" />
              Select Parcel from Dropdown
            </label>
            <select
              value={parcelId}
              onChange={(e) => handleSelectParcel(e.target.value)}
              disabled={loadingParcels}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
            >
              <option value="">
                {loadingParcels
                  ? "Loading parcels..."
                  : "-- Choose a Parcel to Track --"}
              </option>
              {parcelsList.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} - {p.tracking_number} ({p.status}) → {p.receiver || "Customer"}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden text-xs text-muted-foreground font-medium md:flex md:items-center md:pt-5">
            OR
          </div>

          {/* Manual ID Input */}
          <div className="w-full md:w-56">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Enter Parcel ID
            </label>
            <input
              value={parcelId}
              onChange={(event) => setParcelId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleTrack();
                }
              }}
              placeholder="e.g. 204"
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Track Button */}
          <div className="md:pt-5 flex items-center gap-2">
            <button
              onClick={() => void handleTrack()}
              disabled={loading || !parcelId}
              className="flex h-11 w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Navigation className="size-4" />
                  Track Delivery
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* MAP */}
      <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border shadow-xl">
        {routeLoading && (
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-sm shadow-lg backdrop-blur">
            <Loader2 className="size-4 animate-spin" />
            Analyzing route geometry, vehicle telemetry & idle state...
          </div>
        )}

        {/* Floating Route & Motion Status Badges */}
        {route && (
          <div className="absolute left-4 bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-background/90 p-2.5 shadow-lg backdrop-blur border text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div
                className={`size-2.5 rounded-full ${
                  motionStatus === "MOVING"
                    ? "bg-emerald-500 animate-pulse"
                    : motionStatus === "TEMPORARILY_STOPPED"
                    ? "bg-amber-500"
                    : motionStatus === "IDLE"
                    ? "bg-orange-500"
                    : "bg-rose-500 animate-ping"
                }`}
              />
              <span className="font-semibold">
                {motionStatus === "MOVING"
                  ? "🟢 Moving"
                  : motionStatus === "TEMPORARILY_STOPPED"
                  ? `🟡 Stopped (${idleMins}m)`
                  : motionStatus === "IDLE"
                  ? `🟠 Idle (${idleMins}m)`
                  : `🔴 Long Idle (${idleMins}m)`}
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>
                {isDeviated
                  ? `Route Deviation (${deviationDistance}m)`
                  : isRecalculated
                  ? "Route Recalculated"
                  : `On Route (${deviationDistance}m)`}
              </span>
            </div>
          </div>
        )}

        {/* Floating Testing Controls */}
        {route && (
          <div className="absolute right-4 bottom-4 z-20 flex items-center gap-1.5 rounded-xl bg-background/90 p-2 shadow-lg backdrop-blur border text-xs">
            <span className="text-muted-foreground font-semibold px-1 text-[11px]">Testing:</span>
            <button
              onClick={triggerDeviationSimulation}
              className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[11px] hover:bg-amber-100 transition"
              title="Test route deviation alert"
            >
              Test Deviation
            </button>
            <button
              onClick={() => setPodModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px] hover:bg-emerald-100 transition flex items-center gap-1"
              title="Open Proof of Delivery Modal"
            >
              <FileSignature className="size-3" />
              Complete POD
            </button>
          </div>
        )}

        <Map center={center} zoom={11}>
          <MapControls
            position="top-right"
            showZoom
            showCompass
            showLocate
            showFullscreen
          />

          {/* ORS ROAD ROUTE */}
          {route && route.coordinates && route.coordinates.length > 1 && (
            <MapRoute
              id="delivery-road-route"
              coordinates={route.coordinates}
              color={isDeviated ? "#f59e0b" : "#2563eb"}
              width={5}
              opacity={0.9}
            />
          )}

          {/* HISTORICAL GPS BREADCRUMBS TRAIL */}
          {showBreadcrumbs &&
            tracking
              .filter((t) => t.latitude !== null && t.longitude !== null)
              .map((t, idx) => (
                <MapMarker
                  key={`breadcrumb-${t.id}-${idx}`}
                  longitude={t.longitude!}
                  latitude={t.latitude!}
                >
                  <MarkerContent>
                    <div className="size-3 rounded-full bg-blue-500 ring-2 ring-white opacity-80" />
                  </MarkerContent>
                  <MarkerPopup>
                    <div className="p-1 text-[11px] space-y-1">
                      <p className="font-bold">Checkpoint #{idx + 1}</p>
                      <p className="text-muted-foreground">{formatDate(t.timestamp)}</p>
                      {t.speed !== undefined && t.speed !== null && (
                        <p className="font-semibold">{t.speed.toFixed(1)} km/h</p>
                      )}
                    </div>
                  </MarkerPopup>
                </MapMarker>
              ))}

          {/* CURRENT VEHICLE */}
          {vehicleLocation && (
            <MapMarker
              longitude={vehicleLocation.lng}
              latitude={vehicleLocation.lat}
            >
              <MarkerContent>
                <div className="relative flex size-12 items-center justify-center">
                  <div
                    className={`absolute size-12 rounded-full ${
                      motionStatus === "LONG_IDLE"
                        ? "animate-ping bg-rose-500/30"
                        : isDeviated
                        ? "animate-ping bg-amber-500/30"
                        : motionStatus === "MOVING"
                        ? "animate-ping bg-emerald-500/25"
                        : "bg-amber-500/20"
                    }`}
                  />
                  <div
                    className={`relative flex size-10 items-center justify-center rounded-full shadow-xl ring-2 ring-white ${
                      motionStatus === "LONG_IDLE"
                        ? "bg-rose-600"
                        : motionStatus === "IDLE"
                        ? "bg-orange-600"
                        : motionStatus === "TEMPORARILY_STOPPED"
                        ? "bg-amber-600"
                        : "bg-emerald-600"
                    }`}
                  >
                    <Truck className="size-5 text-white" />
                  </div>
                </div>
              </MarkerContent>

              <MarkerPopup>
                <div className="w-64 space-y-3 p-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-9 items-center justify-center rounded-full text-white ${
                        motionStatus === "LONG_IDLE"
                          ? "bg-rose-600"
                          : motionStatus === "IDLE"
                          ? "bg-orange-600"
                          : motionStatus === "TEMPORARILY_STOPPED"
                          ? "bg-amber-600"
                          : "bg-emerald-600"
                      }`}
                    >
                      <Truck className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Delivery Vehicle</p>
                      <p className="text-xs text-muted-foreground">
                        {vehicleLocation.isLiveGps
                          ? `Employee #${vehicleLocation.employeeId}`
                          : "At Origin Hub"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Motion State:</span>
                      <span
                        className={`font-semibold ${
                          motionStatus === "MOVING"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : motionStatus === "TEMPORARILY_STOPPED"
                            ? "text-amber-600 dark:text-amber-400"
                            : motionStatus === "IDLE"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {motionStatus === "MOVING"
                          ? "🟢 Moving"
                          : motionStatus === "TEMPORARILY_STOPPED"
                          ? "🟡 Stopped"
                          : motionStatus === "IDLE"
                          ? "🟠 Idle"
                          : "🔴 Long Idle"}
                      </span>
                    </div>

                    {motionStatus !== "MOVING" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stationary For:</span>
                        <span className="font-medium text-foreground">{idleMins} mins</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route Status:</span>
                      <span
                        className={`font-semibold ${
                          isDeviated
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {isDeviated
                          ? `Deviated (${deviationDistance}m)`
                          : `On Track (${deviationDistance}m)`}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle Speed:</span>
                      <span className="font-semibold text-foreground">
                        {currentSpeed.toFixed(1)} km/h
                      </span>
                    </div>

                    {route?.estimated_arrival_time && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Arrival:</span>
                        <span className="font-semibold text-foreground">
                          {formatArrivalTime(route.estimated_arrival_time)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coordinates:</span>
                      <span className="font-mono">
                        {vehicleLocation.lat.toFixed(4)}, {vehicleLocation.lng.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {vehicleLocation.locationName}
                      </span>
                    </div>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          )}

          {/* DESTINATION */}
          {route && (
            <MapMarker
              longitude={route.destination_longitude}
              latitude={route.destination_latitude}
            >
              <MarkerContent>
                <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-xl">
                  <div className="flex size-8 items-center justify-center rounded-full bg-red-500">
                    <PackageCheck className="size-4 text-white" />
                  </div>
                </div>
              </MarkerContent>

              <MarkerPopup>
                <div className="w-52 space-y-2 p-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-red-500" />
                    <p className="font-semibold text-sm">Destination</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Parcel delivery address
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {route.destination_latitude.toFixed(4)}, {route.destination_longitude.toFixed(4)}
                  </p>
                </div>
              </MarkerPopup>
            </MapMarker>
          )}
        </Map>
      </div>

      {/* DYNAMIC ROUTE & VEHICLE METRICS (5 CARDS) */}
      {route && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* REMAINING ROAD DISTANCE */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Route className="size-4 text-blue-500" />
              <span className="text-xs font-semibold tracking-wider uppercase">Remaining Road Distance</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatDistance(route.distance_meters)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Turn-by-turn road network
            </p>
          </div>

          {/* REAL-TIME DYNAMIC ETA */}
          <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="size-4 text-amber-500" />
                <span className="text-xs font-semibold tracking-wider uppercase">Estimated Time</span>
              </div>
              {route.estimated_arrival_time && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                  ETA ~{formatArrivalTime(route.estimated_arrival_time)}
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatDuration(remainingSeconds)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3 shrink-0" />
              {hasDelayWarning
                ? "Delayed due to prolonged idle"
                : isStationary
                ? "Vehicle stationary: traffic speed estimated"
                : "Calibrated to vehicle's active speed"}
            </p>
          </div>

          {/* SMART STOP & IDLE STATUS */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="size-4 text-orange-500" />
                <span className="text-xs font-semibold tracking-wider uppercase">Motion State</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  motionStatus === "MOVING"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : motionStatus === "TEMPORARILY_STOPPED"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : motionStatus === "IDLE"
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                }`}
              >
                {motionStatus === "MOVING"
                  ? "Moving"
                  : motionStatus === "TEMPORARILY_STOPPED"
                  ? "Stopped"
                  : motionStatus === "IDLE"
                  ? "Idle"
                  : "Long Idle"}
              </span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {motionStatus === "MOVING" ? "Active Motion" : `${idleMins} mins stationary`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground truncate" title={idleStatus?.status_description}>
              {idleStatus?.status_description || (motionStatus === "MOVING" ? "Vehicle is on the move" : "Vehicle is stopped")}
            </p>
          </div>

          {/* ROUTE ALIGNMENT / DEVIATION STATUS */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Compass className="size-4 text-violet-500" />
                <span className="text-xs font-semibold tracking-wider uppercase">Route Tracking</span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isDeviated
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : isRecalculated
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {isDeviated ? "Deviated" : isRecalculated ? "Recalculated" : "On Route"}
              </span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {deviationDistance} <span className="text-sm font-normal text-muted-foreground">m off route</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Allowed threshold: {route.deviation_threshold_meters ?? 150}m
            </p>
          </div>

          {/* VEHICLE SPEED & CONTROLS */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="size-4 text-indigo-500" />
                <span className="text-xs font-semibold tracking-wider uppercase">Speed & Actions</span>
              </div>
              <button
                onClick={() => void loadTracking(Number(parcelId), true)}
                disabled={recalculating}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition p-1 rounded hover:bg-muted"
                title="Force recalculate route"
              >
                <RefreshCw className={`size-3 ${recalculating ? "animate-spin" : ""}`} />
                Recalc
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-bold">
                {currentSpeed.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km/h</span>
              </p>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  motionStatus === "MOVING"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {motionStatus === "MOVING" && <Zap className="size-2.5 inline mr-0.5 fill-current" />}
                {motionStatus}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Status: {latest?.status || selectedParcelMeta?.status || "REGISTERED"}
            </p>
          </div>
        </div>
      )}

      {/* DRIVER & CUSTOMER DISPATCH PROFILES */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* DRIVER PROFILE */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <User className="size-4 text-primary" />
              Delivery Driver & Vehicle
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Active Shift
            </span>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              #{latest?.employee_id || 1}
            </div>
            <div className="flex-1 text-xs space-y-0.5">
              <p className="font-semibold text-sm">
                Driver ID #{latest?.employee_id || 1}
              </p>
              <p className="text-muted-foreground">
                Vehicle: Motorcycle • Assignment #{latest?.assignment_id || route?.assignment_id || 1}
              </p>
              <p className="text-muted-foreground">
                Current Speed: {currentSpeed.toFixed(1)} km/h • Motion: {motionStatus}
              </p>
            </div>

            <a
              href="tel:1800123456"
              className="h-8 px-3 rounded-lg border bg-background hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Phone className="size-3 text-primary" />
              Call Driver
            </a>
          </div>
        </div>

        {/* CUSTOMER PROFILE & SMS NOTIFICATION */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Receiver & Delivery Info
            </h3>
            {selectedParcelMeta?.priority && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedParcelMeta.priority === "URGENT"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : selectedParcelMeta.priority === "HIGH"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {selectedParcelMeta.priority} Priority
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 text-xs">
            <div>
              <p className="font-semibold text-sm">
                {selectedParcelMeta?.receiver || "Customer Name"}
              </p>
              <p className="text-muted-foreground truncate max-w-[240px]">
                {selectedParcelMeta?.destination_address || route?.destination_latitude ? "Destination Address Set" : "Address Pending"}
              </p>
            </div>

            <button
              onClick={handleSendCustomerSMS}
              disabled={notifyingCustomer || customerNotificationSent}
              className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                customerNotificationSent
                  ? "bg-emerald-600 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {notifyingCustomer ? (
                <Loader2 className="size-3 animate-spin" />
              ) : customerNotificationSent ? (
                <Check className="size-3" />
              ) : (
                <Send className="size-3" />
              )}
              {customerNotificationSent ? "SMS Sent!" : "Notify Receiver"}
            </button>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Delivery Timeline & Checkpoints</h2>
            <p className="text-xs text-muted-foreground">
              Parcel movement history & GPS checkpoints ({tracking.length} recorded events)
            </p>
          </div>
        </div>

        {tracking.length > 0 ? (
          <div className="mt-6 space-y-0">
            {tracking.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                    {index + 1}
                  </div>
                  {index < tracking.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>

                <div className="pb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{event.status}</p>
                    {event.speed !== null && event.speed !== undefined && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                        {event.speed.toFixed(1)} km/h
                      </span>
                    )}
                    {event.latitude !== null && event.longitude !== null && (
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {event.location_name || "Location recorded via GPS"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDate(event.timestamp)}
                  </p>
                  {event.remarks && (
                    <p className="mt-1.5 text-xs bg-muted/50 p-2 rounded-md border text-muted-foreground">
                      {event.remarks}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
            No live GPS checkpoints recorded yet. The map displays the scheduled road route between the origin hub and destination.
          </div>
        )}
      </div>

      {/* PROOF OF DELIVERY (POD) MODAL */}
      {podModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSignature className="size-5 text-primary" />
                Proof of Delivery (POD)
              </h3>
              <button
                onClick={() => setPodModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  Recipient Name / Relation
                </label>
                <input
                  type="text"
                  value={podRecipientName}
                  onChange={(e) => setPodRecipientName(e.target.value)}
                  placeholder="e.g. John Doe (Self / Family)"
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Customer Delivery OTP / Signature Code
                </label>
                <input
                  type="text"
                  value={podOtpCode}
                  onChange={(e) => setPodOtpCode(e.target.value)}
                  placeholder="e.g. 5842"
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Delivery Remarks (Optional)
                </label>
                <textarea
                  value={podRemarks}
                  onChange={(e) => setPodRemarks(e.target.value)}
                  placeholder="Handed over directly with contactless verification."
                  rows={2}
                  className="w-full rounded-lg border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setPodModalOpen(false)}
                className="h-9 px-4 rounded-lg border bg-background hover:bg-muted text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPOD}
                disabled={podSubmitting}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
              >
                {podSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                Confirm & Mark Delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryTracking;