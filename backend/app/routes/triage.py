from fastapi import APIRouter, HTTPException, Body, Path, Query
from typing import Dict, Any, List, Optional
import logging

from app.models.case import CaseSchema
from app.services.triage_service import queue_store, assign_dvs_tier, sort_triage_queue

logger = logging.getLogger("triage_route")

router = APIRouter(prefix="", tags=["DVS Triage & Priority Queue"])


@router.get("/queue")
@router.get("/triage/queue")
def get_priority_queue(
    tier_filter: Optional[str] = Query(None, description="Filter by tier: 'Tier 1', 'Tier 2', or 'Tier 3'")
):
    """
    Exposes the full prioritized list ready for control-room dashboard rendering.
    Cases are strictly ordered by Tier (Tier 1 > Tier 2 > Tier 3), then Urgency Score (descending),
    then Timestamp (ascending tiebreaker).
    """
    prioritized_list = queue_store.get_prioritized_queue()
    grouped_tiers = queue_store.get_grouped_queue()

    if tier_filter:
        tier_normalized = tier_filter.strip().title()
        if not tier_normalized.startswith("Tier"):
            tier_normalized = f"Tier {tier_normalized}"
        
        if tier_normalized not in grouped_tiers:
            raise HTTPException(status_code=400, detail=f"Invalid tier filter: '{tier_filter}'. Use Tier 1, Tier 2, or Tier 3.")
        
        filtered_list = grouped_tiers[tier_normalized]
        return {
            "status": "success",
            "tier_filter": tier_normalized,
            "total_cases": len(filtered_list),
            "queue": filtered_list
        }

    tier_counts = {
        "Tier 1": len(grouped_tiers["Tier 1"]),
        "Tier 2": len(grouped_tiers["Tier 2"]),
        "Tier 3": len(grouped_tiers["Tier 3"])
    }

    return {
        "status": "success",
        "total_cases": len(prioritized_list),
        "tier_counts": tier_counts,
        "tiers": grouped_tiers,
        "queue": prioritized_list
    }


@router.post("/triage/assign")
@router.post("/queue/case")
def assign_and_queue_case(case_data: Dict[str, Any] = Body(...)):
    """
    Consumes a Case JSON payload, evaluates Demographic Vulnerability Priority Matrix (DVS) tier,
    and inserts or updates the case into the prioritized queue.
    """
    try:
        # Validate or populate defaults using CaseSchema
        case_obj = CaseSchema(**case_data)
        dict_case = case_obj.model_dump()
        
        # Add to priority queue store (recomputes DVS tier)
        queued_case = queue_store.add_or_update_case(dict_case)

        return {
            "status": "success",
            "message": f"Case prioritized into {queued_case['tier']}",
            "case": queued_case
        }
    except Exception as e:
        logger.error(f"Failed to triage and queue case: {e}")
        raise HTTPException(status_code=422, detail=f"Invalid case payload: {str(e)}")


@router.post("/queue/seed")
def seed_mock_queue():
    """Reset and seed the queue with default 9 mock demo cases across all 3 tiers."""
    seeded = queue_store.reset_to_mock_data()
    return {
        "status": "success",
        "message": f"Queue successfully re-seeded with {len(seeded)} mock cases.",
        "total_cases": len(seeded)
    }


@router.patch("/queue/{case_id}")
def update_case_status(
    case_id: str = Path(..., description="UUID of the case to update"),
    updates: Dict[str, Any] = Body(...)
):
    """
    Update fields of an existing case in the queue (e.g. tele_health_status, manual tier override).
    """
    updated_case = queue_store.update_case_fields(case_id, updates)
    if not updated_case:
        raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found in queue.")
    
    return {
        "status": "success",
        "message": "Case updated successfully",
        "case": updated_case
    }
