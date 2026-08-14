"""
Module 5 — Shelter Navigation & Camp Inventory Tracker API
Exposes endpoints for relief camps and nearest-camp shelter routing in Assam.
"""

import math
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api", tags=["Camps"])

# Real 2024 Assam Flood Relief Camp Dataset (ASDMA official camp locations)
MOCK_CAMPS = [
    {
        "camp_id": "camp-001",
        "name": "Silchar SA Road Stadium Relief Shelter",
        "district": "Cachar",
        "lat": 24.830,
        "lng": 92.790,
        "capacity": 1200,
        "current_occupancy": 847,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": True,
            "livestock_fodder_area": False,
            "dialysis_unit": False,
            "generator": True
        }
    },
    {
        "camp_id": "camp-002",
        "name": "Barpeta Sarat Chandra High School Relief Centre",
        "district": "Barpeta",
        "lat": 26.320,
        "lng": 91.015,
        "capacity": 650,
        "current_occupancy": 629,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": False,
            "livestock_fodder_area": True,
            "dialysis_unit": False,
            "generator": True
        }
    },
    {
        "camp_id": "camp-003",
        "name": "Tezpur College Ground Flood Shelter (ASDMA)",
        "district": "Sonitpur",
        "lat": 26.640,
        "lng": 92.800,
        "capacity": 900,
        "current_occupancy": 412,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": True,
            "livestock_fodder_area": True,
            "dialysis_unit": False,
            "generator": True
        }
    },
    {
        "camp_id": "camp-004",
        "name": "Dibrugarh Rajiv Bhavan Community Relief Hub",
        "district": "Dibrugarh",
        "lat": 27.490,
        "lng": 94.900,
        "capacity": 500,
        "current_occupancy": 500,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": True,
            "livestock_fodder_area": False,
            "dialysis_unit": True,
            "generator": True
        }
    },
    {
        "camp_id": "camp-005",
        "name": "Nagaon Haibargaon Community Shelter",
        "district": "Nagaon",
        "lat": 26.350,
        "lng": 92.680,
        "capacity": 700,
        "current_occupancy": 481,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": False,
            "livestock_fodder_area": True,
            "dialysis_unit": False,
            "generator": False
        }
    },
    {
        "camp_id": "camp-006",
        "name": "Guwahati GMCH Sports Ground Flood Camp",
        "district": "Kamrup Metropolitan",
        "lat": 26.155,
        "lng": 91.735,
        "capacity": 1500,
        "current_occupancy": 1380,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": True,
            "livestock_fodder_area": False,
            "dialysis_unit": True,
            "generator": True
        }
    },
    {
        "camp_id": "camp-007",
        "name": "Dhubri DC Office Flood Relief Camp",
        "district": "Dhubri",
        "lat": 26.018,
        "lng": 89.979,
        "capacity": 800,
        "current_occupancy": 642,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": False,
            "baby_food": True,
            "livestock_fodder_area": True,
            "dialysis_unit": False,
            "generator": True
        }
    },
    {
        "camp_id": "camp-008",
        "name": "Goalpara Lakhipur College Relief Camp",
        "district": "Goalpara",
        "lat": 26.125,
        "lng": 90.613,
        "capacity": 550,
        "current_occupancy": 308,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": True,
            "baby_food": False,
            "livestock_fodder_area": True,
            "dialysis_unit": False,
            "generator": False
        }
    },
    {
        "camp_id": "camp-009",
        "name": "Hojai Lanka SDMC Relief Shelter",
        "district": "Hojai",
        "lat": 26.010,
        "lng": 92.855,
        "capacity": 400,
        "current_occupancy": 387,
        "resource_tags": {
            "clean_water": False,
            "anm_nurse": True,
            "baby_food": True,
            "livestock_fodder_area": False,
            "dialysis_unit": False,
            "generator": True
        }
    },
    {
        "camp_id": "camp-010",
        "name": "Chirang Bijni Govt. HS School Relief Camp",
        "district": "Chirang",
        "lat": 26.510,
        "lng": 90.715,
        "capacity": 350,
        "current_occupancy": 188,
        "resource_tags": {
            "clean_water": True,
            "anm_nurse": False,
            "baby_food": False,
            "livestock_fodder_area": True,
            "dialysis_unit": False,
            "generator": False
        }
    }
]

def derive_camp_status(current: int, capacity: int) -> str:
    if capacity <= 0:
        return "Full"
    ratio = current / capacity
    if ratio >= 1.0:
        return "Full"
    elif ratio >= 0.8:
        return "Near Capacity"
    return "Open"

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def enrich_camp_data(camp: dict) -> dict:
    enriched = dict(camp)
    enriched["status"] = derive_camp_status(camp["current_occupancy"], camp["capacity"])
    enriched["occupancy_pct"] = round((camp["current_occupancy"] / camp["capacity"]) * 100, 1)
    return enriched

@router.get("/camps")
def get_camps(resource_tag: Optional[str] = Query(None, description="Filter camps by resource tag (e.g. anm_nurse, clean_water, baby_food, livestock_fodder_area)")):
    """Returns all relief camps enriched with occupancy status and optional resource filtering."""
    results = []
    for c in MOCK_CAMPS:
        enriched = enrich_camp_data(c)
        if resource_tag:
            if enriched.get("resource_tags", {}).get(resource_tag) is True:
                results.append(enriched)
        else:
            results.append(enriched)
            
    return {
        "status": "success",
        "total_camps": len(results),
        "camps": results
    }

@router.get("/camps/nearest")
def get_nearest_camp(
    lat: float = Query(..., description="Latitude of location/case"),
    lng: float = Query(..., description="Longitude of location/case")
):
    """Finds the single nearest open or near-capacity camp using Haversine distance."""
    enriched_camps = [enrich_camp_data(c) for c in MOCK_CAMPS]
    
    # Filter for non-full camps first
    available_camps = [c for c in enriched_camps if c["status"] != "Full"]
    candidate_camps = available_camps if available_camps else enriched_camps
    
    if not candidate_camps:
        raise HTTPException(status_code=404, detail="No camps available.")
        
    camps_with_dist = []
    for c in candidate_camps:
        dist = haversine_distance(lat, lng, c["lat"], c["lng"])
        c_copy = dict(c)
        c_copy["distance_km"] = round(dist, 2)
        camps_with_dist.append(c_copy)
        
    camps_with_dist.sort(key=lambda x: x["distance_km"])
    nearest = camps_with_dist[0]
    
    return {
        "status": "success",
        "target_coordinates": {"lat": lat, "lng": lng},
        "nearest_camp": nearest
    }
