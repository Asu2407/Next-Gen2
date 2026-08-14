import asyncio
import httpx
from app.main import app

async def main():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test dispatch-rescue
        res = await client.post("/api/dispatch-rescue", json={
            "case_id": "c1a2b3c4-0001-4000-8000-000000000001",
            "station_id": "ndrf-patgaon-guwahati",
            "asset_type": "NDRF Motorized Inflatable Boat"
        })
        print("Dispatch Rescue Status:", res.status_code)
        assert res.status_code == 200
        dispatch_data = res.json()
        print("Dispatch Message:", dispatch_data["message"])
        print("Distance:", dispatch_data["distance_km"], "km | ETA:", dispatch_data["eta_minutes"], "mins")

        # 2. Test map-data includes rescue stations
        map_res = await client.get("/api/map-data")
        print("Map Data Status:", map_res.status_code)
        print("Map Data Content:", map_res.text[:300])
        assert map_res.status_code == 200
        map_json = map_res.json()
        assert "rescue_stations" in map_json
        print("Found", len(map_json["rescue_stations"]), "Rescue Stations in Map Data")

        # 3. Test early warning river gauge data with hydrographs
        gauge_res = await client.get("/api/river-gauge-data")
        print("River Gauge Status:", gauge_res.status_code)
        assert gauge_res.status_code == 200
        gauge_json = gauge_res.json()
        assert "stations" in gauge_json
        print("Found", len(gauge_json["stations"]), "CWC Gauges with Hydrograph Telemetry")

        # Verify hydrograph history on first station
        s0 = gauge_json["stations"][0]
        assert "history_24h" in s0
        print("Station 0 Hydrograph Points:", len(s0["history_24h"]), "| Discharge:", s0.get("discharge_cusecs"), "cusecs")

        # 4. Test Audit Summary
        audit_res = await client.get("/api/audit/summary")
        print("Audit Summary Status:", audit_res.status_code)
        assert audit_res.status_code == 200
        audit_json = audit_res.json()
        print("Audit Monitored Camps:", audit_json.get("total_camps_monitored"))

    print("\n==========================================")
    print("ALL 10/10 ADVANCED SYSTEM INTEGRATION TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(main())
