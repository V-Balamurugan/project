import os
import httpx
from app.core.config import settings


class ORSClient:

    def __init__(self):
        self.api_key = (settings.ORS_API_KEY or os.getenv("ORS_API_KEY", "")).strip()
        self.base_url = (
            settings.ORS_BASE_URL
            or os.getenv("ORS_BASE_URL", "https://api.openrouteservice.org/v2")
        ).rstrip("/")

        if not self.api_key:
            raise RuntimeError("ORS_API_KEY is not configured.")

    async def get_driving_route(
        self,
        start_longitude: float,
        start_latitude: float,
        end_longitude: float,
        end_latitude: float,
    ) -> dict:
        url = f"{self.base_url}/directions/driving-car/geojson"

        payload = {
            "coordinates": [
                [start_longitude, start_latitude],
                [end_longitude, end_latitude],
            ],
            "instructions": False,
            "preference": "recommended",
        }

        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/geo+json, application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
            )

            if response.status_code >= 400:
                raise RuntimeError(
                    f"ORS request failed: {response.status_code} {response.text}"
                )

            return response.json()

    async def get_multi_stop_route(
        self,
        coordinates: list[list[float]],
    ) -> dict:
        """
        Calculates driving directions through multiple waypoints in order.
        coordinates: [[lon, lat], [lon, lat], ...]
        """
        if len(coordinates) < 2:
            raise ValueError("At least 2 coordinates required for route calculation.")

        url = f"{self.base_url}/directions/driving-car/geojson"

        payload = {
            "coordinates": coordinates,
            "instructions": False,
            "preference": "recommended",
        }

        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/geo+json, application/json",
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
            )

            if response.status_code >= 400:
                raise RuntimeError(
                    f"ORS multi-stop request failed: {response.status_code} {response.text}"
                )

            return response.json()