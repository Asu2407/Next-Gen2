from fastapi import APIRouter
from fastapi.responses import FileResponse
from typing import List, Optional
import os
import logging

from app.services.map_service import FLOOD_ZONES, CASE_COORDINATES, allocate_rescue_asset
from app.services.triage_service import queue_store

logger = logging.getLogger("map_route")
router = APIRouter(prefix="", tags=["Water Zonation & Rescue Asset Allocator"])

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")


@router.get("/map")
def get_map_page():
    """Serve the Mapbox tactical operations map UI."""
    map_path = os.path.join(STATIC_DIR, "map.html")
    if os.path.exists(map_path):
        return FileResponse(map_path)
    return {"error": "Map UI not found. Check static/map.html"}


# ── RESCUE ASSET BASES (NDRF / SDRF / ARMY / IAF) ──────────────────────────────
RESCUE_STATIONS = [
    {
        "station_id": "ndrf-patgaon-guwahati",
        "name": "NDRF 1st Bn HQ (Patgaon)",
        "agency": "NDRF",
        "lat": 26.115,
        "lng": 91.590,
        "type": "Heavy Rescue Base",
        "assets_available": {
            "motorized_inflatable_boats": 42,
            "deep_divers": 16,
            "medical_catamarans": 4,
            "paramedic_units": 8
        },
        "status": "active",
        "contact_freq": "148.250 MHz"
    },
    {
        "station_id": "sdrf-barpeta-base",
        "name": "SDRF Water Rescue Base (Barpeta)",
        "agency": "SDRF",
        "lat": 26.315,
        "lng": 91.005,
        "type": "Rapid Water Inundation Base",
        "assets_available": {
            "inflatable_speedboats": 18,
            "shallow_draft_canoes": 24,
            "paramedic_units": 5
        },
        "status": "active",
        "contact_freq": "152.125 MHz"
    },
    {
        "station_id": "army-tezpur-column",
        "name": "Indian Army Flood Relief Column (Tezpur)",
        "agency": "Indian Army",
        "lat": 26.635,
        "lng": 92.795,
        "type": "Amphibious Task Force",
        "assets_available": {
            "baut_assault_boats": 14,
            "alh_dhruv_helicopters": 3,
            "heavy_water_pumps": 6
        },
        "status": "standby",
        "contact_freq": "141.800 MHz"
    },
    {
        "station_id": "iaf-borjhar-heli",
        "name": "IAF Tactical Air Base (Borjhar)",
        "agency": "IAF",
        "lat": 26.105,
        "lng": 91.585,
        "type": "Airlift & Winch Rescue Wing",
        "assets_available": {
            "mi17_heavy_lift": 4,
            "alh_air_ambulance": 6,
            "airdrop_food_packets": 25000
        },
        "status": "active",
        "contact_freq": "121.500 MHz"
    },
    {
        "station_id": "ndrf-silchar-fob",
        "name": "NDRF Forward Base (Silchar Barak)",
        "agency": "NDRF",
        "lat": 24.890,
        "lng": 92.830,
        "type": "Riverine Surge Unit",
        "assets_available": {
            "motorized_inflatable_boats": 28,
            "shallow_canoes": 15,
            "trauma_care_boat": 2
        },
        "status": "active",
        "contact_freq": "149.300 MHz"
    },
    {
        "station_id": "majuli-river-ambulance",
        "name": "Majuli Island Floating Clinic & Catamaran Unit",
        "agency": "National Health Mission",
        "lat": 26.940,
        "lng": 94.165,
        "type": "Maternity & Trauma Boat Base",
        "assets_available": {
            "boat_ambulances": 4,
            "neonatal_incubators": 2,
            "nurse_practitioners": 6
        },
        "status": "active",
        "contact_freq": "156.800 MHz"
    }
]


@router.get("/api/map-data")
def get_map_data():
    """
    Returns GeoJSON flood zones + SOS case pins enriched with zone classification,
    Smart Rescue Asset Allocator recommendations, rescue stations, and Module 8 merged reports.
    """
    # Get prioritized cases from queue store
    all_cases = queue_store.get_prioritized_queue()

    # Enrich each case with coordinates, zone, asset recommendation, and merged reports
    enriched_cases = [allocate_rescue_asset(c) for c in all_cases]

    # Build GeoJSON FeatureCollection for case markers
    case_features = []
    for c in enriched_cases:
        case_features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [c.get("lng", 91.7362), c.get("lat", 26.1445)]
            },
            "properties": {
                "case_id": c.get("case_id", ""),
                "gps_or_landmark": c.get("gps_or_landmark", "Unknown Location"),
                "tier": c.get("tier", "Tier 3"),
                "urgency_score": c.get("urgency_score", 3),
                "victim_count": c.get("victim_count", 1),
                "vulnerability_flags": c.get("vulnerability_flags", []),
                "emergency_categories": c.get("emergency_categories", []),
                "tele_health_status": c.get("tele_health_status", "not_needed"),
                "summary": c.get("summary", ""),
                "timestamp": c.get("timestamp", ""),
                "zone_type": c.get("zone_type", "green"),
                "zone_label": c.get("zone_label", "Safe Zone"),
                "zone_depth": c.get("zone_depth", "Dry Ground"),
                "recommended_asset": c.get("recommended_asset", "Ground Vehicle"),
                "asset_rationale": c.get("asset_rationale", ""),
                "merged_count": c.get("merged_count", 1),
                "merged_reports": c.get("merged_reports"),
                "is_dispatched": c.get("is_dispatched", False),
                "dispatch_station": c.get("dispatch_station", None),
                "eta_minutes": c.get("eta_minutes", None)
            }
        })

    return {
        "status": "success",
        "center": {"lat": 26.1445, "lng": 91.7362},   # Guwahati center
        "flood_zones": FLOOD_ZONES,
        "rescue_stations": RESCUE_STATIONS,
        "cases": {
            "type": "FeatureCollection",
            "features": case_features
        },
        "total_cases": len(enriched_cases),
        "legend": {
            "red": "Deep water (>5 ft) — NDRF motorized boat / helicopter",
            "yellow": "Shallow silt (1–4 ft) — shallow-draft canoe / tractor",
            "green": "Safe ground / relief camp — ground vehicle / supply truck"
        }
    }


@router.post("/api/dispatch-rescue")
def dispatch_rescue_asset(payload: dict):
    """
    Allocates a specific rescue unit from the nearest base station to an SOS case,
    calculates dynamic travel distance & ETA, and updates case dispatch state.
    """
    case_id = payload.get("case_id")
    station_id = payload.get("station_id")
    asset_type = payload.get("asset_type", "NDRF Motorized Inflatable Boat")

    case = queue_store.get_case(case_id)
    if not case:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    # Find chosen or closest station
    station = next((s for s in RESCUE_STATIONS if s["station_id"] == station_id), RESCUE_STATIONS[0])

    # Coordinates unpack
    case_coords = CASE_COORDINATES.get(case_id, {"lat": 26.1445, "lng": 91.7362})
    if isinstance(case_coords, dict):
        c_lat, c_lng = case_coords.get("lat", 26.1445), case_coords.get("lng", 91.7362)
    elif isinstance(case_coords, (list, tuple)):
        c_lat, c_lng = case_coords[0], case_coords[1]
    else:
        c_lat, c_lng = 26.1445, 91.7362
    s_lat, s_lng = station["lat"], station["lng"]

    import math
    dist_km = math.sqrt((c_lat - s_lat)**2 + (c_lng - s_lng)**2) * 111.0
    speed_kmh = 35.0 if "Boat" in asset_type else (140.0 if "Helicopter" in asset_type else 25.0)
    eta_mins = max(4, round((dist_km / speed_kmh) * 60))

    # Update case with dispatch details
    case["is_dispatched"] = True
    case["dispatch_station"] = station["name"]
    case["dispatch_asset"] = asset_type
    case["eta_minutes"] = eta_mins
    case["dispatch_timestamp"] = payload.get("timestamp")
    queue_store.add_or_update_case(case)

    return {
        "status": "success",
        "message": f"Assigned {asset_type} from {station['name']} to case {case_id}",
        "case_id": case_id,
        "station": station,
        "distance_km": round(dist_km, 1),
        "eta_minutes": eta_mins,
        "route_waypoints": [
            [station["lat"], station["lng"]],
            [(station["lat"] + c_lat) / 2 + 0.01, (station["lng"] + c_lng) / 2],
            [c_lat, c_lng]
        ]
    }


@router.get("/api/asset-recommendation/{case_id}")
def get_asset_recommendation(case_id: str):
    """Get the Smart Rescue Asset recommendation for a specific case."""
    case = queue_store.get_case(case_id)
    if not case:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found in queue.")

    enriched = allocate_rescue_asset(case)
    return {
        "status": "success",
        "case_id": case_id,
        "gps_or_landmark": enriched.get("gps_or_landmark"),
        "tier": enriched.get("tier"),
        "zone_type": enriched.get("zone_type"),
        "zone_label": enriched.get("zone_label"),
        "zone_depth": enriched.get("zone_depth"),
        "recommended_asset": enriched.get("recommended_asset"),
        "asset_rationale": enriched.get("asset_rationale"),
        "coordinates": {"lat": enriched.get("lat"), "lng": enriched.get("lng")}
    }
