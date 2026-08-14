"""
Module 10 — Predictive Early-Warning Engine API
MOCK/SIMULATED ingestion feeds for Central Water Commission (CWC) river gauges,
India Meteorological Department (IMD) rainfall forecasts, and rule-based flood risk predictions.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Body, Path

router = APIRouter(prefix="", tags=["Early Warning Engine"])

# ── MOCK CWC RIVER GAUGE STATIONS DATASET ───────────────────────────────────────
# Note: Mock data simulating real-time Central Water Commission (CWC) API ingestion.
MOCK_RIVER_GAUGES = [
    {
        "station_id": "cwc-silchar-barak",
        "station_name": "Silchar Annapurna Ghat",
        "river_name": "Barak River",
        "district": "Cachar",
        "lat": 24.832,
        "lng": 92.805,
        "current_level_m": 20.45,
        "warning_level_m": 19.80,
        "danger_level_m": 19.83,
        "highest_flood_level_m": 21.98,
        "discharge_cusecs": 14200,
        "trend": "rising",
        "rate_of_rise_cm_per_hour": 14.5,
        "history_24h": [18.90, 19.10, 19.25, 19.45, 19.70, 19.95, 20.15, 20.30, 20.45]
    },
    {
        "station_id": "cwc-barpeta-manas",
        "station_name": "NH Crossing Barpeta",
        "river_name": "Manas River",
        "district": "Barpeta",
        "lat": 26.330,
        "lng": 91.015,
        "current_level_m": 46.10,
        "warning_level_m": 44.50,
        "danger_level_m": 45.00,
        "highest_flood_level_m": 47.30,
        "discharge_cusecs": 28900,
        "trend": "rising",
        "rate_of_rise_cm_per_hour": 11.2,
        "history_24h": [44.80, 45.05, 45.30, 45.55, 45.75, 45.90, 46.00, 46.05, 46.10]
    },
    {
        "station_id": "cwc-dibrugarh-brahmaputra",
        "station_name": "Dibrugarh Steamer Ghat",
        "river_name": "Brahmaputra River",
        "district": "Dibrugarh",
        "lat": 27.502,
        "lng": 94.920,
        "current_level_m": 105.85,
        "warning_level_m": 104.50,
        "danger_level_m": 105.70,
        "highest_flood_level_m": 106.48,
        "discharge_cusecs": 52400,
        "trend": "rising",
        "rate_of_rise_cm_per_hour": 8.0,
        "history_24h": [104.90, 105.10, 105.25, 105.40, 105.55, 105.65, 105.75, 105.80, 105.85]
    },
    {
        "station_id": "cwc-majuli-kamalabari",
        "station_name": "Majuli Kamalabari Ghat",
        "river_name": "Brahmaputra River",
        "district": "Majuli",
        "lat": 26.935,
        "lng": 94.180,
        "current_level_m": 86.40,
        "warning_level_m": 85.20,
        "danger_level_m": 85.90,
        "highest_flood_level_m": 87.15,
        "discharge_cusecs": 48100,
        "trend": "rising",
        "rate_of_rise_cm_per_hour": 9.4,
        "history_24h": [85.10, 85.35, 85.60, 85.80, 86.00, 86.15, 86.25, 86.35, 86.40]
    },
    {
        "station_id": "cwc-dhubri-brahmaputra",
        "station_name": "Dhubri Port Station",
        "river_name": "Brahmaputra River",
        "district": "Dhubri",
        "lat": 26.020,
        "lng": 89.980,
        "current_level_m": 29.80,
        "warning_level_m": 28.62,
        "danger_level_m": 29.27,
        "highest_flood_level_m": 30.52,
        "discharge_cusecs": 61200,
        "trend": "rising",
        "rate_of_rise_cm_per_hour": 7.8,
        "history_24h": [28.75, 28.95, 29.15, 29.35, 29.50, 29.62, 29.70, 29.75, 29.80]
    },
    {
        "station_id": "cwc-tezpur-jiabharali",
        "station_name": "Tezpur Koliabhomora Bridge",
        "river_name": "Jia Bharali River",
        "district": "Sonitpur",
        "lat": 26.640,
        "lng": 92.815,
        "current_level_m": 64.90,
        "warning_level_m": 64.00,
        "danger_level_m": 65.20,
        "highest_flood_level_m": 66.10,
        "discharge_cusecs": 21800,
        "trend": "stable",
        "rate_of_rise_cm_per_hour": 2.0,
        "history_24h": [64.60, 64.70, 64.75, 64.80, 64.85, 64.88, 64.90, 64.90, 64.90]
    },
    {
        "station_id": "cwc-guwahati-brahmaputra",
        "station_name": "Guwahati DC Court Ghat",
        "river_name": "Brahmaputra River",
        "district": "Kamrup Metropolitan",
        "lat": 26.155,
        "lng": 91.745,
        "current_level_m": 48.90,
        "warning_level_m": 48.68,
        "danger_level_m": 49.68,
        "highest_flood_level_m": 51.46,
        "discharge_cusecs": 44300,
        "trend": "rising",
        "rate_of_rise_cm_per_hour": 5.5,
        "history_24h": [48.10, 48.25, 48.40, 48.55, 48.68, 48.75, 48.82, 48.87, 48.90]
    },
    {
        "station_id": "cwc-nagaon-kopili",
        "station_name": "Kopili River Bridge Kampur",
        "river_name": "Kopili River",
        "district": "Nagaon",
        "lat": 26.355,
        "lng": 92.700,
        "current_level_m": 59.80,
        "warning_level_m": 59.00,
        "danger_level_m": 60.50,
        "highest_flood_level_m": 61.79,
        "discharge_cusecs": 18500,
        "trend": "falling",
        "rate_of_rise_cm_per_hour": -3.0,
        "history_24h": [60.40, 60.30, 60.20, 60.10, 60.00, 59.95, 59.90, 59.85, 59.80]
    }
]

# ── MOCK IMD RAINFALL FORECAST DATASET ──────────────────────────────────────────
# Note: Mock data simulating real-time India Meteorological Department (IMD) API feed.
MOCK_RAINFALL_FORECASTS = [
    {
        "district_name": "Cachar",
        "forecast_mm_next_6h": 85.0,
        "forecast_mm_next_24h": 210.0,
        "alert_level": "very_heavy"
    },
    {
        "district_name": "Barpeta",
        "forecast_mm_next_6h": 62.0,
        "forecast_mm_next_24h": 165.0,
        "alert_level": "very_heavy"
    },
    {
        "district_name": "Dibrugarh",
        "forecast_mm_next_6h": 45.0,
        "forecast_mm_next_24h": 115.0,
        "alert_level": "heavy"
    },
    {
        "district_name": "Sonitpur",
        "forecast_mm_next_6h": 28.0,
        "forecast_mm_next_24h": 70.0,
        "alert_level": "normal"
    },
    {
        "district_name": "Kamrup Metropolitan",
        "forecast_mm_next_6h": 34.0,
        "forecast_mm_next_24h": 90.0,
        "alert_level": "heavy"
    },
    {
        "district_name": "Nagaon",
        "forecast_mm_next_6h": 15.0,
        "forecast_mm_next_24h": 45.0,
        "alert_level": "normal"
    }
]

# In-memory log of dispatched pre-emptive alerts
ALERT_HISTORY: List[Dict[str, Any]] = []


# ── Rule-Based Risk Engine Helper ───────────────────────────────────────────────
def calculate_flood_risk(gauge: Dict[str, Any], rain: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    curr = gauge["current_level_m"]
    danger = gauge["danger_level_m"]
    warning = gauge["warning_level_m"]
    rate = gauge["rate_of_rise_cm_per_hour"]
    alert_level = rain.get("alert_level", "normal") if rain else "normal"

    # Risk ranking logic
    if curr >= danger or (rate >= 12.0 and alert_level in ["heavy", "very_heavy"]):
        risk = "critical"
    elif curr >= warning or rate >= 7.0 or alert_level == "very_heavy":
        risk = "high"
    elif rate >= 4.0 or alert_level == "heavy":
        risk = "moderate"
    else:
        risk = "low"

    # Estimate hours until flooding (danger level breach)
    if curr >= danger:
        hrs = 0.0
    elif rate > 0:
        gap_m = danger - curr
        hrs = round(gap_m / (rate / 100.0), 1)
    else:
        hrs = 24.0

    return {
        "station_id": gauge["station_id"],
        "region_name": f"{gauge['district']} ({gauge['river_name']})",
        "district": gauge["district"],
        "station_name": gauge["station_name"],
        "lat": gauge["lat"],
        "lng": gauge["lng"],
        "current_level_m": curr,
        "danger_level_m": danger,
        "rate_of_rise_cm_per_hour": rate,
        "rainfall_alert": alert_level,
        "predicted_flood_risk": risk,
        "estimated_hours_until_flooding": max(0.0, hrs)
    }


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.get("/api/river-gauge-data")
def get_river_gauge_data():
    """
    Returns real-time CWC river gauge readings for Assam monitoring stations.
    MOCK/SIMULATED for hackathon build — placeholder for live CWC API integration.
    """
    return {
        "status": "success",
        "data_source": "Central Water Commission (CWC) River Monitoring Feed (Simulated)",
        "total_stations": len(MOCK_RIVER_GAUGES),
        "stations": MOCK_RIVER_GAUGES
    }


@router.get("/api/rainfall-forecast")
def get_rainfall_forecast():
    """
    Returns IMD 6h and 24h rainfall forecasts for Assam districts.
    MOCK/SIMULATED for hackathon build — placeholder for live IMD API integration.
    """
    return {
        "status": "success",
        "data_source": "India Meteorological Department (IMD) Forecast Feed (Simulated)",
        "districts": MOCK_RAINFALL_FORECASTS
    }


@router.get("/api/flood-risk-prediction")
def get_flood_risk_prediction():
    """
    Rule-based predictive flood risk model combining CWC river gauge rate of rise
    and IMD rainfall forecasts to predict inundation risk per district/village.
    """
    rain_map = {r["district_name"]: r for r in MOCK_RAINFALL_FORECASTS}
    predictions = []

    for g in MOCK_RIVER_GAUGES:
        rain = rain_map.get(g["district"])
        pred = calculate_flood_risk(g, rain)
        predictions.append(pred)

    # Sort predictions: critical -> high -> moderate -> low
    risk_weights = {"critical": 1, "high": 2, "moderate": 3, "low": 4}
    predictions.sort(key=lambda x: (risk_weights.get(x["predicted_flood_risk"], 5), x["estimated_hours_until_flooding"]))

    return {
        "status": "success",
        "total_regions": len(predictions),
        "predictions": predictions,
        "critical_count": sum(1 for p in predictions if p["predicted_flood_risk"] == "critical"),
        "high_count": sum(1 for p in predictions if p["predicted_flood_risk"] == "high")
    }


@router.post("/api/early-warning/alert/{region}")
def send_preemptive_evacuation_alert(region: str = Path(...)):
    """
    Simulates broadcasting a pre-emptive evacuation alert (IVR / SMS / siren)
    for a high-risk region before floodwaters breach danger levels.
    """
    alert_id = f"alt-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "alert_id": alert_id,
        "region": region,
        "timestamp": now_iso,
        "status": "dispatched",
        "recipients_notified": 14200,
        "channels": ["IVR_VOICE_BROADCAST", "CELL_BROADCAST_SMS", "SIREN_STATION"]
    }
    ALERT_HISTORY.insert(0, record)

    return {
        "status": "success",
        "message": f"Pre-emptive evacuation alert successfully broadcast for {region}.",
        "alert": record
    }
