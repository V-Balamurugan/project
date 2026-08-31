import { useEffect, useMemo, useState, useRef } from "react";
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
} from "lucide-react";
import {
  getRoadRoute,
  getTrackingByParcel,
  updateLocation,
  type DeliveryTracking as TrackingEvent,
  type RoadRoute,
} from "@/services/deliverytrackingService";
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
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remaining}m`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function DeliveryTracking() {
  const [parcelId, setParcelId] = useState("");
  const [parcelsList, setParcelsList] = useState<Parcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [tracking, setTracking] = useState<TrackingEvent[]>([]);
  const [route, setRoute] = useState<RoadRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveGpsActive, setLiveGpsActive] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState("");

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

  async function loadTracking(id: number) {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch tracking history
      try {
        const history = await getTrackingByParcel(id);
        setTracking(history);
      } catch {
        setTracking([]);
      }

      // 2. Fetch road route from OpenRouteService
      setRouteLoading(true);
      try {
        const roadRoute = await getRoadRoute(id);
        setRoute(roadRoute);
      } catch (routeErr: unknown) {
        const apiErr = routeErr as { response?: { data?: { detail?: string } } };
        setError(
          apiErr?.response?.data?.detail || "Unable to calculate road route.",
        );
      } finally {
        setRouteLoading(false);
      }
    } catch (err: unknown) {
      setTracking([]);
      setRoute(null);
      const apiErr = err as { response?: { data?: { detail?: string } } };
      setError(
        apiErr?.response?.data?.detail || "Unable to load delivery tracking.",
      );
    } finally {
      setLoading(false);
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
      const speed = pos.coords.speed !== null ? pos.coords.speed * 3.6 : undefined;
      const heading = pos.coords.heading !== null ? pos.coords.heading : undefined;

      try {
        await updateLocation({
          assignment_id: assignmentId,
          latitude: lat,
          longitude: lon,
          accuracy: accuracy || undefined,
          speed: speed || undefined,
          heading: heading || undefined,
          timestamp: new Date().toISOString(),
          location_name: "Mobile GPS Location",
        });
        setGpsStatusMsg(`GPS updated (${lat.toFixed(4)}, ${lon.toFixed(4)}) ±${Math.round(accuracy)}m`);
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

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
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

  return (
    <div className="min-h-full w-full space-y-5 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Delivery Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Live GPS tracking and road-following route powered by OpenRouteService.
          </p>
        </div>

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

      {gpsStatusMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          📍 {gpsStatusMsg}
        </div>
      )}

      {/* PARCEL SELECTION & SEARCH (DROPDOWN + INPUT) */}
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
          <div className="md:pt-5">
            <button
              onClick={() => void handleTrack()}
              disabled={loading || !parcelId}
              className="flex h-11 w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
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
            Calculating OpenRouteService road route...
          </div>
        )}

        <Map center={center} zoom={11}>
          {/* MAP CONTROLS */}
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
              color="#3b82f6"
              width={5}
              opacity={0.9}
            />
          )}

          {/* CURRENT VEHICLE (MOBILE GPS OR ORIGIN HUB) */}
          {vehicleLocation && (
            <MapMarker
              longitude={vehicleLocation.lng}
              latitude={vehicleLocation.lat}
            >
              <MarkerContent>
                <div className="relative flex size-12 items-center justify-center">
                  <div className="absolute size-12 animate-ping rounded-full bg-blue-500/25" />
                  <div className="relative flex size-10 items-center justify-center rounded-full bg-blue-500 shadow-xl ring-2 ring-white">
                    <Truck className="size-5 text-white" />
                  </div>
                </div>
              </MarkerContent>

              <MarkerPopup>
                <div className="w-64 space-y-3 p-1">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-blue-500 text-white">
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
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {vehicleLocation.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coordinates:</span>
                      <span className="font-mono">
                        {vehicleLocation.lat.toFixed(4)}, {vehicleLocation.lng.toFixed(4)}
                      </span>
                    </div>
                    {latest?.speed !== null && latest?.speed !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Speed:</span>
                        <span>{latest.speed.toFixed(1)} km/h</span>
                      </div>
                    )}
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

      {/* ROUTE INFORMATION */}
      {route && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Route className="size-4 text-blue-500" />
              <span className="text-xs font-semibold tracking-wider">ROAD DISTANCE (ORS)</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatDistance(route.distance_meters)}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="size-4 text-amber-500" />
              <span className="text-xs font-semibold tracking-wider">ESTIMATED TIME</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatDuration(route.duration_seconds)}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="size-4 text-emerald-500" />
                <span className="text-xs font-semibold tracking-wider">DELIVERY STATUS</span>
              </div>
              <button
                onClick={() => void loadTracking(Number(parcelId))}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                title="Refresh Status"
              >
                <RefreshCw className="size-3" />
                Refresh
              </button>
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-500">
              {latest?.status || selectedParcelMeta?.status || "REGISTERED"}
            </p>
          </div>
        </div>
      )}

      {/* TIMELINE */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Delivery Timeline</h2>
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{event.status}</p>
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
    </div>
  );
}

export default DeliveryTracking;