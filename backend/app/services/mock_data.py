"""
Mock case dataset for ResqNet AI Triage / Priority Queue Service.
Contains 9 mock cases spanning Tier 1, Tier 2, and Tier 3 with realistic Assam flood data.
"""

INITIAL_MOCK_CASES = [
    {
        "case_id": "c1a2b3c4-0001-4000-8000-000000000001",
        "raw_transcript": "Water is entering our house in Silchar Ward 5, my pregnant sister is in labor and needs immediate hospital transport!",
        "language_detected": "English",
        "gps_or_landmark": "Silchar Ward 5, Cachar District",
        "victim_count": 3,
        "emergency_categories": ["rising_water", "medical", "labor"],
        "vulnerability_flags": ["pregnant"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): Pregnant woman in active labor in fast-rising floodwater near Silchar Ward 5; immediate boat dispatch & medical bridge required.",
        "timestamp": "2026-08-03T07:15:00Z"
    },
    {
        "case_id": "c1a2b3c4-0002-4000-8000-000000000002",
        "raw_transcript": "আমাদের ঘরের ছাদে ২ বছরের শিশু তীব্র জ্বরে ভুগছে, চারদিকে জল জমে গেছে। সাহায্য পাঠান!",
        "language_detected": "Bengali",
        "gps_or_landmark": "Barpeta Town, Block B",
        "victim_count": 4,
        "emergency_categories": ["rising_water", "medical", "stranded"],
        "vulnerability_flags": ["infant"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): 4 family members stranded on roof with 2yo infant suffering high fever near Barpeta Town; emergency medical rescue boat dispatched.",
        "timestamp": "2026-08-03T07:30:00Z"
    },
    {
        "case_id": "c1a2b3c4-0003-4000-8000-000000000003",
        "raw_transcript": "Flood water breached dike in Dibrugarh. An unconscious elderly man collapsed due to severe head injury.",
        "language_detected": "English",
        "gps_or_landmark": "Dibrugarh Embankment, Sector 3",
        "victim_count": 2,
        "emergency_categories": ["medical", "rising_water"],
        "vulnerability_flags": ["unconscious", "acute_medical", "elderly"],
        "urgency_score": 4,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "HIGH URGENCY (4/5): Unconscious acute medical emergency reported at Dibrugarh Embankment; tele-health triage & medical team alerted.",
        "timestamp": "2026-08-03T06:45:00Z"
    },
    {
        "case_id": "c1a2b3c4-0004-4000-8000-000000000004",
        "raw_transcript": "করিমগঞ্জ বাজারে বাড়ি আংশিক জলমগ্ন। ৮২ বছরের বৃদ্ধ ডায়ালিসিস রোগী আছেন, ওনার ডায়ালিসিস দরকার।",
        "language_detected": "Bengali",
        "gps_or_landmark": "Karimganj Main Bazaar",
        "victim_count": 2,
        "emergency_categories": ["medical", "stranded"],
        "vulnerability_flags": ["dialysis", "elderly"],
        "urgency_score": 4,
        "tier": "Tier 2",
        "tele_health_status": "connecting",
        "summary": "HIGH URGENCY (4/5): 82-year-old elderly dialysis patient in partially submerged residence at Karimganj Main Bazaar requiring medical transport.",
        "timestamp": "2026-08-03T07:05:00Z"
    },
    {
        "case_id": "c1a2b3c4-0005-4000-8000-000000000005",
        "raw_transcript": "Tezpur flooded. Wheelchair-bound resident unable to evacuate single-story house.",
        "language_detected": "English",
        "gps_or_landmark": "Tezpur Mission Chariali",
        "victim_count": 1,
        "emergency_categories": ["stranded", "rising_water"],
        "vulnerability_flags": ["disabled"],
        "urgency_score": 4,
        "tier": "Tier 2",
        "tele_health_status": "not_needed",
        "summary": "HIGH URGENCY (4/5): Disabled resident trapped in single-story home at Tezpur Mission Chariali; rescue team requested.",
        "timestamp": "2026-08-03T07:40:00Z"
    },
    {
        "case_id": "c1a2b3c4-0006-4000-8000-000000000006",
        "raw_transcript": "Morigaon village cut off. Elderly couple stuck on wooden loft with food running out.",
        "language_detected": "English",
        "gps_or_landmark": "Morigaon Bhuragaon Village",
        "victim_count": 2,
        "emergency_categories": ["stranded"],
        "vulnerability_flags": ["elderly"],
        "urgency_score": 3,
        "tier": "Tier 2",
        "tele_health_status": "not_needed",
        "summary": "MODERATE URGENCY (3/5): Elderly couple stranded on wooden loft in Morigaon; relief food & transport queued.",
        "timestamp": "2026-08-03T06:30:00Z"
    },
    {
        "case_id": "c1a2b3c4-0007-4000-8000-000000000007",
        "raw_transcript": "Villager slipped while securing boats near Nagaon and broke leg.",
        "language_detected": "English",
        "gps_or_landmark": "Nagaon Raha Ghat",
        "victim_count": 1,
        "emergency_categories": ["medical"],
        "vulnerability_flags": ["injured"],
        "urgency_score": 3,
        "tier": "Tier 2",
        "tele_health_status": "connecting",
        "summary": "MODERATE URGENCY (3/5): Injured resident with fractured leg near Nagaon Raha Ghat requiring first aid & evacuation.",
        "timestamp": "2026-08-03T08:00:00Z"
    },
    {
        "case_id": "c1a2b3c4-0008-4000-8000-000000000008",
        "raw_transcript": "5 adults stranded on commercial building rooftop in Guwahati West, exhausted rations.",
        "language_detected": "English",
        "gps_or_landmark": "Guwahati West Bharalumukh",
        "victim_count": 5,
        "emergency_categories": ["stranded"],
        "vulnerability_flags": [],
        "urgency_score": 3,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "MODERATE URGENCY (3/5): 5 able-bodied adults stranded on commercial rooftop near Guwahati West; awaiting standard boat pickup.",
        "timestamp": "2026-08-03T06:00:00Z"
    },
    {
        "case_id": "c1a2b3c4-0009-4000-8000-000000000009",
        "raw_transcript": "Kaziranga family safe at embankment, 2 cattle stranded in lower barn.",
        "language_detected": "English",
        "gps_or_landmark": "Kaziranga Patrol Post 4",
        "victim_count": 4,
        "emergency_categories": ["rising_water"],
        "vulnerability_flags": [],
        "urgency_score": 2,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "LOW URGENCY (2/5): Able-bodied family safe at embankment; livestock trapped near barn.",
        "timestamp": "2026-08-03T08:10:00Z"
    }
]
