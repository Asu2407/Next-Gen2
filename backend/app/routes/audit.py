"""
Module 6 — System Audit & Government Accountability API
Part 1: "Still Stranded" Overdue Alert System
Part 2: Crowd-Sourced Relief Quality Feedback
Part 3: Public Health Hazard Detection
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query, Body

from app.services.triage_service import queue_store, assign_dvs_tier
from app.routes.camps import MOCK_CAMPS

router = APIRouter(prefix="/api/audit", tags=["Audit System"])

# ── Part 2 & 3: In-Memory Feedback & Hazard Store ──────────────────────────────
HAZARD_KEYWORDS = [
    "contamination", "sick", "diarrhea", "smell", "dirty water",
    "fever", "outbreak", "vomiting", "infection", "sanitation risk"
]

# Initial Seeded Feedback Data (includes 2+ hazard keywords for camp-001 & camp-004)
INITIAL_FEEDBACK_DATA = [
    {
        "feedback_id": "fb-001",
        "camp_id": "camp-001",
        "camp_name": "Silchar Stadium Relief Shelter",
        "category": "water",
        "rating": 2,
        "feedback_text": "Water supply has a strong chemical smell and dirty water is leaking near drinking taps.",
        "timestamp": "2026-08-03T10:00:00Z"
    },
    {
        "feedback_id": "fb-002",
        "camp_id": "camp-001",
        "camp_name": "Silchar Stadium Relief Shelter",
        "category": "sanitation",
        "rating": 1,
        "feedback_text": "Severe sanitation risk here. Water contamination and multiple people getting sick with fever and diarrhea.",
        "timestamp": "2026-08-03T10:30:00Z"
    },
    {
        "feedback_id": "fb-003",
        "camp_id": "camp-002",
        "camp_name": "Barpeta High School Relief Center",
        "category": "food",
        "rating": 5,
        "feedback_text": "Food distribution is very well organized. Warm meals delivered on time for infants and mothers.",
        "timestamp": "2026-08-03T09:15:00Z"
    },
    {
        "feedback_id": "fb-004",
        "camp_id": "camp-004",
        "camp_name": "Dibrugarh Flood Relief Hub",
        "category": "medical",
        "rating": 1,
        "feedback_text": "Outbreak of vomiting and diarrhea among children. Water contamination suspected.",
        "timestamp": "2026-08-03T11:20:00Z"
    },
    {
        "feedback_id": "fb-005",
        "camp_id": "camp-004",
        "camp_name": "Dibrugarh Flood Relief Hub",
        "category": "sanitation",
        "rating": 2,
        "feedback_text": "Dirty water near toilets and bad smell everywhere. Medical team needed immediately for sick residents.",
        "timestamp": "2026-08-03T11:45:00Z"
    }
]

FEEDBACK_STORE: List[Dict[str, Any]] = list(INITIAL_FEEDBACK_DATA)

# Seed overdue state on case c1a2b3c4-0003-4000-8000-000000000003 for initial demo
def _seed_overdue_cases():
    now = datetime.now(timezone.utc)
    # Case 3 (Dibrugarh unconscious) set to dispatched 5 hours ago
    c3 = queue_store.get_case("c1a2b3c4-0003-4000-8000-000000000003")
    if c3:
        c3["dispatch_status"] = "dispatched"
        c3["dispatched_at"] = (now - timedelta(hours=5, minutes=15)).isoformat()
        c3["last_checkin_at"] = None

_seed_overdue_cases()


# ── Part 1: Overdue Alert Helper ───────────────────────────────────────────────
def check_case_overdue(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Checks if a case is overdue based on dispatched_at timestamp.
    Tier 1 threshold: 3 hours
    Tier 2 / Tier 3 threshold: 6 hours
    If overdue, auto-escalates tier to Tier 1 and urgency to 5.
    """
    dispatched_at_str = case.get("dispatched_at")
    dispatch_status = case.get("dispatch_status", "queued")

    if dispatch_status != "dispatched" or not dispatched_at_str:
        case["is_overdue"] = False
        case["overdue_hours"] = 0
        return case

    try:
        # Parse ISO string
        if dispatched_at_str.endswith("Z"):
            dispatched_at_str = dispatched_at_str[:-1] + "+00:00"
        disp_dt = datetime.fromisoformat(dispatched_at_str)
        if disp_dt.tzinfo is None:
            disp_dt = disp_dt.replace(tzinfo=timezone.utc)
    except Exception:
        case["is_overdue"] = False
        return case

    now_dt = datetime.now(timezone.utc)
    elapsed_seconds = (now_dt - disp_dt).total_seconds()
    elapsed_hours = round(elapsed_seconds / 3600.0, 1)

    tier = case.get("tier", "Tier 3")
    threshold_hours = 3.0 if tier == "Tier 1" else 6.0

    if elapsed_hours >= threshold_hours:
        case["is_overdue"] = True
        case["overdue_hours"] = elapsed_hours
        case["threshold_hours"] = threshold_hours
        # Auto-escalate to Tier 1 Critical if not already
        if case.get("tier") != "Tier 1":
            case["tier"] = "Tier 1"
            case["urgency_score"] = 5
            case["auto_escalated"] = True
    else:
        case["is_overdue"] = False
        case["overdue_hours"] = elapsed_hours

    return case


# ── PART 1 ENDPOINTS: Overdue Alert System ─────────────────────────────────────

@router.get("/overdue")
def get_overdue_cases():
    """Returns all currently overdue cases, auto-escalated to Tier 1 if necessary."""
    all_cases = queue_store.get_prioritized_queue()
    overdue_list = []

    for c in all_cases:
        evaluated = check_case_overdue(c)
        if evaluated.get("is_overdue") is True:
            overdue_list.append(evaluated)

    return {
        "status": "success",
        "total_overdue": len(overdue_list),
        "overdue_cases": overdue_list
    }


@router.post("/dispatch/{case_id}")
def dispatch_case(case_id: str):
    """Mark a case as dispatched with current timestamp."""
    c = queue_store.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    c["dispatch_status"] = "dispatched"
    c["dispatched_at"] = datetime.now(timezone.utc).isoformat()
    c["last_checkin_at"] = datetime.now(timezone.utc).isoformat()
    c["is_overdue"] = False

    return {
        "status": "success",
        "message": f"Case {case_id} dispatched.",
        "case": c
    }


@router.post("/simulate-overdue/{case_id}")
def simulate_overdue_case(case_id: str, hours_ago: float = Query(5.0, description="Hours ago dispatch occurred")):
    """Demo Endpoint: Backdates dispatched_at timestamp to trigger overdue alert immediately."""
    c = queue_store.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    now = datetime.now(timezone.utc)
    simulated_dispatch = now - timedelta(hours=hours_ago)

    c["dispatch_status"] = "dispatched"
    c["dispatched_at"] = simulated_dispatch.isoformat()
    c["last_checkin_at"] = None

    # Run check immediately
    evaluated = check_case_overdue(c)

    return {
        "status": "success",
        "message": f"Simulated overdue for case {case_id} ({hours_ago} hours ago).",
        "case": evaluated
    }


# ── PART 2 ENDPOINTS: Relief Quality Feedback ──────────────────────────────────

@router.post("/feedback")
def submit_feedback(
    camp_id: str = Body(..., embed=True),
    feedback_text: str = Body(..., embed=True),
    category: str = Body("general", embed=True),
    rating: int = Body(3, embed=True)
):
    """Submits crowd-sourced relief camp feedback."""
    camp = next((c for c in MOCK_CAMPS if c["camp_id"] == camp_id), None)
    camp_name = camp["name"] if camp else camp_id

    entry = {
        "feedback_id": f"fb-{uuid.uuid4().hex[:6]}",
        "camp_id": camp_id,
        "camp_name": camp_name,
        "category": category,
        "rating": rating,
        "feedback_text": feedback_text,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    FEEDBACK_STORE.insert(0, entry)

    return {
        "status": "success",
        "message": "Feedback recorded successfully.",
        "feedback": entry
    }


@router.get("/feedback")
def get_all_feedback(camp_id: Optional[str] = Query(None, description="Filter feedback by camp_id")):
    """Returns all crowd-sourced relief quality feedback."""
    if camp_id:
        filtered = [f for f in FEEDBACK_STORE if f["camp_id"] == camp_id]
        return {"status": "success", "total": len(filtered), "feedback": filtered}

    return {"status": "success", "total": len(FEEDBACK_STORE), "feedback": FEEDBACK_STORE}


# ── PART 3 ENDPOINTS: Public Health Hazard Detection ────────────────────────────

def detect_camp_hazards() -> List[Dict[str, Any]]:
    """
    Scans recent feedback per camp for public health hazard keywords.
    If 2+ submissions match hazard keywords, flags camp as 'Hazard Alert'.
    """
    camp_feedback_map: Dict[str, List[Dict[str, Any]]] = {}
    for fb in FEEDBACK_STORE:
        cid = fb["camp_id"]
        camp_feedback_map.setdefault(cid, []).append(fb)

    alerts = []
    for camp_id, fbs in camp_feedback_map.items():
        matched_entries = []
        matched_keywords_set = set()

        for fb in fbs:
            text_lower = fb["feedback_text"].lower()
            found = [kw for kw in HAZARD_KEYWORDS if kw in text_lower]
            if found:
                matched_entries.append(fb)
                matched_keywords_set.update(found)

        # Trigger alert if 2+ submissions contain hazard keywords
        if len(matched_entries) >= 2:
            camp_obj = next((c for c in MOCK_CAMPS if c["camp_id"] == camp_id), None)
            camp_name = camp_obj["name"] if camp_obj else camp_id

            alerts.append({
                "camp_id": camp_id,
                "camp_name": camp_name,
                "hazard_status": "Hazard Alert",
                "hazard_score": len(matched_entries),
                "matched_keywords": sorted(list(matched_keywords_set)),
                "reason": f"{len(matched_entries)} recent reports flagged health hazard keywords: {', '.join(matched_keywords_set)}",
                "matched_feedbacks": matched_entries
            })

    return alerts


@router.get("/hazards")
def get_hazard_alerts():
    """Returns all camps currently flagged with Public Health Hazard Alerts."""
    alerts = detect_camp_hazards()
    return {
        "status": "success",
        "total_hazards": len(alerts),
        "hazard_alerts": alerts
    }


@router.get("/summary")
def get_audit_summary():
    """Combined Audit Dashboard Summary endpoint."""
    all_cases = queue_store.get_prioritized_queue()
    overdue_cases = [check_case_overdue(c) for c in all_cases if check_case_overdue(c).get("is_overdue")]
    hazard_alerts = detect_camp_hazards()

    return {
        "status": "success",
        "total_overdue_cases": len(overdue_cases),
        "overdue_cases": overdue_cases,
        "total_feedback_count": len(FEEDBACK_STORE),
        "recent_feedback": FEEDBACK_STORE[:10],
        "total_hazard_alerts": len(hazard_alerts),
        "hazard_alerts": hazard_alerts
    }
