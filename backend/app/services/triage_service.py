"""
Module 2 & Module 8 — Demographic Vulnerability Matrix (DVS) Triage
and SOS Deduplication & Clustering Engine.
"""

import logging
import math
from typing import List, Dict, Any, Optional
from copy import deepcopy
from datetime import datetime, timezone
import uuid
from app.services.mock_data import INITIAL_MOCK_CASES

logger = logging.getLogger("triage_service")

# Critical acute medical / vulnerability flags triggering Tier 1
TIER_1_VULN_FLAGS = {"pregnant", "infant", "acute_medical", "unconscious", "labor", "critical_medical", "cardiac", "stroke", "severe_bleeding"}
TIER_1_EMERGENCY_CATS = {"labor"}

# Vulnerability flags triggering Tier 2
TIER_2_VULN_FLAGS = {"elderly", "disabled", "dialysis", "injured"}

# Case coordinates lookup for distance calculations
CASE_COORDINATES = {
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


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Haversine distance in kilometers between two coordinates."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def parse_iso_datetime(ts_str: str) -> datetime:
    """Parse ISO8601 string to aware UTC datetime."""
    if not ts_str:
        return datetime.now(timezone.utc)
    s = str(ts_str)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def time_difference_minutes(ts1_str: str, ts2_str: str) -> float:
    """Return absolute time difference in minutes between two timestamps."""
    dt1 = parse_iso_datetime(ts1_str)
    dt2 = parse_iso_datetime(ts2_str)
    return abs((dt1 - dt2).total_seconds()) / 60.0


def get_case_coords(case_dict: Dict[str, Any]) -> tuple:
    """Resolves latitude and longitude coordinates for a case."""
    if case_dict.get("lat") is not None and case_dict.get("lng") is not None:
        return float(case_dict["lat"]), float(case_dict["lng"])

    if isinstance(case_dict.get("geometry"), dict) and "coordinates" in case_dict["geometry"]:
        coords = case_dict["geometry"]["coordinates"]
        return float(coords[1]), float(coords[0])

    case_id = case_dict.get("case_id", "")
    if case_id in CASE_COORDINATES:
        return CASE_COORDINATES[case_id]["lat"], CASE_COORDINATES[case_id]["lng"]

    # Landmark keyword fallback
    lm = case_dict.get("gps_or_landmark", "").lower()
    if "silchar" in lm: return 24.828, 92.800
    elif "barpeta" in lm: return 26.326, 91.008
    elif "dibrugarh" in lm: return 27.497, 94.912
    elif "karimganj" in lm: return 24.862, 92.367
    elif "tezpur" in lm: return 26.635, 92.810
    elif "morigaon" in lm: return 26.218, 92.378
    elif "nagaon" in lm: return 26.348, 92.690
    elif "guwahati" in lm: return 26.148, 91.742
    elif "kaziranga" in lm: return 26.545, 93.398

    return 26.1445, 91.7362


def assign_dvs_tier(case_data: Dict[str, Any]) -> str:
    """
    Demographic Vulnerability Priority Matrix (DVS) 3-tier assigner.
    """
    vuln_flags = set(case_data.get("vulnerability_flags", []))
    emergency_cats = set(case_data.get("emergency_categories", []))

    # Check Tier 1 triggers
    has_tier1_vuln = bool(vuln_flags.intersection(TIER_1_VULN_FLAGS))
    has_tier1_cat = bool(emergency_cats.intersection(TIER_1_EMERGENCY_CATS))

    if has_tier1_vuln or has_tier1_cat:
        return "Tier 1"

    # Check Tier 2 triggers
    has_tier2_vuln = bool(vuln_flags.intersection(TIER_2_VULN_FLAGS))
    if has_tier2_vuln:
        return "Tier 2"

    return "Tier 3"


def get_tier_rank(tier_name: str) -> int:
    mapping = {"Tier 1": 1, "Tier 2": 2, "Tier 3": 3}
    return mapping.get(tier_name, 3)


def parse_timestamp_key(ts_str: str) -> str:
    if not ts_str:
        return datetime.now(timezone.utc).isoformat()
    return str(ts_str)


def sort_triage_queue(cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(
        cases,
        key=lambda c: (
            get_tier_rank(c.get("tier", "Tier 3")),
            -int(c.get("urgency_score", 1)),
            parse_timestamp_key(c.get("timestamp", ""))
        )
    )


class PriorityQueueStore:
    """In-memory store for managing live priority queue and mock cases."""

    def __init__(self):
        self._cases: Dict[str, Dict[str, Any]] = {}
        self.reset_to_mock_data()

    def reset_to_mock_data(self) -> List[Dict[str, Any]]:
        """Re-seed queue with default mock cases & demo deduplication cluster."""
        self._cases = {}

        # 1. Ingest base 9 cases
        for c in INITIAL_MOCK_CASES:
            case_copy = deepcopy(c)
            case_copy["tier"] = assign_dvs_tier(case_copy)
            case_copy["merged_count"] = case_copy.get("merged_count", 1)
            case_copy["merged_reports"] = case_copy.get("merged_reports", [{
                "report_id": case_copy["case_id"],
                "raw_transcript": case_copy.get("raw_transcript"),
                "timestamp": case_copy.get("timestamp")
            }])
            self._cases[case_copy["case_id"]] = case_copy

        # 2. Seed Module 8 Demo Scenario 1: Duplicate Cluster (Silchar Ward 5)
        # Dup report 1 (7 mins later, lat 24.829, lng 92.801)
        self.add_or_update_case({
            "case_id": "dup-silchar-001",
            "raw_transcript": "Silchar Ward 5 is completely under water! 5 people stranded on house roof with rising currents.",
            "language_detected": "English",
            "gps_or_landmark": "Silchar Ward 5, Cachar District",
            "lat": 24.829, "lng": 92.801,
            "victim_count": 5,
            "emergency_categories": ["rising_water", "stranded"],
            "vulnerability_flags": ["infant"],
            "urgency_score": 5,
            "timestamp": "2026-08-03T07:22:00Z"
        })

        # Dup report 2 (14 mins later, lat 24.827, lng 92.799)
        self.add_or_update_case({
            "case_id": "dup-silchar-002",
            "raw_transcript": "Water entering first floor near Silchar Ward 5 school. Pregnant woman needs evacuation!",
            "language_detected": "English",
            "gps_or_landmark": "Silchar Ward 5, Sector B",
            "lat": 24.827, "lng": 92.799,
            "victim_count": 3,
            "emergency_categories": ["medical", "labor"],
            "vulnerability_flags": ["pregnant"],
            "urgency_score": 5,
            "timestamp": "2026-08-03T07:29:00Z"
        })

        # 3. Seed Module 8 Demo Scenario 2: Separate Nearby Case (3.1km away, should NOT merge)
        self.add_or_update_case({
            "case_id": "c1a2b3c4-0010-separate-nearby",
            "raw_transcript": "Separate flood report near Silchar Medical College Gate, 3km north. Water levels rising.",
            "language_detected": "English",
            "gps_or_landmark": "Silchar Medical College Road",
            "lat": 24.855, "lng": 92.780,
            "victim_count": 2,
            "emergency_categories": ["rising_water"],
            "vulnerability_flags": [],
            "urgency_score": 3,
            "timestamp": "2026-08-03T07:20:00Z"
        })

        logger.info(f"Initialized queue store with {len(self._cases)} mock cases & deduplication clusters.")
        return self.get_prioritized_queue()

    def check_and_merge_duplicate(self, new_case: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Module 8 Deduplication Logic:
        Checks if new_case is within ~2km AND within 30 mins of an existing case.
        If match found, merges into existing case and returns it.
        """
        lat1, lng1 = get_case_coords(new_case)
        ts1 = new_case.get("timestamp")

        for existing_id, existing_case in list(self._cases.items()):
            if existing_id == new_case.get("case_id"):
                continue

            lat2, lng2 = get_case_coords(existing_case)
            ts2 = existing_case.get("timestamp")

            dist_km = haversine_distance(lat1, lng1, lat2, lng2)
            time_diff_min = time_difference_minutes(ts1, ts2)

            # Deduplication Threshold: <= 2.0 km AND <= 30 minutes
            if dist_km <= 2.0 and time_diff_min <= 30.0:
                logger.info(f"⚡ SOS CLUSTER MATCH: Ingested case ({dist_km:.2f}km, {time_diff_min:.1f}min) merging into existing case {existing_id}")

                # 1. Take MAX of victim count (never sum)
                existing_case["victim_count"] = max(existing_case.get("victim_count", 1), new_case.get("victim_count", 1))

                # 2. Take MAX of urgency score
                existing_case["urgency_score"] = max(existing_case.get("urgency_score", 1), new_case.get("urgency_score", 1))

                # 3. Union of vulnerability flags
                v_flags = list(set(existing_case.get("vulnerability_flags", [])) | set(new_case.get("vulnerability_flags", [])))
                existing_case["vulnerability_flags"] = v_flags

                # 4. Union of emergency categories
                e_cats = list(set(existing_case.get("emergency_categories", [])) | set(new_case.get("emergency_categories", [])))
                existing_case["emergency_categories"] = e_cats

                # 5. Re-evaluate DVS tier
                existing_case["tier"] = assign_dvs_tier(existing_case)

                # 6. Increment merged_count
                existing_case["merged_count"] = existing_case.get("merged_count", 1) + 1

                # 7. Append report to merged_reports array
                m_reports = existing_case.get("merged_reports") or []
                if not m_reports:
                    m_reports.append({
                        "report_id": existing_case.get("case_id"),
                        "raw_transcript": existing_case.get("raw_transcript"),
                        "timestamp": existing_case.get("timestamp"),
                        "landmark": existing_case.get("gps_or_landmark")
                    })

                m_reports.append({
                    "report_id": new_case.get("case_id", f"rep-{uuid.uuid4().hex[:6]}"),
                    "raw_transcript": new_case.get("raw_transcript"),
                    "timestamp": new_case.get("timestamp"),
                    "landmark": new_case.get("gps_or_landmark")
                })
                existing_case["merged_reports"] = m_reports

                return existing_case

        return None

    def add_or_update_case(self, case_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new case or merge into existing duplicate case."""
        case_copy = deepcopy(case_dict)
        if not case_copy.get("case_id"):
            case_copy["case_id"] = str(uuid.uuid4())
        if not case_copy.get("timestamp"):
            case_copy["timestamp"] = datetime.now(timezone.utc).isoformat()

        # Check Module 8 Deduplication
        merged_target = self.check_and_merge_duplicate(case_copy)
        if merged_target:
            return merged_target

        # Compute DVS tier dynamically for new case
        case_copy["tier"] = assign_dvs_tier(case_copy)
        case_copy["merged_count"] = case_copy.get("merged_count", 1)
        if not case_copy.get("merged_reports"):
            case_copy["merged_reports"] = [{
                "report_id": case_copy["case_id"],
                "raw_transcript": case_copy.get("raw_transcript"),
                "timestamp": case_copy.get("timestamp"),
                "landmark": case_copy.get("gps_or_landmark")
            }]

        self._cases[case_copy["case_id"]] = case_copy
        logger.info(f"Case {case_copy['case_id']} added as distinct case with tier {case_copy['tier']}.")
        return case_copy

    def get_case(self, case_id: str) -> Dict[str, Any]:
        return self._cases.get(case_id)

    def get_prioritized_queue(self) -> List[Dict[str, Any]]:
        all_cases = list(self._cases.values())
        return sort_triage_queue(all_cases)

    def get_grouped_queue(self) -> Dict[str, List[Dict[str, Any]]]:
        sorted_all = self.get_prioritized_queue()
        grouped = {
            "Tier 1": [],
            "Tier 2": [],
            "Tier 3": []
        }
        for c in sorted_all:
            t = c.get("tier", "Tier 3")
            if t in grouped:
                grouped[t].append(c)
            else:
                grouped["Tier 3"].append(c)
        return grouped

    def update_case_fields(self, case_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        if case_id not in self._cases:
            return None
        c = self._cases[case_id]
        c.update(updates)
        if ("vulnerability_flags" in updates or "emergency_categories" in updates) and "tier" not in updates:
            c["tier"] = assign_dvs_tier(c)
        return c


# Global single instance of queue store
queue_store = PriorityQueueStore()
