"""
Module 11 — Offline-First Field Sync API
Stores field observations, rescue completions, and camp check-ins logged offline by field workers.
Provides idempotent handling for client-generated record IDs.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Body

router = APIRouter(prefix="/api/field-sync", tags=["Offline Field Sync"])

# In-memory store for synced field records
FIELD_SYNC_STORE: List[Dict[str, Any]] = []


@router.post("/submit")
def submit_field_record(
    client_id: str = Body(..., embed=True),
    record_type: str = Body(..., embed=True),  # "rescue_completion" | "camp_checkin" | "damage_observation"
    payload: Dict[str, Any] = Body(..., embed=True),
    timestamp: Optional[str] = Body(None, embed=True)
):
    """
    Accepts field worker record submissions.
    Supports idempotent processing: if client_id already exists, return success without duplicating.
    """
    # Check for existing record (idempotency)
    existing = next((r for r in FIELD_SYNC_STORE if r["client_id"] == client_id), None)
    if existing:
        return {
            "status": "success",
            "message": f"Record {client_id} already synced (idempotent response).",
            "client_id": client_id,
            "record": existing
        }

    now_iso = timestamp or datetime.now(timezone.utc).isoformat()

    record = {
        "client_id": client_id,
        "record_type": record_type,
        "payload": payload,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "client_timestamp": now_iso
    }

    FIELD_SYNC_STORE.insert(0, record)

    return {
        "status": "success",
        "message": f"Field record ({record_type}) synced successfully.",
        "client_id": client_id,
        "record": record
    }


@router.get("/records")
def get_all_synced_records():
    """Returns all field records currently synced to the backend server."""
    return {
        "status": "success",
        "total_records": len(FIELD_SYNC_STORE),
        "records": FIELD_SYNC_STORE
    }
