import logging
from typing import Dict, Any

logger = logging.getLogger("urgency_engine")

def calculate_urgency_and_summary(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes urgency score (1-5), situational summary, tier assignment,
    and tele-health status based on entity extraction JSON.
    """
    vulnerability_flags = extracted_data.get("vulnerability_flags", [])
    emergency_categories = extracted_data.get("emergency_categories", [])
    victim_count = extracted_data.get("victim_count", 1)
    landmark = extracted_data.get("gps_or_landmark", "Unknown Location")
    raw_transcript = extracted_data.get("raw_transcript", "")

    has_rising_water = "rising_water" in emergency_categories
    has_medical = "medical" in emergency_categories
    has_stranded = "stranded" in emergency_categories

    has_infant = "infant" in vulnerability_flags
    has_pregnant = "pregnant" in vulnerability_flags
    has_elderly = "elderly" in vulnerability_flags
    has_disabled = "disabled" in vulnerability_flags
    has_dialysis = "dialysis" in vulnerability_flags

    critical_vuln_count = sum([has_infant, has_pregnant, has_disabled, has_dialysis])

    # Check explicit routine monitoring / livestock phrases
    is_routine_report = any(k in raw_transcript.lower() for k in ["routine update", "steady", "no casualties", "monitoring update", "routine check", "clear weather"])
    is_livestock_issue = any(k in raw_transcript.lower() for k in ["livestock", "barn", "animal", "evacuated safely"])

    # 1. Score 5: Rapid Rising Water + High Vulnerability (Pregnant / Infant / Dialysis / Disabled)
    if has_rising_water and critical_vuln_count >= 1:
        score = 5
        vuln_str = ", ".join([f for f in vulnerability_flags if f in ["pregnant", "infant", "disabled", "dialysis"]])
        summary = f"CRITICAL (5/5): {victim_count} victim(s) trapped in fast-rising floodwater near {landmark} with vulnerable individuals ({vuln_str}); immediate boat rescue required."

    # 2. Score 4: Medical Emergency / Dialysis / Elderly in flooded residence
    elif has_medical or has_dialysis or (has_elderly and (has_rising_water or has_stranded)):
        score = 4
        condition = "elderly dialysis patient in flooded residence" if (has_elderly and has_dialysis) else ("medical emergency" if has_medical else "elderly resident requiring assistance")
        summary = f"HIGH URGENCY (4/5): {condition} reported at {landmark} with {victim_count} victim(s); medical evacuation & ambulance/boat requested."

    # 3. Score 3: Stranded group on roof or elevated structure
    elif has_stranded or (has_rising_water and victim_count >= 3):
        score = 3
        summary = f"MODERATE URGENCY (3/5): {victim_count} person(s) stranded on elevated roof/structure near {landmark}; rescue boat queued for dispatch."

    # 4. Score 2: Evacuated family, livestock trapped, or non-critical property danger
    elif is_livestock_issue or "evacuated" in raw_transcript.lower():
        score = 2
        summary = f"LOW URGENCY (2/5): Human occupants safe at {landmark}; livestock trapped near barn requiring secondary assistance."

    # 5. Score 1: Routine monitoring update / clear dike report
    elif is_routine_report:
        score = 1
        summary = f"ROUTINE MONITORING (1/5): Water level status report from {landmark}; steady water levels with zero human casualties."

    else:
        score = 2
        summary = f"LOW URGENCY (2/5): General inquiry at {landmark} involving {victim_count} person(s); standard assessment assigned."

    # Tier Assignment Rule (Module 2 DVS matrix alignment per GEMINI.md)
    from app.services.triage_service import assign_dvs_tier
    tier = assign_dvs_tier(extracted_data)

    # Tele-health status assignment
    if has_medical or has_pregnant or has_dialysis:
        tele_health_status = "connecting"
    else:
        tele_health_status = "not_needed"

    result = dict(extracted_data)
    result["urgency_score"] = score
    result["tier"] = tier
    result["tele_health_status"] = tele_health_status
    result["summary"] = summary

    return result
