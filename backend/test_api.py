import asyncio
import os
import sys
import json
import httpx

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.main import app

async def test_fastapi_endpoints():
    print("Testing FastAPI endpoints using AsyncClient...")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # Test GET /health
        res_health = await client.get("/health")
        assert res_health.status_code == 200
        print("GET /health ->", res_health.json())

        # Test User's Specific Example Input: "Rising water near our house, my wife is in labor, please send help immediately"
        res_user_case = await client.post("/intake", data={
            "text_input": "Rising water near our house, my wife is in labor, please send help immediately",
            "language_hint": "English"
        })
        assert res_user_case.status_code == 200, f"Failed with {res_user_case.status_code}: {res_user_case.text}"
        user_case_json = res_user_case.json()
        print("\nPOST /intake (User Case: Rising water + labor) Response:")
        print(json.dumps(user_case_json, indent=2, ensure_ascii=False))

        # Validate that emergency_categories, vulnerability_flags, urgency_score and tier match requirements!
        case_data = user_case_json["case"]
        assert "rising_water" in case_data["emergency_categories"], "Expected 'rising_water' in emergency_categories"
        assert "medical" in case_data["emergency_categories"], "Expected 'medical' in emergency_categories"
        assert "pregnant" in case_data["vulnerability_flags"], "Expected 'pregnant' in vulnerability_flags"
        assert case_data["urgency_score"] == 5, f"Expected urgency_score 5, got {case_data['urgency_score']}"
        assert case_data["tier"] == "Tier 1", f"Expected Tier 1, got {case_data['tier']}"
        assert case_data["tele_health_status"] == "connecting", f"Expected tele_health_status 'connecting', got {case_data['tele_health_status']}"

    print("\nAll User Specific Test Cases Passed Successfully!")

if __name__ == "__main__":
    asyncio.run(test_fastapi_endpoints())
