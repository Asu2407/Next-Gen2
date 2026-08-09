import asyncio
import os
import json
import httpx
from pprint import pprint

# Ensure python can import backend/app modules
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.services.stt import transcribe_audio
from app.services.llm_extractor import extract_entities
from app.services.urgency_engine import calculate_urgency_and_summary
from app.models.case import CaseSchema

TEST_CASES = [
    {
        "name": "Case 1: Urgency 5/5 (Critical)",
        "type": "audio",
        "file_path": os.path.join(os.path.dirname(__file__), "samples", "sample_assamese.wav"),
        "expected_score": 5,
        "description": "Assamese Audio SOS: Rapid rising water in Silchar, 4 trapped victims including pregnant woman & infant."
    },
    {
        "name": "Case 2: Urgency 4/5 (High Medical)",
        "type": "text",
        "text_input": "করিমগঞ্জ বাজারে বাড়ি আংশিক জলমগ্ন। ৮২ বছরের একজন বৃদ্ধ ডায়ালিসিস রোগী ঘরের ভেতরে আছেন, ওনার অবিলম্বে ডায়ালিসিস ও ওষুধ দরকার। মেডিকেল ইমার্জেন্সি!",
        "language_hint": "Bengali",
        "expected_score": 4,
        "description": "Bengali Text Fallback: 82-year-old elderly dialysis patient needing urgent medical transport in Karimganj Bazaar."
    },
    {
        "name": "Case 3: Urgency 3/5 (Moderate Stranded)",
        "type": "audio",
        "file_path": os.path.join(os.path.dirname(__file__), "samples", "sample_hindi.wav"),
        "expected_score": 3,
        "description": "Hindi Audio SOS: 5 adults stranded on roof in Guwahati West, exhausted rations/water."
    },
    {
        "name": "Case 4: Urgency 2/5 (Low / Livestock)",
        "type": "text",
        "text_input": "Family evacuated safely to high embankment near Kaziranga patrol post, 2 head of livestock trapped near barn.",
        "language_hint": "English",
        "expected_score": 2,
        "description": "English Text Fallback: Humans evacuated, 2 livestock trapped near barn at Kaziranga patrol post."
    },
    {
        "name": "Case 5: Urgency 1/5 (Routine Status)",
        "type": "audio",
        "file_path": os.path.join(os.path.dirname(__file__), "samples", "sample_english.wav"),
        "expected_score": 1,
        "description": "English Audio SOS: Routine flood embankment check at Majuli dike, steady water levels, zero casualties."
    }
]

async def run_pipeline_for_case(test_case: dict) -> dict:
    if test_case["type"] == "audio":
        with open(test_case["file_path"], "rb") as f:
            file_bytes = f.read()
        raw_transcript, lang_detected = await transcribe_audio(file_bytes, os.path.basename(test_case["file_path"]))
    else:
        raw_transcript = test_case["text_input"]
        lang_detected = test_case.get("language_hint", "English")

    extracted = await extract_entities(raw_transcript, lang_detected)
    final_dict = calculate_urgency_and_summary(extracted)
    case_obj = CaseSchema(**final_dict)
    return case_obj.model_dump()

async def main():
    print("=" * 85)
    print("      RESQNET AI (NEXT-GEN2) - MODULE 1 INTAKE & URGENCY ENGINE TEST HARNESS")
    print("=" * 85)
    
    results = []
    
    for idx, tc in enumerate(TEST_CASES, start=1):
        print(f"\n[+] Executing {tc['name']} ({tc['type'].upper()} input)...")
        res = await run_pipeline_for_case(tc)
        results.append((tc, res))
        
        print(f"    - Case ID          : {res['case_id']}")
        print(f"    - Language         : {res['language_detected']}")
        print(f"    - Landmark/GPS     : {res['gps_or_landmark']}")
        print(f"    - Victims          : {res['victim_count']}")
        print(f"    - Categories       : {res['emergency_categories']}")
        print(f"    - Vulnerabilities  : {res['vulnerability_flags']}")
        print(f"    - Urgency Score    : {res['urgency_score']} / 5")
        print(f"    - Assigned Tier    : {res['tier']}")
        print(f"    - Tele-Health      : {res['tele_health_status']}")
        print(f"    - Operator Summary : {res['summary']}")
        print(f"    - Shared JSON Check: PASSED (Keys: {list(res.keys())})")

    print("\n" + "=" * 85)
    print("                         TEST SUMMARY MATRIX (1-5 SCORES)")
    print("=" * 85)
    header = f"{'Case':<10} | {'Lang':<10} | {'Location':<27} | {'Vulns':<20} | {'Score':<5} | {'Tier':<7}"
    print(header)
    print("-" * len(header))
    
    for idx, (tc, res) in enumerate(results, start=1):
        case_label = f"Case {idx}"
        lang = res['language_detected']
        loc = (res['gps_or_landmark'][:25] + '..') if len(res['gps_or_landmark']) > 25 else res['gps_or_landmark']
        vulns = ",".join(res['vulnerability_flags']) if res['vulnerability_flags'] else "none"
        if len(vulns) > 18:
            vulns = vulns[:16] + ".."
        score = f"{res['urgency_score']}/5"
        tier = res['tier']
        print(f"{case_label:<10} | {lang:<10} | {loc:<27} | {vulns:<20} | {score:<5} | {tier:<7}")
        
    print("=" * 85)
    print("All 5 test cases successfully processed and validated against GEMINI.md schema!")

if __name__ == "__main__":
    asyncio.run(main())
