from datetime import datetime, timezone
import json
import math
import random
from sqlalchemy.orm import Session

from app.models.branch import Branch
from app.models.delivery_assignment import DeliveryAssignment
from app.models.employee import Employee
from app.models.parcel import Parcel
from app.models.route_plan import RoutePlan
from app.schemas.route_optimization import (
    OptimizeRouteRequest,
    RoutePlanResponse,
    RouteStopDetail,
)
from app.services.ors_client import ORSClient


class RouteOptimizationService:

    PRIORITY_WEIGHTS = {
        "URGENT": 4,
        "HIGH": 3,
        "NORMAL": 2,
        "LOW": 1,
    }

    # ============================================================
    # DISTANCE UTILITY (HAVERSINE)
    # ============================================================

    @staticmethod
    def calculate_distance_meters(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        earth_radius = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return earth_radius * c

    # ============================================================
    # OPTIMIZATION ALGORITHM: PRIORITY-WEIGHTED TSP / NEAREST NEIGHBOR
    # ============================================================

    @classmethod
    def solve_stop_sequence(
        cls,
        start_lat: float,
        start_lon: float,
        candidates: list[dict],
        algorithm: str = "PRIORITY_TSP",
    ) -> list[dict]:
        """
        Calculates the optimal delivery stop sequence from the starting depot.
        Honors parcel priorities (URGENT > HIGH > NORMAL > LOW) and minimizes road distance.
        """
        if not candidates:
            return []

        remaining = list(candidates)
        ordered_stops: list[dict] = []
        current_lat, current_lon = start_lat, start_lon

        if algorithm == "PRIORITY_TSP":
            # Group by priority order
            priority_groups = ["URGENT", "HIGH", "NORMAL", "LOW"]
            for priority_tier in priority_groups:
                tier_items = [c for c in remaining if c.get("priority", "NORMAL").upper() == priority_tier]
                while tier_items:
                    # Find nearest neighbor within this priority tier
                    nearest = min(
                        tier_items,
                        key=lambda item: cls.calculate_distance_meters(
                            current_lat, current_lon, item["latitude"], item["longitude"]
                        ),
                    )
                    ordered_stops.append(nearest)
                    current_lat, current_lon = nearest["latitude"], nearest["longitude"]
                    tier_items.remove(nearest)
                    remaining.remove(nearest)

            # Any remaining items without standard priority
            while remaining:
                nearest = min(
                    remaining,
                    key=lambda item: cls.calculate_distance_meters(
                        current_lat, current_lon, item["latitude"], item["longitude"]
                    ),
                )
                ordered_stops.append(nearest)
                current_lat, current_lon = nearest["latitude"], nearest["longitude"]
                remaining.remove(nearest)

        elif algorithm == "DEADLINE_FIRST":
            # Sort by priority first then shortest distance
            remaining.sort(
                key=lambda item: (
                    -cls.PRIORITY_WEIGHTS.get(item.get("priority", "NORMAL").upper(), 1),
                    cls.calculate_distance_meters(start_lat, start_lon, item["latitude"], item["longitude"]),
                )
            )
            ordered_stops = remaining

        else:  # SHORTEST_DISTANCE (Pure TSP Nearest Neighbor)
            while remaining:
                nearest = min(
                    remaining,
                    key=lambda item: cls.calculate_distance_meters(
                        current_lat, current_lon, item["latitude"], item["longitude"]
                    ),
                )
                ordered_stops.append(nearest)
                current_lat, current_lon = nearest["latitude"], nearest["longitude"]
                remaining.remove(nearest)

        # Assign stop numbers 1..N
        for idx, stop in enumerate(ordered_stops, start=1):
            stop["stop_number"] = idx

        return ordered_stops

    # ============================================================
    # OPTIMIZE AND CREATE ROUTE PLAN
    # ============================================================

    @classmethod
    async def optimize_route(
        cls,
        db: Session,
        request: OptimizeRouteRequest,
    ) -> RoutePlanResponse:
        employee = db.query(Employee).filter(Employee.id == request.employee_id).first()
        if not employee:
            raise LookupError(f"Employee #{request.employee_id} not found.")

        # Determine start branch
        branch_id = request.start_branch_id or employee.branch_id
        start_branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if not start_branch:
            raise LookupError("Starting branch not found.")

        # Fetch requested parcels
        parcels = db.query(Parcel).filter(Parcel.id.in_(request.parcel_ids)).all()
        if not parcels:
            raise ValueError("No valid parcels found for the provided parcel IDs.")

        # Fetch delivery assignments for these parcels if they exist
        assignments = (
            db.query(DeliveryAssignment)
            .filter(DeliveryAssignment.parcel_id.in_(request.parcel_ids))
            .filter(DeliveryAssignment.employee_id == employee.id)
            .all()
        )
        assignment_map = {a.parcel_id: a for a in assignments}

        # Build candidate stop list
        candidates = []
        for p in parcels:
            assignment = assignment_map.get(p.id)
            candidates.append({
                "parcel_id": p.id,
                "assignment_id": assignment.id if assignment else None,
                "tracking_number": p.tracking_number,
                "receiver": p.receiver,
                "destination_address": p.destination_address,
                "latitude": float(p.latitude),
                "longitude": float(p.longitude),
                "priority": p.priority or "NORMAL",
                "weight": float(p.weight or 1.0),
                "status": "PENDING",
                "completed_at": None,
                "distance_from_prev_meters": 0.0,
                "duration_from_prev_seconds": 0.0,
            })

        # Calculate optimal stop sequence
        ordered_stops = cls.solve_stop_sequence(
            start_lat=float(start_branch.latitude),
            start_lon=float(start_branch.longitude),
            candidates=candidates,
            algorithm=request.algorithm,
        )

        # Build complete waypoint list: [Start Branch, Stop 1, Stop 2, ..., Stop N]
        all_waypoints = [[float(start_branch.longitude), float(start_branch.latitude)]]
        for s in ordered_stops:
            all_waypoints.append([s["longitude"], s["latitude"]])

        if request.include_return_to_depot:
            all_waypoints.append([float(start_branch.longitude), float(start_branch.latitude)])

        # Request turn-by-turn road route via OpenRouteService
        total_distance_meters = 0.0
        total_duration_seconds = 0.0
        polyline_coordinates: list[list[float]] = []

        try:
            ors = ORSClient()
            ors_result = await ors.get_multi_stop_route(all_waypoints)
            features = ors_result.get("features", [])
            if features:
                summary = features[0].get("properties", {}).get("summary", {})
                total_distance_meters = float(summary.get("distance", 0.0))
                total_duration_seconds = float(summary.get("duration", 0.0))
                polyline_coordinates = features[0].get("geometry", {}).get("coordinates", [])
                
                # Approximate leg distances per stop
                if len(ordered_stops) > 0:
                    avg_dist = total_distance_meters / len(ordered_stops)
                    avg_dur = total_duration_seconds / len(ordered_stops)
                    for s in ordered_stops:
                        s["distance_from_prev_meters"] = round(avg_dist, 1)
                        s["duration_from_prev_seconds"] = round(avg_dur, 1)
        except Exception:
            # Fallback estimation using geodesic segments
            prev_lat, prev_lon = float(start_branch.latitude), float(start_branch.longitude)
            polyline_coordinates = []
            for s in ordered_stops:
                leg_dist = cls.calculate_distance_meters(prev_lat, prev_lon, s["latitude"], s["longitude"]) * 1.3
                leg_dur = leg_dist / 8.33  # ~30 km/h
                s["distance_from_prev_meters"] = round(leg_dist, 1)
                s["duration_from_prev_seconds"] = round(leg_dur, 1)
                total_distance_meters += leg_dist
                total_duration_seconds += leg_dur
                polyline_coordinates.extend([
                    [prev_lon, prev_lat],
                    [s["longitude"], s["latitude"]],
                ])
                prev_lat, prev_lon = s["latitude"], s["longitude"]

        # Generate unique plan code: RP-YYYYMMDD-XXXX
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        rand_suffix = f"{random.randint(1000, 9999)}"
        plan_code = f"RP-{today_str}-{rand_suffix}"

        # Create and persist RoutePlan
        plan = RoutePlan(
            plan_code=plan_code,
            employee_id=employee.id,
            start_branch_id=start_branch.id,
            total_distance_meters=round(total_distance_meters, 1),
            total_duration_seconds=round(total_duration_seconds, 1),
            status="PLANNED",
            algorithm_used=request.algorithm,
            stops_json=json.dumps(ordered_stops),
            polyline_json=json.dumps(polyline_coordinates),
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        return cls._to_response(plan, employee, start_branch)

    # ============================================================
    # RETRIEVE ROUTE PLAN BY ID
    # ============================================================

    @classmethod
    def get_route_plan(
        cls,
        db: Session,
        plan_id: int,
    ) -> RoutePlanResponse:
        plan = db.query(RoutePlan).filter(RoutePlan.id == plan_id).first()
        if not plan:
            raise LookupError(f"Route Plan #{plan_id} not found.")

        employee = db.query(Employee).filter(Employee.id == plan.employee_id).first()
        branch = db.query(Branch).filter(Branch.id == plan.start_branch_id).first()
        return cls._to_response(plan, employee, branch)

    # ============================================================
    # GET ACTIVE ROUTE PLAN FOR EMPLOYEE
    # ============================================================

    @classmethod
    def get_active_plan_for_employee(
        cls,
        db: Session,
        employee_id: int,
    ) -> RoutePlanResponse | None:
        plan = (
            db.query(RoutePlan)
            .filter(RoutePlan.employee_id == employee_id)
            .filter(RoutePlan.status.in_(["IN_PROGRESS", "PLANNED"]))
            .order_by(RoutePlan.created_at.desc())
            .first()
        )
        if not plan:
            return None

        employee = db.query(Employee).filter(Employee.id == plan.employee_id).first()
        branch = db.query(Branch).filter(Branch.id == plan.start_branch_id).first()
        return cls._to_response(plan, employee, branch)

    # ============================================================
    # GET ACTIVE ROUTE PLAN FOR PARCEL
    # ============================================================

    @classmethod
    def get_active_plan_for_parcel(
        cls,
        db: Session,
        parcel_id: int,
    ) -> RoutePlanResponse | None:
        plans = (
            db.query(RoutePlan)
            .filter(RoutePlan.status.in_(["IN_PROGRESS", "PLANNED"]))
            .order_by(RoutePlan.created_at.desc())
            .all()
        )
        for p in plans:
            for stop in p.stops_list:
                if stop.get("parcel_id") == parcel_id:
                    employee = db.query(Employee).filter(Employee.id == p.employee_id).first()
                    branch = db.query(Branch).filter(Branch.id == p.start_branch_id).first()
                    return cls._to_response(p, employee, branch)
        return None

    # ============================================================
    # START / DISPATCH ROUTE PLAN
    # ============================================================

    @classmethod
    def start_route_plan(
        cls,
        db: Session,
        plan_id: int,
    ) -> RoutePlanResponse:
        plan = db.query(RoutePlan).filter(RoutePlan.id == plan_id).first()
        if not plan:
            raise LookupError(f"Route Plan #{plan_id} not found.")

        plan.status = "IN_PROGRESS"

        # Update parcels to IN_TRANSIT
        parcel_ids = [s.get("parcel_id") for s in plan.stops_list if s.get("parcel_id")]
        if parcel_ids:
            db.query(Parcel).filter(Parcel.id.in_(parcel_ids)).update(
                {"status": "IN_TRANSIT"},
                synchronize_session=False,
            )
            db.query(DeliveryAssignment).filter(
                DeliveryAssignment.parcel_id.in_(parcel_ids),
                DeliveryAssignment.employee_id == plan.employee_id,
            ).update(
                {"status": "IN_TRANSIT"},
                synchronize_session=False,
            )

        db.commit()
        db.refresh(plan)

        employee = db.query(Employee).filter(Employee.id == plan.employee_id).first()
        branch = db.query(Branch).filter(Branch.id == plan.start_branch_id).first()
        return cls._to_response(plan, employee, branch)

    # ============================================================
    # COMPLETE STOP IN ROUTE PLAN
    # ============================================================

    @classmethod
    def complete_stop(
        cls,
        db: Session,
        plan_id: int,
        parcel_id: int,
    ) -> RoutePlanResponse:
        plan = db.query(RoutePlan).filter(RoutePlan.id == plan_id).first()
        if not plan:
            raise LookupError(f"Route Plan #{plan_id} not found.")

        stops = plan.stops_list
        completed_count = 0

        for s in stops:
            if s.get("parcel_id") == parcel_id:
                s["status"] = "COMPLETED"
                s["completed_at"] = datetime.now(timezone.utc).isoformat()
            if s.get("status") == "COMPLETED":
                completed_count += 1

        plan.stops_list = stops

        # If all stops completed, mark plan completed
        if completed_count >= len(stops) and len(stops) > 0:
            plan.status = "COMPLETED"

        db.commit()
        db.refresh(plan)

        employee = db.query(Employee).filter(Employee.id == plan.employee_id).first()
        branch = db.query(Branch).filter(Branch.id == plan.start_branch_id).first()
        return cls._to_response(plan, employee, branch)

    # ============================================================
    # LIST ROUTE PLANS
    # ============================================================

    @classmethod
    def list_route_plans(
        cls,
        db: Session,
        employee_id: int | None = None,
        status: str | None = None,
        limit: int = 50,
    ) -> list[RoutePlanResponse]:
        query = db.query(RoutePlan)
        if employee_id:
            query = query.filter(RoutePlan.employee_id == employee_id)
        if status:
            query = query.filter(RoutePlan.status == status)

        plans = query.order_by(RoutePlan.created_at.desc()).limit(limit).all()

        results = []
        for p in plans:
            employee = db.query(Employee).filter(Employee.id == p.employee_id).first()
            branch = db.query(Branch).filter(Branch.id == p.start_branch_id).first()
            results.append(cls._to_response(p, employee, branch))

        return results

    # ============================================================
    # HELPER: SERIALIZE TO RESPONSE
    # ============================================================

    @classmethod
    def _to_response(
        cls,
        plan: RoutePlan,
        employee: Employee | None,
        branch: Branch | None,
    ) -> RoutePlanResponse:
        raw_stops = plan.stops_list
        stops_typed = []
        active_stop = None

        for s in raw_stops:
            stop_detail = RouteStopDetail(
                stop_number=s.get("stop_number", 1),
                parcel_id=s.get("parcel_id", 0),
                assignment_id=s.get("assignment_id"),
                tracking_number=s.get("tracking_number", ""),
                receiver=s.get("receiver", "Customer"),
                destination_address=s.get("destination_address", ""),
                latitude=float(s.get("latitude", 0.0)),
                longitude=float(s.get("longitude", 0.0)),
                priority=s.get("priority", "NORMAL"),
                weight=float(s.get("weight", 1.0)),
                status=s.get("status", "PENDING"),
                distance_from_prev_meters=float(s.get("distance_from_prev_meters", 0.0)),
                duration_from_prev_seconds=float(s.get("duration_from_prev_seconds", 0.0)),
                completed_at=datetime.fromisoformat(s["completed_at"]) if s.get("completed_at") else None,
            )
            stops_typed.append(stop_detail)
            if active_stop is None and stop_detail.status == "PENDING":
                active_stop = stop_detail

        completed_count = sum(1 for s in stops_typed if s.status == "COMPLETED")

        return RoutePlanResponse(
            id=plan.id,
            plan_code=plan.plan_code,
            employee_id=plan.employee_id,
            employee_name=employee.name if employee else f"Employee #{plan.employee_id}",
            start_branch_id=plan.start_branch_id,
            start_branch_name=branch.branch_name if branch else f"Branch #{plan.start_branch_id}",

            start_latitude=float(branch.latitude) if branch else 9.9252,
            start_longitude=float(branch.longitude) if branch else 78.1198,
            total_distance_meters=plan.total_distance_meters,
            total_duration_seconds=plan.total_duration_seconds,
            total_stops_count=len(stops_typed),
            completed_stops_count=completed_count,
            status=plan.status,
            algorithm_used=plan.algorithm_used,
            stops=stops_typed,
            polyline_coordinates=plan.polyline_coordinates,
            active_stop=active_stop,
            created_at=plan.created_at or datetime.now(timezone.utc),
            updated_at=plan.updated_at or datetime.now(timezone.utc),
        )

