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


@router.get("/api/map-data")
def get_map_data():
    """
    Returns GeoJSON flood zones + SOS case pins enriched with zone classification,
    Smart Rescue Asset Allocator recommendations, and Module 8 merged deduplication reports.
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
            }
        })

    return {
        "status": "success",
        "center": {"lat": 26.1445, "lng": 91.7362},   # Guwahati center
        "flood_zones": FLOOD_ZONES,
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
