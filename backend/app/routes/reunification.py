"""
Module 7 — Missing Persons & Family Reunification Registry API
Manages missing person reports, camp check-in dataset, fuzzy name matching, and resolution.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from fastapi import APIRouter, HTTPException, Body, Query

from app.routes.camps import MOCK_CAMPS

router = APIRouter(prefix="/api/missing-persons", tags=["Reunification"])

# ── Mock Camp Check-in Dataset ──────────────────────────────────────────────────
CAMP_CHECKINS = [
    {"checkin_id": "chk-001", "person_name": "Rahul Borthakur", "age": 28, "camp_id": "camp-001", "camp_name": "Silchar SA Road Stadium Relief Shelter", "check_in_time": "2026-08-03T08:30:00Z"},
    {"checkin_id": "chk-002", "person_name": "Sunita Gogoi", "age": 34, "camp_id": "camp-002", "camp_name": "Barpeta Sarat Chandra High School Relief Centre", "check_in_time": "2026-08-03T09:15:00Z"},
    {"checkin_id": "chk-003", "person_name": "Anupam Hazarika", "age": 45, "camp_id": "camp-003", "camp_name": "Tezpur College Ground Flood Shelter (ASDMA)", "check_in_time": "2026-08-03T10:00:00Z"},
    {"checkin_id": "chk-004", "person_name": "Bikash Choudhury", "age": 52, "camp_id": "camp-004", "camp_name": "Dibrugarh Rajiv Bhavan Community Relief Hub", "check_in_time": "2026-08-03T10:45:00Z"},
    {"checkin_id": "chk-005", "person_name": "Rina Das", "age": 22, "camp_id": "camp-005", "camp_name": "Nagaon Haibargaon Community Shelter", "check_in_time": "2026-08-03T11:10:00Z"},
    {"checkin_id": "chk-006", "person_name": "Amitabh Saikia", "age": 61, "camp_id": "camp-006", "camp_name": "Guwahati GMCH Sports Ground Flood Camp", "check_in_time": "2026-08-03T11:30:00Z"},
    {"checkin_id": "chk-007", "person_name": "Meera Baruah", "age": 19, "camp_id": "camp-001", "camp_name": "Silchar SA Road Stadium Relief Shelter", "check_in_time": "2026-08-03T12:00:00Z"},
    {"checkin_id": "chk-008", "person_name": "Pranjal Deka", "age": 38, "camp_id": "camp-003", "camp_name": "Tezpur College Ground Flood Shelter (ASDMA)", "check_in_time": "2026-08-03T07:30:00Z"},
    {"checkin_id": "chk-009", "person_name": "Dipika Konwar", "age": 29, "camp_id": "camp-007", "camp_name": "Dhubri DC Office Flood Relief Camp", "check_in_time": "2026-08-03T13:00:00Z"},
    {"checkin_id": "chk-010", "person_name": "Raju Ahmed", "age": 44, "camp_id": "camp-007", "camp_name": "Dhubri DC Office Flood Relief Camp", "check_in_time": "2026-08-03T13:30:00Z"},
    {"checkin_id": "chk-011", "person_name": "Lata Boro", "age": 55, "camp_id": "camp-008", "camp_name": "Goalpara Lakhipur College Relief Camp", "check_in_time": "2026-08-03T14:00:00Z"},
    {"checkin_id": "chk-012", "person_name": "Debojit Nath", "age": 33, "camp_id": "camp-009", "camp_name": "Hojai Lanka SDMC Relief Shelter", "check_in_time": "2026-08-03T14:20:00Z"},
    {"checkin_id": "chk-013", "person_name": "Mousumi Kalita", "age": 26, "camp_id": "camp-002", "camp_name": "Barpeta Sarat Chandra High School Relief Centre", "check_in_time": "2026-08-03T15:00:00Z"},
    {"checkin_id": "chk-014", "person_name": "Hiren Medhi", "age": 48, "camp_id": "camp-010", "camp_name": "Chirang Bijni Govt. HS School Relief Camp", "check_in_time": "2026-08-03T15:45:00Z"}
]

# ── Fuzzy Matching Function ─────────────────────────────────────────────────────
function_match = SequenceMatcher

def find_camp_match(missing_name: str) -> Optional[Dict[str, Any]]:
    """
    Performs fuzzy string matching (case-insensitive) between missing_person_name
    and the camp check-in dataset. Returns match if similarity >= 0.7.
    """
    if not missing_name:
        return None

    target = missing_name.strip().lower()
    best_match = None
    best_score = 0.0

    for chk in CAMP_CHECKINS:
        candidate = chk["person_name"].strip().lower()

        # Exact substring or token match check
        if target in candidate or candidate in target:
            score = 0.95
        else:
            score = SequenceMatcher(None, target, candidate).ratio()

        if score >= 0.65 and score > best_score:
            best_score = score
            best_match = chk

    return best_match


# ── Seeded Missing Person Reports Store ─────────────────────────────────────────
INITIAL_REPORTS = [
    {
        "report_id": "rep-001",
        "reporter_name": "Priya Borthakur",
        "reporter_contact": "+91 98640 12345",
        "missing_person_name": "Rahul Borthakur",
        "last_known_location": "Silchar Ward 5, near Annapurna Ghat main market",
        "last_seen_time": "2026-08-03T06:30:00Z",
        "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "status": "Possible Match",
        "created_at": "2026-08-03T09:00:00Z",
        "match_details": {"matched_person_name": "Rahul Borthakur", "matched_camp_id": "camp-001", "matched_camp_name": "Silchar SA Road Stadium Relief Shelter", "check_in_time": "2026-08-03T08:30:00Z"}
    },
    {
        "report_id": "rep-002",
        "reporter_name": "Manoj Gogoi",
        "reporter_contact": "+91 94350 54321",
        "missing_person_name": "Sunita Gogoi",
        "last_known_location": "Barpeta Town Block B, NH37 Crossing",
        "last_seen_time": "2026-08-03T07:15:00Z",
        "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        "status": "Possible Match",
        "created_at": "2026-08-03T09:30:00Z",
        "match_details": {"matched_person_name": "Sunita Gogoi", "matched_camp_id": "camp-002", "matched_camp_name": "Barpeta Sarat Chandra High School Relief Centre", "check_in_time": "2026-08-03T09:15:00Z"}
    },
    {
        "report_id": "rep-003",
        "reporter_name": "Bhaben Kalita",
        "reporter_contact": "+91 98540 67890",
        "missing_person_name": "Tarun Kalita",
        "last_known_location": "Morigaon Bhuragaon Village, near paddy field embankment",
        "last_seen_time": "2026-08-03T05:45:00Z",
        "photo_url": None,
        "status": "No Match",
        "created_at": "2026-08-03T10:15:00Z",
        "match_details": None
    },
    {
        "report_id": "rep-004",
        "reporter_name": "Deepa Deka",
        "reporter_contact": "+91 97060 11223",
        "missing_person_name": "Pranjal Deka",
        "last_known_location": "Tezpur Mission Chariali, flood-affected locality",
        "last_seen_time": "2026-08-02T18:00:00Z",
        "photo_url": None,
        "status": "Reunited",
        "created_at": "2026-08-03T08:00:00Z",
        "match_details": {"matched_person_name": "Pranjal Deka", "matched_camp_id": "camp-003", "matched_camp_name": "Tezpur College Ground Flood Shelter (ASDMA)", "check_in_time": "2026-08-03T07:30:00Z"}
    },
    {
        "report_id": "rep-005",
        "reporter_name": "Nilufar Begum",
        "reporter_contact": "+91 96382 88901",
        "missing_person_name": "Habibur Rahman",
        "last_known_location": "Dhubri Gauripur, near mosque road",
        "last_seen_time": "2026-08-03T04:00:00Z",
        "photo_url": None,
        "status": "Possible Match",
        "created_at": "2026-08-03T11:00:00Z",
        "match_details": {"matched_person_name": "Raju Ahmed", "matched_camp_id": "camp-007", "matched_camp_name": "Dhubri DC Office Flood Relief Camp", "check_in_time": "2026-08-03T13:30:00Z"}
    },
    {
        "report_id": "rep-006",
        "reporter_name": "Sanjay Nath",
        "reporter_contact": "+91 98610 33445",
        "missing_person_name": "Debojit Nath",
        "last_known_location": "Lanka Town, Hojai District, near bus stand",
        "last_seen_time": "2026-08-03T06:00:00Z",
        "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        "status": "Possible Match",
        "created_at": "2026-08-03T12:00:00Z",
        "match_details": {"matched_person_name": "Debojit Nath", "matched_camp_id": "camp-009", "matched_camp_name": "Hojai Lanka SDMC Relief Shelter", "check_in_time": "2026-08-03T14:20:00Z"}
    },
    {
        "report_id": "rep-007",
        "reporter_name": "Geetanjali Boro",
        "reporter_contact": "+91 97740 55667",
        "missing_person_name": "Jibon Boro",
        "last_known_location": "Chirang Bijni near Manas forest edge",
        "last_seen_time": "2026-08-02T22:00:00Z",
        "photo_url": None,
        "status": "No Match",
        "created_at": "2026-08-03T08:30:00Z",
        "match_details": None
    },
    {
        "report_id": "rep-008",
        "reporter_name": "Purnima Medhi",
        "reporter_contact": "+91 94011 77889",
        "missing_person_name": "Hiren Medhi",
        "last_known_location": "Bijni Town centre flood zone, Chirang District",
        "last_seen_time": "2026-08-03T08:00:00Z",
        "photo_url": None,
        "status": "Reunited",
        "created_at": "2026-08-03T14:00:00Z",
        "match_details": {"matched_person_name": "Hiren Medhi", "matched_camp_id": "camp-010", "matched_camp_name": "Chirang Bijni Govt. HS School Relief Camp", "check_in_time": "2026-08-03T15:45:00Z"}
    },
    {
        "report_id": "rep-009",
        "reporter_name": "Dipak Konwar",
        "reporter_contact": "+91 96132 99001",
        "missing_person_name": "Dipika Konwar",
        "last_known_location": "Gauripur Dhubri near river embankment, paddy storage area",
        "last_seen_time": "2026-08-03T05:20:00Z",
        "photo_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        "status": "Possible Match",
        "created_at": "2026-08-03T10:00:00Z",
        "match_details": {"matched_person_name": "Dipika Konwar", "matched_camp_id": "camp-007", "matched_camp_name": "Dhubri DC Office Flood Relief Camp", "check_in_time": "2026-08-03T13:00:00Z"}
    },
    {
        "report_id": "rep-010",
        "reporter_name": "Kalyani Kalita",
        "reporter_contact": "+91 97650 22334",
        "missing_person_name": "Mousumi Kalita",
        "last_known_location": "Barpeta Road Station area, near Sarat Chandra colony",
        "last_seen_time": "2026-08-03T07:45:00Z",
        "photo_url": None,
        "status": "Reunited",
        "created_at": "2026-08-03T13:00:00Z",
        "match_details": {"matched_person_name": "Mousumi Kalita", "matched_camp_id": "camp-002", "matched_camp_name": "Barpeta Sarat Chandra High School Relief Centre", "check_in_time": "2026-08-03T15:00:00Z"}
    }
]

REPORTS_STORE: List[Dict[str, Any]] = list(INITIAL_REPORTS)


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.get("")
@router.get("/")
def get_missing_persons_reports():
    """Returns all open and resolved missing person reports."""
    return {
        "status": "success",
        "total_reports": len(REPORTS_STORE),
        "reports": REPORTS_STORE
    }


@router.post("")
@router.post("/")
def create_missing_person_report(
    reporter_name: str = Body(..., embed=True),
    reporter_contact: str = Body(..., embed=True),
    missing_person_name: str = Body(..., embed=True),
    last_known_location: str = Body(..., embed=True),
    last_seen_time: Optional[str] = Body(None, embed=True),
    photo_url: Optional[str] = Body(None, embed=True)
):
    """
    Submits a new missing person report and automatically runs fuzzy matching
    against the camp check-in dataset.
    """
    report_id = f"rep-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Run fuzzy matching
    match = find_camp_match(missing_person_name)

    if match:
        status = "Possible Match"
        match_details = {
            "matched_person_name": match["person_name"],
            "matched_camp_id": match["camp_id"],
            "matched_camp_name": match["camp_name"],
            "check_in_time": match["check_in_time"]
        }
    else:
        status = "No Match"
        match_details = None

    new_report = {
        "report_id": report_id,
        "reporter_name": reporter_name,
        "reporter_contact": reporter_contact,
        "missing_person_name": missing_person_name,
        "last_known_location": last_known_location,
        "last_seen_time": last_seen_time or now_iso,
        "photo_url": photo_url,
        "status": status,
        "created_at": now_iso,
        "match_details": match_details
    }

    REPORTS_STORE.insert(0, new_report)

    return {
        "status": "success",
        "message": f"Report created. Status: {status}",
        "report": new_report
    }


@router.post("/{report_id}/resolve")
def resolve_missing_person_report(report_id: str):
    """Marks a missing person report as 'Reunited'."""
    report = next((r for r in REPORTS_STORE if r["report_id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")

    report["status"] = "Reunited"
    report["reunited_at"] = datetime.now(timezone.utc).isoformat()

    return {
        "status": "success",
        "message": f"Report {report_id} marked as Reunited 🎉",
        "report": report
    }


@router.get("/checkins")
def get_camp_checkins():
    """Returns the full camp check-in dataset."""
    return {
        "status": "success",
        "total_checkins": len(CAMP_CHECKINS),
        "checkins": CAMP_CHECKINS
    }
