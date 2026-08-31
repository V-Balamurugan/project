import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
} from "@/components/ui/map";

import { Truck, MapPin, PackageCheck } from "lucide-react";

const route: [number, number][] = [
  [78.0951, 9.5121],
  [78.0965, 9.5200],
  [78.0980, 9.6000],
  [78.1000, 9.7000],
  [78.1000, 9.8500],
  [78.1100, 9.9000],
  [78.1198, 9.9252],
];

function MapTest() {
  return (
    <div className="w-full p-6">
      
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          Delivery Tracking
        </h1>

        <p className="text-sm text-muted-foreground">
          Live delivery location and route
        </p>
      </div>

      {/* Map */}
      <div className="h-[620px] w-full overflow-hidden rounded-2xl border bg-black shadow-lg">

        <Map
          center={[78.1000, 9.8000]}
          zoom={10}
        >

          {/* Controls */}
          <MapControls
            position="top-right"
            showZoom
            showCompass
            showFullscreen
          />

          {/* Delivery Route */}
          <MapRoute
            coordinates={route}
            color="#3b82f6"
            width={5}
            opacity={0.9}
          />

          {/* Pickup Marker */}
          <MapMarker
            longitude={78.0951}
            latitude={9.5121}
          >

            <MarkerContent>
              <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-xl">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500">
                  <MapPin className="size-4 text-white" />
                </div>
              </div>
            </MarkerContent>

            <MarkerPopup>

              <div className="w-52 space-y-2">

                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-500" />

                  <h3 className="font-semibold">
                    Pickup Location
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  Aruppukottai Branch
                </p>

                <p className="text-xs text-muted-foreground">
                  Parcel picked up
                </p>

              </div>

            </MarkerPopup>

          </MapMarker>


          {/* Current Delivery Marker */}
          <MapMarker
            longitude={78.1000}
            latitude={9.8500}
          >

            <MarkerContent>

              <div className="relative flex size-11 items-center justify-center">

                {/* Pulse */}
                <div className="absolute size-11 animate-ping rounded-full bg-blue-500/30" />

                {/* Marker */}
                <div className="relative flex size-9 items-center justify-center rounded-full bg-blue-500 shadow-xl ring-2 ring-white">

                  <Truck className="size-5 text-white" />

                </div>

              </div>

            </MarkerContent>

            <MarkerPopup>

              <div className="w-56 space-y-3">

                <div className="flex items-center gap-2">

                  <div className="flex size-8 items-center justify-center rounded-full bg-blue-500">

                    <Truck className="size-4 text-white" />

                  </div>

                  <div>

                    <h3 className="font-semibold">
                      Delivery Vehicle
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      EMP0001
                    </p>

                  </div>

                </div>

                <div className="space-y-1 text-sm">

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Status
                    </span>

                    <span className="font-medium text-blue-500">
                      In Transit
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Location
                    </span>

                    <span className="font-medium">
                      Madurai Road
                    </span>
                  </div>

                </div>

              </div>

            </MarkerPopup>

          </MapMarker>


          {/* Destination Marker */}
          <MapMarker
            longitude={78.1198}
            latitude={9.9252}
          >

            <MarkerContent>

              <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-xl">

                <div className="flex size-7 items-center justify-center rounded-full bg-red-500">

                  <PackageCheck className="size-4 text-white" />

                </div>

              </div>

            </MarkerContent>

            <MarkerPopup>

              <div className="w-52 space-y-2">

                <div className="flex items-center gap-2">

                  <PackageCheck className="size-4 text-red-500" />

                  <h3 className="font-semibold">
                    Destination
                  </h3>

                </div>

                <p className="text-sm text-muted-foreground">
                  Madurai
                </p>

                <p className="text-xs text-muted-foreground">
                  Delivery destination
                </p>

              </div>

            </MarkerPopup>

          </MapMarker>

        </Map>

      </div>


      {/* Bottom information */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">

        <div className="rounded-xl border bg-card p-4">

          <p className="text-xs text-muted-foreground">
            DELIVERY STATUS
          </p>

          <p className="mt-1 text-lg font-semibold text-blue-500">
            In Transit
          </p>

        </div>


        <div className="rounded-xl border bg-card p-4">

          <p className="text-xs text-muted-foreground">
            CURRENT LOCATION
          </p>

          <p className="mt-1 text-lg font-semibold">
            Madurai Road
          </p>

        </div>


        <div className="rounded-xl border bg-card p-4">

          <p className="text-xs text-muted-foreground">
            EMPLOYEE
          </p>

          <p className="mt-1 text-lg font-semibold">
            EMP0001
          </p>

        </div>

      </div>

    </div>
  );
}

export default MapTest;