"""
Module 3 — Water Zonation + Smart Rescue Asset Allocator
Provides:
  - GeoJSON flood zone polygons (red/yellow/green) for Assam
  - Map-ready SOS case markers with lat/lng coordinates
  - Smart asset recommendation logic based on zone type
"""

from typing import Dict, Any, List

# ─── Flood Zone Polygons (hardcoded around real Assam locations) ─────────────
# Each zone is a GeoJSON Polygon. Coords are [lng, lat] per GeoJSON spec.
FLOOD_ZONES = {
    "type": "FeatureCollection",
    "features": [
        # ── RED ZONES (>5 ft deep water) ─────────────────────────────────────
        {
            "type": "Feature",
            "id": "red-silchar",
            "properties": {
                "zone_type": "red",
                "label": "Silchar Red Zone",
                "depth": ">5 ft — Deep Floodwater",
                "asset": "NDRF Motorized Inflatable Boat / Helicopter",
                "rationale": "Deep red zone — motorized inflatable boat or air-lift required. Ground vehicles impassable."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [92.780, 24.855],
                    [92.845, 24.855],
                    [92.845, 24.810],
                    [92.780, 24.810],
                    [92.780, 24.855]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "red-barpeta",
            "properties": {
                "zone_type": "red",
                "label": "Barpeta Red Zone",
                "depth": ">5 ft — Deep Floodwater",
                "asset": "NDRF Motorized Inflatable Boat / Helicopter",
                "rationale": "Deep red zone — motorized inflatable boat or air-lift required. Ground vehicles impassable."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [91.010, 26.355],
                    [91.090, 26.355],
                    [91.090, 26.300],
                    [91.010, 26.300],
                    [91.010, 26.355]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "red-dibrugarh",
            "properties": {
                "zone_type": "red",
                "label": "Dibrugarh Red Zone",
                "depth": ">5 ft — Deep Floodwater",
                "asset": "NDRF Motorized Inflatable Boat / Helicopter",
                "rationale": "Deep red zone — Brahmaputra overbank. Motorized NDRF boats required."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [94.880, 27.530],
                    [94.960, 27.530],
                    [94.960, 27.465],
                    [94.880, 27.465],
                    [94.880, 27.530]
                ]]
            }
        },

        # ── YELLOW ZONES (1–4 ft shallow silt) ───────────────────────────────
        {
            "type": "Feature",
            "id": "yellow-karimganj",
            "properties": {
                "zone_type": "yellow",
                "label": "Karimganj Yellow Zone",
                "depth": "1–4 ft — Shallow Silt/Mud",
                "asset": "Shallow-Draft Canoe / Tractor-Trailer",
                "rationale": "Yellow zone — shallow silt present. Motorized boats will strand; use shallow-draft canoes or tractor-trailers."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [92.340, 24.885],
                    [92.410, 24.885],
                    [92.410, 24.840],
                    [92.340, 24.840],
                    [92.340, 24.885]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "yellow-morigaon",
            "properties": {
                "zone_type": "yellow",
                "label": "Morigaon Yellow Zone",
                "depth": "1–4 ft — Shallow Silt/Mud",
                "asset": "Shallow-Draft Canoe / Tractor-Trailer",
                "rationale": "Yellow zone — shallow inundation from Brahmaputra subsidiary. Flat-bottom canoe optimal."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [92.330, 26.255],
                    [92.420, 26.255],
                    [92.420, 26.185],
                    [92.330, 26.185],
                    [92.330, 26.255]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "yellow-nagaon",
            "properties": {
                "zone_type": "yellow",
                "label": "Nagaon Yellow Zone",
                "depth": "1–4 ft — Shallow Silt/Mud",
                "asset": "Shallow-Draft Canoe / Tractor-Trailer",
                "rationale": "Yellow zone — Kapili river overflow. Shallow canoe or high-clearance tractor recommended."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [92.665, 26.375],
                    [92.755, 26.375],
                    [92.755, 26.305],
                    [92.665, 26.305],
                    [92.665, 26.375]
                ]]
            }
        },

        # ── GREEN ZONES (safe / relief camps) ────────────────────────────────
        {
            "type": "Feature",
            "id": "green-guwahati",
            "properties": {
                "zone_type": "green",
                "label": "Guwahati Safe Zone / Relief Hub",
                "depth": "Dry / High Ground",
                "asset": "Ground Vehicle / Supply Truck",
                "rationale": "Green zone — elevated terrain. Ground vehicles and supply trucks fully operational."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [91.680, 26.195],
                    [91.800, 26.195],
                    [91.800, 26.095],
                    [91.680, 26.095],
                    [91.680, 26.195]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "green-tezpur",
            "properties": {
                "zone_type": "green",
                "label": "Tezpur Safe Zone / Camp",
                "depth": "1–2 ft — Passable Flood Edge",
                "asset": "Shallow-Draft Canoe / Ground Vehicle",
                "rationale": "Green-edge zone — minor inundation near camp perimeter. Canoe approach or wading feasible."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [92.780, 26.660],
                    [92.870, 26.660],
                    [92.870, 26.600],
                    [92.780, 26.600],
                    [92.780, 26.660]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "green-kaziranga",
            "properties": {
                "zone_type": "green",
                "label": "Kaziranga Embankment / Safe Zone",
                "depth": "Dry Embankment",
                "asset": "Ground Vehicle / Supply Truck",
                "rationale": "Green zone — embankment road clear. Supply trucks and ground vehicles can proceed."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [93.340, 26.590],
                    [93.460, 26.590],
                    [93.460, 26.515],
                    [93.340, 26.515],
                    [93.340, 26.590]
                ]]
            }
        }
    ]
}

# ── Exact coordinates for the 9 mock cases ───────────────────────────────────
# Matches cases in mock_data.py 1-to-1 by case_id
CASE_COORDINATES: Dict[str, Dict[str, float]] = {
    "c1a2b3c4-0001-4000-8000-000000000001": {"lat": 24.828, "lng": 92.800},   # Silchar Ward 5
    "c1a2b3c4-0002-4000-8000-000000000002": {"lat": 26.326, "lng": 91.008},   # Barpeta Town
    "c1a2b3c4-0003-4000-8000-000000000003": {"lat": 27.497, "lng": 94.912},   # Dibrugarh Embankment
    "c1a2b3c4-0004-4000-8000-000000000004": {"lat": 24.862, "lng": 92.367},   # Karimganj Main Bazaar
    "c1a2b3c4-0005-4000-8000-000000000005": {"lat": 26.635, "lng": 92.810},   # Tezpur Mission Chariali
    "c1a2b3c4-0006-4000-8000-000000000006": {"lat": 26.218, "lng": 92.378},   # Morigaon Bhuragaon
    "c1a2b3c4-0007-4000-8000-000000000007": {"lat": 26.348, "lng": 92.690},   # Nagaon Raha Ghat
    "c1a2b3c4-0008-4000-8000-000000000008": {"lat": 26.148, "lng": 91.742},   # Guwahati West Bharalumukh
    "c1a2b3c4-0009-4000-8000-000000000009": {"lat": 26.545, "lng": 93.398},   # Kaziranga Patrol Post 4
}

# ── Asset Allocator Rules ─────────────────────────────────────────────────────
def _point_in_polygon(lat: float, lng: float, polygon_coords: list) -> bool:
    """
    Ray-casting algorithm to test if (lat, lng) is inside a polygon.
    polygon_coords is a list of [lng, lat] pairs (GeoJSON order).
    """
    coords = polygon_coords[0]  # outer ring only
    n = len(coords)
    inside = False
    x, y = lng, lat
    j = n - 1
    for i in range(n):
        xi, yi = coords[i][0], coords[i][1]
        xj, yj = coords[j][0], coords[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def get_zone_for_coordinates(lat: float, lng: float) -> Dict[str, Any]:
    """Find which flood zone (if any) a lat/lng point falls within."""
    for feature in FLOOD_ZONES["features"]:
        poly_coords = feature["geometry"]["coordinates"]
        if _point_in_polygon(lat, lng, poly_coords):
            return {
                "zone_id": feature["id"],
                "zone_type": feature["properties"]["zone_type"],
                "label": feature["properties"]["label"],
                "depth": feature["properties"]["depth"],
                "asset": feature["properties"]["asset"],
                "rationale": feature["properties"]["rationale"],
            }
    # Default: if not in any polygon, treat as yellow (shallow edge)
    return {
        "zone_id": "default",
        "zone_type": "yellow",
        "label": "Unzoned Area (Flood Periphery)",
        "depth": "1–3 ft estimated",
        "asset": "Shallow-Draft Canoe / Tractor-Trailer",
        "rationale": "Area not yet mapped — estimated shallow periphery flood. Shallow-draft canoe recommended as precaution.",
    }


def allocate_rescue_asset(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Smart Rescue Asset Allocator: given a case dict, determine zone and recommend
    the appropriate rescue vehicle / asset with rationale.
    Returns enriched case dict with zone + asset recommendation.
    """
    case_id = case.get("case_id", "")
    coords = CASE_COORDINATES.get(case_id)

    if coords:
        lat, lng = coords["lat"], coords["lng"]
    else:
        # Fallback: try to parse a lat/lng if present
        lat = case.get("lat") or 26.1445
        lng = case.get("lng") or 91.7362

    zone_info = get_zone_for_coordinates(lat, lng)
    tier = case.get("tier", "Tier 3")
    vuln_flags = case.get("vulnerability_flags", [])

    # Override: If Tier 1 with acute_medical/unconscious/pregnant-in-labor → always recommend helicopter
    if tier == "Tier 1" and any(f in vuln_flags for f in ["unconscious", "acute_medical", "labor", "cardiac"]):
        zone_info["asset"] = "Helicopter (Medical Air-Lift)"
        zone_info["rationale"] = (
            f"Tier 1 acute medical emergency override — regardless of zone ({zone_info['zone_type']}), "
            f"helicopter air-lift recommended for fastest medical transport."
        )
    elif tier == "Tier 1" and zone_info["zone_type"] == "red":
        zone_info["asset"] = "NDRF Motorized Inflatable Boat + Medical Team"
        zone_info["rationale"] = (
            f"Tier 1 critical case in deep red zone (>5 ft). NDRF motorized inflatable boat with onboard "
            f"medical personnel required. Do not send shallow-draft canoe."
        )

    return {
        **case,
        "lat": lat,
        "lng": lng,
        "zone_type": zone_info["zone_type"],
        "zone_label": zone_info["label"],
        "zone_depth": zone_info["depth"],
        "recommended_asset": zone_info["asset"],
        "asset_rationale": zone_info["rationale"],
    }
