import asyncio
import os
import sys
import json
import httpx
from datetime import datetime, timezone

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.main import app
from app.services.triage_service import assign_dvs_tier, sort_triage_queue, queue_store

async def test_dvs_triage_and_queue():
    print("=" * 80)
    print("      SAHAYAK (NEXT-GEN2) - MODULE 2 DVS TRIAGE ENGINE TEST HARNESS")
    print("=" * 80)

    # 1. Test Direct Unit Tier Assigner
    print("\n[+] Step 1: Testing Unit DVS Tier Assigner Rules...")
    case_t1_pregnant = {"vulnerability_flags": ["pregnant"], "emergency_categories": ["rising_water"]}
    case_t1_infant = {"vulnerability_flags": ["infant"], "emergency_categories": ["medical"]}
    case_t1_labor = {"vulnerability_flags": [], "emergency_categories": ["labor"]}
    case_t2_dialysis = {"vulnerability_flags": ["dialysis", "elderly"], "emergency_categories": ["stranded"]}
    case_t2_disabled = {"vulnerability_flags": ["disabled"], "emergency_categories": ["rising_water"]}
    case_t2_injured = {"vulnerability_flags": ["injured"], "emergency_categories": ["medical"]}
    case_t3_adult = {"vulnerability_flags": [], "emergency_categories": ["stranded"]}

    assert assign_dvs_tier(case_t1_pregnant) == "Tier 1", "Expected Tier 1 for pregnant"
    assert assign_dvs_tier(case_t1_infant) == "Tier 1", "Expected Tier 1 for infant"
    assert assign_dvs_tier(case_t1_labor) == "Tier 1", "Expected Tier 1 for labor category"
    assert assign_dvs_tier(case_t2_dialysis) == "Tier 2", "Expected Tier 2 for dialysis"
    assert assign_dvs_tier(case_t2_disabled) == "Tier 2", "Expected Tier 2 for disabled"
    assert assign_dvs_tier(case_t2_injured) == "Tier 2", "Expected Tier 2 for injured"
    assert assign_dvs_tier(case_t3_adult) == "Tier 3", "Expected Tier 3 for able-bodied adult"
    print("    - All DVS Tier Matrix Unit Tests: PASSED")

    # 2. Test Deterministic Tiebreaker Sorting
    print("\n[+] Step 2: Testing Tiebreaker Sorting Logic (Tier -> Urgency Desc -> Timestamp Asc)...")
    sample_cases = [
        {"case_id": "c3", "tier": "Tier 2", "urgency_score": 3, "timestamp": "2026-08-03T08:00:00Z"},
        {"case_id": "c1", "tier": "Tier 1", "urgency_score": 5, "timestamp": "2026-08-03T07:30:00Z"},
        {"case_id": "c2", "tier": "Tier 1", "urgency_score": 5, "timestamp": "2026-08-03T07:15:00Z"}, # Older -> comes before c1
        {"case_id": "c4", "tier": "Tier 3", "urgency_score": 3, "timestamp": "2026-08-03T06:00:00Z"}
    ]
    sorted_res = sort_triage_queue(sample_cases)
    expected_order = ["c2", "c1", "c3", "c4"]
    actual_order = [c["case_id"] for c in sorted_res]
    assert actual_order == expected_order, f"Sorting mismatch! Expected {expected_order}, got {actual_order}"
    print("    - Tiebreaker Sorting (Tier 1 c2 older before c1, Tier 2 c3, Tier 3 c4): PASSED")

    # 3. Test API Endpoints via ASGI Client
    print("\n[+] Step 3: Testing FastAPI Endpoints (GET /queue, POST /intake integration)...")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # Re-seed queue
        seed_res = await client.post("/queue/seed")
        assert seed_res.status_code == 200
        print("    - POST /queue/seed ->", seed_res.json()["message"])

        # Fetch /queue
        res_q = await client.get("/queue")
        assert res_q.status_code == 200
        q_data = res_q.json()
        
        assert q_data["status"] == "success"
        assert q_data["total_cases"] == 10
        assert "Tier 1" in q_data["tier_counts"]
        assert q_data["tier_counts"]["Tier 1"] == 3
        assert q_data["tier_counts"]["Tier 2"] == 4
        assert q_data["tier_counts"]["Tier 3"] == 3
        print("    - GET /queue -> Total Cases: 10 (Tier 1: 3, Tier 2: 4, Tier 3: 3) PASSED")

        # Verify ordering of entire queue
        queue_list = q_data["queue"]
        tiers = [c["tier"] for c in queue_list]
        assert tiers == ["Tier 1", "Tier 1", "Tier 1", "Tier 2", "Tier 2", "Tier 2", "Tier 2", "Tier 3", "Tier 3", "Tier 3"], f"Queue tier order wrong: {tiers}"
        print("    - Queue Tier Sequence (3x Tier 1 -> 4x Tier 2 -> 3x Tier 3): PASSED")

        # Test POST /intake pushes new case into queue
        intake_res = await client.post("/intake", data={
            "text_input": "Water reaching roof in Silchar, 1yo infant crying with fever!",
            "language_hint": "English"
        })
        assert intake_res.status_code == 200
        intake_json = intake_res.json()
        assert intake_json["case"]["tier"] == "Tier 1"

        # Check queue total updated to 11
        res_q2 = await client.get("/queue")
        assert res_q2.json()["total_cases"] == 11
        print("    - New intake successfully triaged into Queue (Total now 11): PASSED")

        # Test GET /queue?tier_filter=Tier 1
        res_filtered = await client.get("/queue?tier_filter=Tier 1")
        assert res_filtered.status_code == 200
        assert res_filtered.json()["total_cases"] == 4 # 3 original + 1 newly intaked
        print("    - GET /queue?tier_filter=Tier 1 -> 4 cases returned: PASSED")

    print("\n" + "=" * 80)
    print("ALL MODULE 2 DVS TRIAGE ENGINE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_dvs_triage_and_queue())
