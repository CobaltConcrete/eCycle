"""Small Google Routes adapter. Never expose provider credentials/errors to clients."""

import os

import requests
from fastapi import HTTPException
from pydantic import ValidationError

from schemas import DirectionsInput, DirectionsResponse

ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
FIELD_MASK = ",".join(
    [
        "routes.polyline.encodedPolyline",
        "routes.distanceMeters",
        "routes.duration",
        "routes.legs.steps.navigationInstruction.instructions",
        "routes.legs.steps.transitDetails.transitLine.nameShort",
        "routes.legs.steps.transitDetails.transitLine.name",
        "routes.legs.steps.transitDetails.stopDetails.departureStop.name",
        "routes.legs.steps.transitDetails.stopDetails.arrivalStop.name",
        "routes.warnings",
        "routes.description",
    ]
)
MODES = {
    "DRIVING": "DRIVE",
    "WALKING": "WALK",
    "BICYCLING": "BICYCLE",
    "TRANSIT": "TRANSIT",
}


def compute_route(payload: DirectionsInput) -> DirectionsResponse:
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        raise HTTPException(503, "Directions are not configured")

    def waypoint(point):
        return {"location": {"latLng": {"latitude": point.lat, "longitude": point.lon}}}

    body = {
        "origin": waypoint(payload.user_location),
        "destination": waypoint(payload.destination),
        "travelMode": MODES[payload.mode.upper()],
        "computeAlternativeRoutes": False,
        "polylineEncoding": "ENCODED_POLYLINE",
        "languageCode": "en",
        "units": "METRIC",
    }
    try:
        response = requests.post(
            ROUTES_URL,
            json=body,
            headers={"X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK},
            timeout=(3, 10),
            allow_redirects=False,
        )
    except requests.RequestException:
        raise HTTPException(
            502, "Directions service unavailable. Please retry."
        ) from None
    if response.status_code != 200:
        raise HTTPException(
            502,
            "Directions service unavailable. Check Routes API enablement, billing and server-key restrictions.",
        )
    try:
        data = response.json()
        routes = data.get("routes", [])
        if not isinstance(routes, list):
            raise ValueError("Invalid routes")
        if not routes:
            raise HTTPException(
                404, "No route found for this transport mode. Try another mode."
            )
        route = routes[0]
        instructions = []
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                instruction = step.get("navigationInstruction", {}).get("instructions")
                if not instruction and step.get("transitDetails"):
                    transit = step["transitDetails"]
                    line = transit.get("transitLine", {})
                    stops = transit.get("stopDetails", {})
                    instruction = (
                        f"Take {line.get('nameShort') or line.get('name') or 'transit'}"
                    )
                    if stops.get("departureStop", {}).get("name"):
                        instruction += f" from {stops['departureStop']['name']}"
                    if stops.get("arrivalStop", {}).get("name"):
                        instruction += f" to {stops['arrivalStop']['name']}"
                if instruction:
                    instructions.append(instruction)
        return DirectionsResponse(
            directions=instructions,
            encodedPolyline=route["polyline"]["encodedPolyline"],
            distanceMeters=route.get("distanceMeters", 0),
            duration=route.get("duration", "0s"),
            warnings=route.get("warnings", []),
            description=route.get("description", ""),
        )
    except (ValueError, TypeError, KeyError, AttributeError, ValidationError):
        raise HTTPException(
            502, "Directions service returned an invalid response"
        ) from None
