from datetime import datetime, timedelta, timezone
import math

from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.delivery_assignment import DeliveryAssignment
from app.models.delivery_tracking import DeliveryTracking
from app.models.employee import Employee
from app.models.parcel import Parcel
from app.models.route_plan import RoutePlan


from app.schemas.delivery_tracking import (
    DeliveryTrackingCreate,
    LocationUpdateCreate,
)

from app.services.ors_client import ORSClient


class DeliveryTrackingService:

    ALLOWED_TRANSITIONS = {
        "ASSIGNED": {
            "PICKED_UP",
            "CANCELLED",
        },
        "PICKED_UP": {
            "IN_TRANSIT",
            "CANCELLED",
        },
        "IN_TRANSIT": {
            "DELIVERED",
            "CANCELLED",
        },
    }

    FINAL_STATUSES = {
        "DELIVERED",
        "CANCELLED",
    }

    DEFAULT_DEVIATION_THRESHOLD_METERS = 150.0

    # Stop & Idle Detection Constants
    MIN_MOVEMENT_DISTANCE_METERS = 30.0
    MIN_MOVING_SPEED_KMPH = 3.0
    TEMPORARY_STOP_THRESHOLD_MINUTES = 5.0
    IDLE_THRESHOLD_MINUTES = 5.0
    LONG_IDLE_THRESHOLD_MINUTES = 15.0

    # In-memory cache for active routes:
    # key: parcel_id -> value: {
    #     "route": dict,
    #     "destination": tuple[float, float],
    #     "last_recalculated_at": datetime,
    #     "last_coordinates": list[list[float]],
    # }
    ACTIVE_ROUTES_CACHE: dict = {}



    # ========================================================
    # PARCEL
    # ========================================================

    @staticmethod
    def get_parcel(
        db: Session,
        parcel_id: int,
    ) -> Parcel:

        parcel = (
            db.query(Parcel)
            .filter(Parcel.id == parcel_id)
            .first()
        )

        if not parcel:
            raise LookupError(
                "Parcel not found."
            )

        return parcel

    # ========================================================
    # ASSIGNMENT
    # ========================================================

    @staticmethod
    def get_assignment(
        db: Session,
        assignment_id: int,
    ) -> DeliveryAssignment:

        assignment = (
            db.query(DeliveryAssignment)
            .filter(
                DeliveryAssignment.id == assignment_id
            )
            .first()
        )

        if not assignment:
            raise LookupError(
                "Delivery assignment not found."
            )

        return assignment

    # ========================================================
    # EMPLOYEE
    # ========================================================

    @staticmethod
    def get_employee(
        db: Session,
        employee_id: int,
    ) -> Employee:

        employee = (
            db.query(Employee)
            .filter(Employee.id == employee_id)
            .first()
        )

        if not employee:
            raise LookupError(
                "Employee not found."
            )

        return employee

    # ========================================================
    # CALCULATE GPS DISTANCE
    # HAVERSINE FORMULA
    # ========================================================

    @staticmethod
    def calculate_distance_meters(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:

        earth_radius = 6371000

        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)

        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        delta_lat = lat2_rad - lat1_rad
        delta_lon = lon2_rad - lon1_rad

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad)
            * math.cos(lat2_rad)
            * math.sin(delta_lon / 2) ** 2
        )

        c = 2 * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a),
        )

        return earth_radius * c

    # ========================================================
    # CALCULATE DISTANCE FROM GPS POINT TO ROUTE SEGMENT
    # ========================================================

    @staticmethod
    def calculate_distance_to_segment(
        p_lat: float,
        p_lon: float,
        a_lat: float,
        a_lon: float,
        b_lat: float,
        b_lon: float,
    ) -> float:
        """
        Calculates the perpendicular distance in meters from point P
        to line segment AB on the Earth's surface.
        """
        mean_lat_rad = math.radians((a_lat + b_lat + p_lat) / 3.0)
        cos_lat = math.cos(mean_lat_rad)

        kx = 111320.0 * cos_lat
        ky = 110574.0

        ax = a_lon * kx
        ay = a_lat * ky
        bx = b_lon * kx
        by = b_lat * ky
        px = p_lon * kx
        py = p_lat * ky

        dx = bx - ax
        dy = by - ay

        seg_len_sq = dx * dx + dy * dy
        if seg_len_sq == 0:
            return math.hypot(px - ax, py - ay)

        t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
        t = max(0.0, min(1.0, t))

        proj_x = ax + t * dx
        proj_y = ay + t * dy

        return math.hypot(px - proj_x, py - proj_y)

    # ========================================================
    # CALCULATE MINIMUM DISTANCE TO ROUTE GEOMETRY
    # ========================================================

    @staticmethod
    def calculate_distance_to_route(
        lat: float,
        lon: float,
        coordinates: list[list[float]],
    ) -> float:
        """
        Calculates the minimum distance (in meters) between the point (lat, lon)
        and the entire route polyline (coordinates: list of [lon, lat]).
        """
        if not coordinates or len(coordinates) < 2:
            return 0.0

        min_distance = float("inf")
        for i in range(len(coordinates) - 1):
            a_lon, a_lat = coordinates[i][0], coordinates[i][1]
            b_lon, b_lat = coordinates[i + 1][0], coordinates[i + 1][1]

            dist = DeliveryTrackingService.calculate_distance_to_segment(
                p_lat=lat,
                p_lon=lon,
                a_lat=a_lat,
                a_lon=a_lon,
                b_lat=b_lat,
                b_lon=b_lon,
            )
            if dist < min_distance:
                min_distance = dist

        return round(min_distance, 1)

    # ========================================================
    # SMART STOP & IDLE DETECTION
    # ========================================================

    @staticmethod
    def detect_vehicle_idle_status(
        db: Session,
        parcel_id: int,
        assignment_id: int | None = None,
        min_movement_meters: float = MIN_MOVEMENT_DISTANCE_METERS,
        min_moving_speed: float = MIN_MOVING_SPEED_KMPH,
    ) -> dict:
        """
        Intelligently analyzes the recent GPS trajectory history to determine
        if the vehicle is actively MOVING, TEMPORARILY_STOPPED, IDLE, or LONG_IDLE.
        Calculates exact stationary duration, last movement timestamp, and delay impact.
        """
        query = db.query(DeliveryTracking)
        if assignment_id:
            query = query.filter(DeliveryTracking.assignment_id == assignment_id)
        else:
            query = query.filter(DeliveryTracking.parcel_id == parcel_id)

        records = (
            query.filter(DeliveryTracking.latitude.isnot(None))
            .filter(DeliveryTracking.longitude.isnot(None))
            .order_by(DeliveryTracking.timestamp.desc())
            .limit(100)
            .all()
        )

        if not records:
            return {
                "parcel_id": parcel_id,
                "assignment_id": assignment_id or 0,
                "vehicle_status": "MOVING",
                "is_idle": False,
                "is_long_idle": False,
                "idle_duration_seconds": 0,
                "idle_duration_minutes": 0,
                "idle_started_at": None,
                "last_movement_at": None,
                "current_speed_kmph": 0.0,
                "movement_distance_meters": 0.0,
                "stationary_radius_meters": min_movement_meters,
                "status_description": "No GPS telemetry recorded yet",
                "delay_warning": False,
                "estimated_delay_minutes": 0,
            }

        latest = records[0]
        current_speed_kmph = (
            float(latest.speed)
            if (latest.speed is not None and latest.speed >= 0)
            else 0.0
        )

        # If vehicle is actively driving at speed > min_moving_speed
        if current_speed_kmph >= min_moving_speed:
            return {
                "parcel_id": parcel_id,
                "assignment_id": latest.assignment_id,
                "vehicle_status": "MOVING",
                "is_idle": False,
                "is_long_idle": False,
                "idle_duration_seconds": 0,
                "idle_duration_minutes": 0,
                "idle_started_at": None,
                "last_movement_at": latest.timestamp,
                "current_speed_kmph": round(current_speed_kmph, 1),
                "movement_distance_meters": 0.0,
                "stationary_radius_meters": min_movement_meters,
                "status_description": f"Vehicle in active motion ({current_speed_kmph:.1f} km/h)",
                "delay_warning": False,
                "estimated_delay_minutes": 0,
            }

        # Vehicle is stationary: Scan backward in time to find the start of this stationary period
        stationary_start_time = latest.timestamp
        last_movement_time = None
        max_dist_in_cluster = 0.0

        for i in range(1, len(records)):
            rec = records[i]
            dist = DeliveryTrackingService.calculate_distance_meters(
                latest.latitude,
                latest.longitude,
                rec.latitude,
                rec.longitude,
            )
            rec_speed = float(rec.speed) if rec.speed is not None else 0.0

            if dist > min_movement_meters or rec_speed >= min_moving_speed:
                # Found the last point before the stop
                last_movement_time = rec.timestamp
                stationary_start_time = records[i - 1].timestamp
                max_dist_in_cluster = dist
                break
            else:
                stationary_start_time = rec.timestamp
                max_dist_in_cluster = max(max_dist_in_cluster, dist)

        if last_movement_time is None:
            last_movement_time = stationary_start_time

        # Calculate stationary duration
        idle_duration_seconds = max(
            0,
            int((latest.timestamp - stationary_start_time).total_seconds()),
        )
        idle_duration_minutes = int(idle_duration_seconds // 60)

        # Classify state
        if idle_duration_minutes < 5:
            vehicle_status = "TEMPORARILY_STOPPED"
            is_idle = False
            is_long_idle = False
            delay_warning = False
            est_delay = 0
            desc = f"Vehicle temporarily stopped ({idle_duration_minutes}m {idle_duration_seconds % 60}s). Traffic / brief pause."
        elif idle_duration_minutes < 15:
            vehicle_status = "IDLE"
            is_idle = True
            is_long_idle = False
            delay_warning = False
            est_delay = max(0, idle_duration_minutes - 5)
            desc = f"Vehicle idle for {idle_duration_minutes} mins within {round(max_dist_in_cluster, 1)}m radius."
        else:
            vehicle_status = "LONG_IDLE"
            is_idle = True
            is_long_idle = True
            delay_warning = True
            est_delay = idle_duration_minutes - 5
            desc = f"Prolonged stationary idle ({idle_duration_minutes} mins). Potential delivery delay alert."

        return {
            "parcel_id": parcel_id,
            "assignment_id": latest.assignment_id,
            "vehicle_status": vehicle_status,
            "is_idle": is_idle,
            "is_long_idle": is_long_idle,
            "idle_duration_seconds": idle_duration_seconds,
            "idle_duration_minutes": idle_duration_minutes,
            "idle_started_at": stationary_start_time,
            "last_movement_at": last_movement_time,
            "current_speed_kmph": round(current_speed_kmph, 1),
            "movement_distance_meters": round(max_dist_in_cluster, 1),
            "stationary_radius_meters": min_movement_meters,
            "status_description": desc,
            "delay_warning": delay_warning,
            "estimated_delay_minutes": est_delay,
        }

    @staticmethod
    def get_idle_status(
        db: Session,
        parcel_id: int,
    ) -> dict:
        return DeliveryTrackingService.detect_vehicle_idle_status(
            db=db,
            parcel_id=parcel_id,
        )



    # ========================================================
    # CALCULATE RECENT ACTUAL VEHICLE SPEED
    # RETURNS KM/H
    # ========================================================

    @staticmethod
    def calculate_recent_average_speed(
        db: Session,
        assignment_id: int,
        limit: int = 10,
    ) -> float | None:

        records = (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.assignment_id
                == assignment_id
            )
            .filter(
                DeliveryTracking.latitude.isnot(None)
            )
            .filter(
                DeliveryTracking.longitude.isnot(None)
            )
            .order_by(
                DeliveryTracking.timestamp.desc()
            )
            .limit(limit)
            .all()
        )

        if not records:
            return None

        # Check explicitly reported speeds from GPS device (in km/h)
        explicit_speeds = [
            float(r.speed)
            for r in records
            if r.speed is not None and r.speed > 0
        ]

        # Convert newest -> oldest into oldest -> newest for coordinate deltas
        ordered = list(reversed(records))
        calculated_speeds = []

        for index in range(1, len(ordered)):

            previous = ordered[index - 1]
            current = ordered[index]

            distance_meters = (
                DeliveryTrackingService
                .calculate_distance_meters(
                    previous.latitude,
                    previous.longitude,
                    current.latitude,
                    current.longitude,
                )
            )

            time_difference = (
                current.timestamp
                - previous.timestamp
            ).total_seconds()

            if time_difference <= 0:
                continue

            if distance_meters < 5:
                # Vehicle stationary during interval
                calculated_speeds.append(0.0)
                continue

            speed_mps = (
                distance_meters
                / time_difference
            )

            speed_kmph = speed_mps * 3.6

            # Filter unrealistic GPS telemetry jumps
            if speed_kmph <= 140:
                calculated_speeds.append(speed_kmph)

        all_speeds = explicit_speeds + calculated_speeds

        if not all_speeds:
            return None

        moving_speeds = [s for s in all_speeds if s > 2.0]

        if not moving_speeds:
            return 0.0

        return round(
            sum(moving_speeds) / len(moving_speeds),
            2,
        )


    # ========================================================
    # RECORD DELIVERY BOY MOBILE GPS LOCATION
    # ========================================================

    @staticmethod
    def record_location(
        db: Session,
        data: LocationUpdateCreate,
        employee_id: int | None = None,
    ) -> DeliveryTracking:

        assignment = (
            DeliveryTrackingService
            .get_assignment(
                db,
                data.assignment_id,
            )
        )

        if (
            employee_id is not None
            and assignment.employee_id != employee_id
        ):
            raise ValueError(
                "Authenticated employee is not assigned "
                "to this delivery."
            )

        parcel = (
            DeliveryTrackingService
            .get_parcel(
                db,
                assignment.parcel_id,
            )
        )

        current_status = (
            assignment.status.upper()
        )

        if (
            current_status
            in DeliveryTrackingService.FINAL_STATUSES
        ):
            raise ValueError(
                f"Assignment is already {current_status}."
            )

        now = (
            data.timestamp
            or datetime.now(timezone.utc)
        )

        tracking = DeliveryTracking(
            parcel_id=parcel.id,
            assignment_id=assignment.id,
            employee_id=assignment.employee_id,
            status=current_status,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            speed=data.speed,
            heading=data.heading,
            location_name=data.location_name,
            remarks=data.remarks,
            timestamp=now,
            created_at=datetime.now(timezone.utc),
        )

        db.add(tracking)
        db.commit()
        db.refresh(tracking)

        return tracking

    # ========================================================
    # CREATE TRACKING EVENT
    # ========================================================

    @staticmethod
    def create_tracking_event(
        db: Session,
        data: DeliveryTrackingCreate,
    ) -> DeliveryTracking:

        parcel = (
            DeliveryTrackingService
            .get_parcel(
                db,
                data.parcel_id,
            )
        )

        assignment = (
            DeliveryTrackingService
            .get_assignment(
                db,
                data.assignment_id,
            )
        )

        employee = (
            DeliveryTrackingService
            .get_employee(
                db,
                data.employee_id,
            )
        )

        if assignment.parcel_id != parcel.id:
            raise ValueError(
                "Assignment does not belong to this parcel."
            )

        if assignment.employee_id != employee.id:
            raise ValueError(
                "Employee is not assigned to this delivery."
            )

        new_status = data.status.upper()
        current_status = assignment.status.upper()

        if (
            current_status
            in DeliveryTrackingService.FINAL_STATUSES
        ):
            raise ValueError(
                f"Assignment is already {current_status}."
            )

        if new_status != current_status:

            allowed = (
                DeliveryTrackingService
                .ALLOWED_TRANSITIONS
                .get(
                    current_status,
                    set(),
                )
            )

            if new_status not in allowed:
                raise ValueError(
                    f"Invalid status transition: "
                    f"{current_status} → {new_status}"
                )

        now = datetime.now(timezone.utc)

        tracking = DeliveryTracking(
            parcel_id=parcel.id,
            assignment_id=assignment.id,
            employee_id=employee.id,
            status=new_status,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            speed=data.speed,
            heading=data.heading,
            location_name=data.location_name,
            remarks=data.remarks,
            timestamp=now,
            created_at=now,
        )

        assignment.status = new_status

        if new_status == "PICKED_UP":
            assignment.picked_up_at = now

        elif new_status == "DELIVERED":
            assignment.delivered_at = now

        if new_status == "DELIVERED":
            parcel.actual_delivery_time = now

            # Automatically sync and complete stop in any active RoutePlan
            try:
                active_plans = (
                    db.query(RoutePlan)
                    .filter(RoutePlan.employee_id == employee.id)
                    .filter(RoutePlan.status.in_(["IN_PROGRESS", "PLANNED"]))
                    .all()
                )
                for plan in active_plans:
                    stops = plan.stops_list
                    stop_matched = False
                    for s in stops:
                        if s.get("parcel_id") == parcel.id:
                            s["status"] = "COMPLETED"
                            s["completed_at"] = now.isoformat()
                            stop_matched = True
                    if stop_matched:
                        plan.stops_list = stops
                        if all(s.get("status") == "COMPLETED" for s in stops):
                            plan.status = "COMPLETED"
            except Exception:
                pass

        db.add(tracking)


        db.commit()
        db.refresh(tracking)

        return tracking

    # ========================================================
    # GET PARCEL TRACKING HISTORY
    # ========================================================

    @staticmethod
    def get_parcel_tracking(
        db: Session,
        parcel_id: int,
    ) -> list[DeliveryTracking]:

        DeliveryTrackingService.get_parcel(
            db,
            parcel_id,
        )

        return (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryTracking.timestamp.asc()
            )
            .all()
        )

    # ========================================================
    # GET LATEST TRACKING LOCATION
    # ========================================================

    @staticmethod
    def get_latest_tracking(
        db: Session,
        parcel_id: int,
    ) -> DeliveryTracking:

        DeliveryTrackingService.get_parcel(
            db,
            parcel_id,
        )

        tracking = (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryTracking.timestamp.desc()
            )
            .first()
        )

        if not tracking:
            raise LookupError(
                "No tracking event found."
            )

        return tracking

    # ========================================================
    # GET ASSIGNMENT TRACKING HISTORY
    # ========================================================

    @staticmethod
    def get_assignment_tracking(
        db: Session,
        assignment_id: int,
    ) -> list[DeliveryTracking]:

        DeliveryTrackingService.get_assignment(
            db,
            assignment_id,
        )

        return (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.assignment_id
                == assignment_id
            )
            .order_by(
                DeliveryTracking.timestamp.asc()
            )
            .all()
        )

    # ========================================================
    # GET REMAINING ROAD ROUTE & DEVIATION DETECTION
    # ========================================================

    @staticmethod
    async def get_road_route(
        db: Session,
        parcel_id: int,
        force_recalculate: bool = False,
        threshold_meters: float = DEFAULT_DEVIATION_THRESHOLD_METERS,
    ) -> dict:

        parcel = (
            DeliveryTrackingService
            .get_parcel(
                db,
                parcel_id,
            )
        )

        latest = (
            db.query(DeliveryTracking)
            .filter(
                DeliveryTracking.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryTracking.timestamp.desc()
            )
            .first()
        )

        assignment = (
            db.query(DeliveryAssignment)
            .filter(
                DeliveryAssignment.parcel_id
                == parcel_id
            )
            .order_by(
                DeliveryAssignment.created_at.desc()
            )
            .first()
        )

        assignment_id = (
            assignment.id
            if assignment
            else (
                latest.assignment_id
                if latest
                else 0
            )
        )

        # -----------------------------------------------
        # CURRENT LOCATION
        # -----------------------------------------------

        start_latitude = None
        start_longitude = None

        # -----------------------------------------------
        # DYNAMIC MULTI-LEG OPERATIONAL DESTINATION RESOLUTION
        # -----------------------------------------------
        current_stage = getattr(parcel, "current_stage", "OUT_FOR_DELIVERY") or "OUT_FOR_DELIVERY"

        sb = db.query(Branch).filter(Branch.id == parcel.source_branch_id).first() if parcel.source_branch_id else None
        db_branch = db.query(Branch).filter(Branch.id == parcel.destination_branch_id).first() if parcel.destination_branch_id else None

        # 1. Determine START coordinates
        if latest and latest.latitude is not None and latest.longitude is not None:
            start_latitude = latest.latitude
            start_longitude = latest.longitude
        else:
            if current_stage in ["PICKUP_ASSIGNED", "PICKUP_IN_PROGRESS", "PICKED_UP", "INBOUND_TO_SENDER_BRANCH", "AT_SENDER_BRANCH", "READY_FOR_INTERCITY_TRANSPORT", "INTERCITY_ASSIGNED"]:
                start_latitude = sb.latitude if sb else (parcel.sender_latitude or 9.9252)
                start_longitude = sb.longitude if sb else (parcel.sender_longitude or 78.1198)
            else:
                start_latitude = db_branch.latitude if db_branch else (parcel.receiver_latitude or 9.9390)
                start_longitude = db_branch.longitude if db_branch else (parcel.receiver_longitude or 78.1340)

        # 2. Determine DESTINATION coordinates according to active operational leg
        if current_stage in ["PICKUP_ASSIGNED", "PICKUP_IN_PROGRESS"]:
            # Leg 1: Driver travels to Sender Location
            end_latitude = parcel.sender_latitude or 9.9252
            end_longitude = parcel.sender_longitude or 78.1198
        elif current_stage in ["PICKED_UP", "INBOUND_TO_SENDER_BRANCH"]:
            # Leg 2: Driver transports parcel to Sender Main Hub
            end_latitude = sb.latitude if sb else (parcel.sender_latitude or 9.9252)
            end_longitude = sb.longitude if sb else (parcel.sender_longitude or 78.1198)
        elif current_stage in ["READY_FOR_INTERCITY_TRANSPORT", "INTERCITY_ASSIGNED", "IN_INTERCITY_TRANSIT"]:
            # Leg 3: Van/Truck transports parcel to Receiver Main Hub
            end_latitude = db_branch.latitude if db_branch else (parcel.receiver_latitude or 9.9390)
            end_longitude = db_branch.longitude if db_branch else (parcel.receiver_longitude or 78.1340)
        else:
            # Leg 4 (Default): Courier travels to Receiver Location
            end_latitude = parcel.receiver_latitude or parcel.latitude or 9.9390
            end_longitude = parcel.receiver_longitude or parcel.longitude or 78.1340

        if end_latitude is None or end_longitude is None:
            end_latitude = 9.9252
            end_longitude = 78.1198


        # -----------------------------------------------
        # CHECK EXISTING ROUTE & DEVIATION
        # -----------------------------------------------

        cached_entry = DeliveryTrackingService.ACTIVE_ROUTES_CACHE.get(parcel_id)
        is_route_deviated = False
        distance_from_route_meters = 0.0
        route_recalculated = False

        if (
            not force_recalculate
            and cached_entry
            and cached_entry.get("coordinates")
            and len(cached_entry["coordinates"]) >= 2
        ):
            # Check deviation against active route geometry
            cached_coords = cached_entry["coordinates"]
            distance_from_route_meters = (
                DeliveryTrackingService.calculate_distance_to_route(
                    lat=start_latitude,
                    lon=start_longitude,
                    coordinates=cached_coords,
                )
            )

            if distance_from_route_meters <= threshold_meters:
                # Vehicle is ON ROUTE! Reuse existing route geometry to avoid redundant ORS calls.
                coordinates = cached_coords
                distance_meters = cached_entry.get("distance_meters", 0.0)
                duration_seconds = cached_entry.get("duration_seconds", 0.0)
                is_route_deviated = False
                route_recalculated = False
            else:
                # ROUTE DEVIATION DETECTED!
                # Vehicle is outside allowed threshold. Trigger automatic recalculation.
                is_route_deviated = True
                route_recalculated = True
                coordinates = []
        else:
            # Initial route request or forced recalculation
            route_recalculated = True
            coordinates = []

        # -----------------------------------------------
        # ORS ROUTE CALCULATION (IF RECALCULATING)
        # -----------------------------------------------

        if not coordinates or route_recalculated:

            try:

                client = ORSClient()

                result = (
                    await client.get_driving_route(
                        start_longitude=start_longitude,
                        start_latitude=start_latitude,
                        end_longitude=end_longitude,
                        end_latitude=end_latitude,
                    )
                )

                features = result.get(
                    "features",
                    [],
                )

                if features:

                    feature = features[0]

                    geometry = (
                        feature.get(
                            "geometry",
                            {},
                        )
                    )

                    coordinates = (
                        geometry.get(
                            "coordinates",
                            [],
                        )
                    )

                    properties = (
                        feature.get(
                            "properties",
                            {},
                        )
                    )

                    summary = (
                        properties.get(
                            "summary",
                            {},
                        )
                    )

                    distance_meters = float(
                        summary.get(
                            "distance",
                            0,
                        )
                    )

                    duration_seconds = float(
                        summary.get(
                            "duration",
                            0,
                        )
                    )

            except Exception:

                coordinates = []

            # -----------------------------------------------
            # FALLBACK DISTANCE
            # -----------------------------------------------

            if (
                not coordinates
                or len(coordinates) < 2
            ):

                straight_distance = (
                    DeliveryTrackingService
                    .calculate_distance_meters(
                        start_latitude,
                        start_longitude,
                        end_latitude,
                        end_longitude,
                    )
                )

                # Approximate road distance
                distance_meters = round(
                    straight_distance * 1.3,
                    1,
                )

                # Approximate duration
                duration_seconds = round(
                    distance_meters / 9.72
                )

                coordinates = [
                    [
                        start_longitude,
                        start_latitude,
                    ],
                    [
                        end_longitude,
                        end_latitude,
                    ],
                ]

        # -----------------------------------------------
        # DYNAMIC ETA COMPUTATION
        # -----------------------------------------------

        current_speed_kmph = 0.0
        if latest and latest.speed is not None:
            current_speed_kmph = float(latest.speed)

        recent_avg_speed_kmph = None
        if assignment_id:
            recent_avg_speed_kmph = (
                DeliveryTrackingService
                .calculate_recent_average_speed(
                    db=db,
                    assignment_id=assignment_id,
                    limit=10,
                )
            )

        # Check if vehicle is stationary
        is_stationary = False
        if current_speed_kmph <= 1.5:
            if recent_avg_speed_kmph is None or recent_avg_speed_kmph <= 1.5:
                is_stationary = True
                current_speed_kmph = 0.0

        remaining_distance_km = distance_meters / 1000.0

        if is_stationary:
            # Vehicle stationary (speed = 0): use ORS road network profile or 25 km/h urban traffic speed
            if duration_seconds > 0 and remaining_distance_km > 0.05:
                effective_duration_sec = duration_seconds
                effective_speed_kmph = round(
                    (remaining_distance_km / (duration_seconds / 3600.0)),
                    1,
                )
                speed_source = "STATIONARY (ORS Road Traffic Speed)"
            else:
                effective_speed_kmph = 25.0
                effective_duration_sec = (remaining_distance_km / 25.0) * 3600.0
                speed_source = "STATIONARY (City Traffic Estimate)"
        else:
            # Vehicle moving
            if current_speed_kmph > 1.5 and recent_avg_speed_kmph and recent_avg_speed_kmph > 1.5:
                active_speed = (0.6 * recent_avg_speed_kmph) + (0.4 * current_speed_kmph)
                speed_source = "LIVE_VEHICLE_SPEED (Smoothed Avg)"
            elif current_speed_kmph > 1.5:
                active_speed = current_speed_kmph
                speed_source = "LIVE_VEHICLE_SPEED"
            else:
                active_speed = recent_avg_speed_kmph if (recent_avg_speed_kmph and recent_avg_speed_kmph > 1.5) else 25.0
                speed_source = "GPS_HISTORY_AVERAGE"

            effective_speed_kmph = max(8.0, min(90.0, active_speed))

            if duration_seconds > 0 and remaining_distance_km > 0.05:
                ors_expected_speed = (remaining_distance_km / (duration_seconds / 3600.0))
                speed_ratio = max(0.4, min(2.5, effective_speed_kmph / max(5.0, ors_expected_speed)))
                effective_duration_sec = duration_seconds / speed_ratio
            else:
                effective_duration_sec = (remaining_distance_km / effective_speed_kmph) * 3600.0

        est_rem_seconds = max(60, int(round(effective_duration_sec)))
        est_rem_minutes = max(1, int(round(est_rem_seconds / 60.0)))
        est_arrival = datetime.now(timezone.utc) + timedelta(seconds=est_rem_seconds)

        # -----------------------------------------------
        # SMART IDLE & MOTION DETECTION
        # -----------------------------------------------

        idle_info = DeliveryTrackingService.detect_vehicle_idle_status(
            db=db,
            parcel_id=parcel.id,
            assignment_id=assignment_id,
        )

        vehicle_motion_status = idle_info["vehicle_status"]
        idle_duration_minutes = idle_info["idle_duration_minutes"]
        delay_warning = idle_info["delay_warning"]

        # If prolonged idle is detected, factor delivery delay into the dynamic ETA
        if idle_info.get("is_long_idle") and idle_info.get("estimated_delay_minutes", 0) > 0:
            est_rem_seconds += idle_info["estimated_delay_minutes"] * 60
            est_rem_minutes = max(1, int(round(est_rem_seconds / 60.0)))
            est_arrival = datetime.now(timezone.utc) + timedelta(seconds=est_rem_seconds)

        # Check for active RoutePlan containing this parcel
        plan_summary = None
        try:
            active_plans = (
                db.query(RoutePlan)
                .filter(RoutePlan.status.in_(["IN_PROGRESS", "PLANNED"]))
                .order_by(RoutePlan.created_at.desc())
                .all()
            )
            for p in active_plans:
                stops = p.stops_list
                for s in stops:
                    if s.get("parcel_id") == parcel.id:
                        completed_c = sum(1 for st in stops if st.get("status") == "COMPLETED")
                        curr_stop = next((st for st in stops if st.get("status") == "PENDING"), None)
                        plan_summary = {
                            "route_plan_id": p.id,
                            "plan_code": p.plan_code,
                            "total_stops": len(stops),
                            "completed_stops": completed_c,
                            "current_stop_number": curr_stop.get("stop_number") if curr_stop else len(stops),
                            "current_stop_parcel_id": curr_stop.get("parcel_id") if curr_stop else parcel.id,
                            "current_stop_destination": curr_stop.get("destination_address") if curr_stop else parcel.destination_address,
                            "is_on_optimized_route": not is_route_deviated,
                            "distance_from_planned_route_meters": round(distance_from_route_meters, 1),
                            "plan_status": p.status,
                        }
                        break
                if plan_summary:
                    break
        except Exception:
            plan_summary = None

        route_data = {
            "parcel_id": parcel.id,
            "assignment_id": assignment_id,
            "current_latitude": start_latitude,
            "current_longitude": start_longitude,
            "destination_latitude": end_latitude,
            "destination_longitude": end_longitude,
            "distance_meters": distance_meters,
            "duration_seconds": est_rem_seconds,
            "coordinates": coordinates,
            "current_speed_kmph": round(current_speed_kmph, 1),
            "average_speed_kmph": round(effective_speed_kmph, 1),
            "is_stationary": is_stationary,
            "speed_source": speed_source,
            "estimated_remaining_seconds": est_rem_seconds,
            "estimated_remaining_minutes": est_rem_minutes,
            "estimated_arrival_time": est_arrival,
            "is_route_deviated": is_route_deviated,
            "distance_from_route_meters": round(distance_from_route_meters, 1),
            "deviation_threshold_meters": threshold_meters,
            "route_recalculated": route_recalculated,
            "vehicle_status": vehicle_motion_status,
            "idle_duration_minutes": idle_duration_minutes,
            "delay_warning": delay_warning,
            "route_plan_summary": plan_summary,
        }


        # Update cache with latest route
        DeliveryTrackingService.ACTIVE_ROUTES_CACHE[parcel.id] = {
            "coordinates": coordinates,
            "distance_meters": distance_meters,
            "duration_seconds": duration_seconds,
            "destination_latitude": end_latitude,
            "destination_longitude": end_longitude,
            "last_updated_at": datetime.now(timezone.utc),
        }

        return route_data

    # ========================================================
    # CHECK ROUTE DEVIATION
    # ========================================================

    @staticmethod
    async def check_route_deviation(
        db: Session,
        parcel_id: int,
        threshold_meters: float = DEFAULT_DEVIATION_THRESHOLD_METERS,
    ) -> dict:

        route = await DeliveryTrackingService.get_road_route(
            db=db,
            parcel_id=parcel_id,
            force_recalculate=False,
            threshold_meters=threshold_meters,
        )

        is_deviated = bool(route.get("is_route_deviated", False))
        dist_from_route = float(route.get("distance_from_route_meters", 0.0))
        recalculated = bool(route.get("route_recalculated", False))

        if is_deviated:
            status_message = (
                f"Route deviation detected ({dist_from_route:.1f}m off route > {threshold_meters:.0f}m limit). "
                f"Route automatically recalculated."
            )
        else:
            status_message = f"On Route ({dist_from_route:.1f}m from centerline)."

        return {
            "parcel_id": parcel_id,
            "assignment_id": route.get("assignment_id", 0),
            "is_route_deviated": is_deviated,
            "distance_from_route_meters": dist_from_route,
            "deviation_threshold_meters": threshold_meters,
            "route_recalculated": recalculated,
            "remaining_distance_meters": route.get("distance_meters", 0.0),
            "estimated_remaining_seconds": route.get("estimated_remaining_seconds", 60),
            "estimated_remaining_minutes": route.get("estimated_remaining_minutes", 1),
            "status_message": status_message,
            "recalculated_route": route if recalculated else None,
        }

    # ========================================================
    # GET DYNAMIC ETA BASED ON VEHICLE SPEED
    # ========================================================

    @staticmethod
    async def get_dynamic_eta(
        db: Session,
        parcel_id: int,
    ) -> dict:

        route = (
            await DeliveryTrackingService
            .get_road_route(
                db=db,
                parcel_id=parcel_id,
            )
        )

        assignment_id = route.get("assignment_id", 0)

        if assignment_id == 0:
            raise LookupError(
                "No delivery assignment found."
            )

        idle_info = DeliveryTrackingService.detect_vehicle_idle_status(
            db=db,
            parcel_id=parcel_id,
            assignment_id=assignment_id,
        )

        return {
            "parcel_id": parcel_id,
            "assignment_id": assignment_id,
            "remaining_distance_meters": round(route["distance_meters"], 1),
            "current_speed_kmph": route["current_speed_kmph"],
            "average_speed_kmph": route["average_speed_kmph"],
            "is_stationary": route["is_stationary"],
            "speed_source": route["speed_source"],
            "estimated_remaining_seconds": route["estimated_remaining_seconds"],
            "estimated_remaining_minutes": route["estimated_remaining_minutes"],
            "estimated_arrival_time": route["estimated_arrival_time"],
            "vehicle_status": idle_info["vehicle_status"],
            "idle_duration_minutes": idle_info["idle_duration_minutes"],
            "delay_warning": idle_info["delay_warning"],
            "route_plan_summary": route.get("route_plan_summary"),
        }