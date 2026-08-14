"""
Mock case dataset for SAHAYAK Triage / Priority Queue Service.
Based on real 2024 Assam flood districts, CWC-reported affected villages,
and documented vulnerability profiles from ASDMA field reports.
18 cases spanning Tier 1, Tier 2, and Tier 3 across all major affected districts.
"""

INITIAL_MOCK_CASES = [
    # ── TIER 1: CRITICAL ────────────────────────────────────────────────────────

    {
        "case_id": "c1a2b3c4-0001-4000-8000-000000000001",
        "raw_transcript": "Silchar Ward 5 e amar bari dube gache. Amar bon 9 mas pregnancy te ache, active labor pain suru hoeche. Jol chhad chhuyeche. Ekta boat pathao jaldi!",
        "language_detected": "Bengali",
        "gps_or_landmark": "Silchar Ward 5, Cachar District",
        "victim_count": 3,
        "emergency_categories": ["rising_water", "medical", "labor"],
        "vulnerability_flags": ["pregnant"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): 9-month pregnant woman in active labor in fast-rising floodwater, Ward 5 Silchar — water at roof level. NDRF boat + ANM nurse bridge required immediately.",
        "timestamp": "2026-08-03T07:15:00Z"
    },
    {
        "case_id": "c1a2b3c4-0002-4000-8000-000000000002",
        "raw_transcript": "আমাদের ঘরের ছাদে ২ বছরের শিশু তীব্র জ্বরে ভুগছে এবং শ্বাসকষ্ট হচ্ছে। চারদিকে জল জমে গেছে কমপক্ষে ৬ ফুট। খাবার নেই, বিদ্যুৎ নেই। সাহায্য পাঠান!",
        "language_detected": "Bengali",
        "gps_or_landmark": "Barpeta Town Block B, near Manas River NH37",
        "victim_count": 4,
        "emergency_categories": ["rising_water", "medical", "stranded"],
        "vulnerability_flags": ["infant"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): 4-member family on rooftop, 2yo infant with high fever and respiratory distress. 6ft floodwater, no food, no power. Emergency medical boat — Barpeta Block B.",
        "timestamp": "2026-08-03T07:30:00Z"
    },
    {
        "case_id": "c1a2b3c4-0003-4000-8000-000000000003",
        "raw_transcript": "Brahmaputra breach kar diya Dibrugarh Steamer Ghat ke paas. Ek budha aadmi behosh ho gaya, sar par chot lagi hai, khoon nikal raha hai. Paani badhta ja raha hai.",
        "language_detected": "Hindi",
        "gps_or_landmark": "Dibrugarh Steamer Ghat Sector 3",
        "victim_count": 2,
        "emergency_categories": ["medical", "rising_water"],
        "vulnerability_flags": ["unconscious", "acute_medical", "elderly"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): Unconscious elderly male, head trauma with active bleeding, Brahmaputra embankment breach near Dibrugarh Steamer Ghat. Airlifting unit requested.",
        "timestamp": "2026-08-03T06:45:00Z"
    },
    {
        "case_id": "c1a2b3c4-0010-4000-8000-000000000010",
        "raw_transcript": "Majuli Kamalabari Ghat near our house completely submerged. My wife is 8 months pregnant and has been having contractions since 4am. We are trapped on the second floor with floodwater entering through windows.",
        "language_detected": "English",
        "gps_or_landmark": "Majuli Kamalabari Ghat, Majuli Island",
        "victim_count": 2,
        "emergency_categories": ["rising_water", "labor", "medical"],
        "vulnerability_flags": ["pregnant"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): 8-month pregnant woman with early contractions trapped on second floor, Majuli Kamalabari — Brahmaputra breach. ANM nurse bridge active.",
        "timestamp": "2026-08-03T05:30:00Z"
    },
    {
        "case_id": "c1a2b3c4-0011-4000-8000-000000000011",
        "raw_transcript": "Lakhimpur Dhemaji mur bapek dialysis hospital niyab lagibo. Aaji dialysis hoa naai, kal o hoa naai. Pani xari nai, naao aahibo laage!",
        "language_detected": "Assamese",
        "gps_or_landmark": "Dhemaji Town Centre, Dhemaji District",
        "victim_count": 3,
        "emergency_categories": ["medical", "stranded"],
        "vulnerability_flags": ["dialysis", "elderly"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): Elderly dialysis patient 48+ hours without treatment at Dhemaji Town Centre. Urgent medical boat + hospital coordination required — life-threatening.",
        "timestamp": "2026-08-03T08:20:00Z"
    },
    {
        "case_id": "c1a2b3c4-0012-4000-8000-000000000012",
        "raw_transcript": "Hojai Lanka area 7 jona manuh aasei, iiyaare 4 masiya sishu aasei jeya pio khay na. Pani 5 fut bhitare semu bhari semu. ANM Didi ke pathiyas dilei bhaal hoboi.",
        "language_detected": "Assamese",
        "gps_or_landmark": "Lanka Town, Hojai District",
        "victim_count": 7,
        "emergency_categories": ["rising_water", "medical", "stranded"],
        "vulnerability_flags": ["infant"],
        "urgency_score": 5,
        "tier": "Tier 1",
        "tele_health_status": "connecting",
        "summary": "CRITICAL (5/5): 7 stranded, including 4-month breastfeeding infant, 5ft water inside home at Lanka Hojai. Medical boat + ANM nurse dispatch — infant feeding crisis.",
        "timestamp": "2026-08-03T06:10:00Z"
    },

    # ── TIER 2: HIGH URGENCY ─────────────────────────────────────────────────────

    {
        "case_id": "c1a2b3c4-0004-4000-8000-000000000004",
        "raw_transcript": "করিমগঞ্জ মূল বাজারে বাড়ি আংশিক জলমগ্ন। ৮২ বছরের বৃদ্ধ ডায়ালিসিস রোগী আছেন, পরশু থেকে ডায়ালিসিস হয়নি। জরুরি হাসপাতালে পৌঁছানো দরকার।",
        "language_detected": "Bengali",
        "gps_or_landmark": "Karimganj Main Bazaar, Karimganj District",
        "victim_count": 2,
        "emergency_categories": ["medical", "stranded"],
        "vulnerability_flags": ["dialysis", "elderly"],
        "urgency_score": 4,
        "tier": "Tier 2",
        "tele_health_status": "connecting",
        "summary": "HIGH URGENCY (4/5): 82-year-old dialysis patient 2 days without treatment at Karimganj Main Bazaar. Medical transport through partial inundation required.",
        "timestamp": "2026-08-03T07:05:00Z"
    },
    {
        "case_id": "c1a2b3c4-0005-4000-8000-000000000005",
        "raw_transcript": "Tezpur Mission Chariali mur ghar jaol porisecho. Wheelchair-bound eti hoi aase, nij ubhijibo nowara. Gaon basi aakou nai, jeebon sankat.",
        "language_detected": "Assamese",
        "gps_or_landmark": "Tezpur Mission Chariali, Sonitpur District",
        "victim_count": 1,
        "emergency_categories": ["stranded", "rising_water"],
        "vulnerability_flags": ["disabled"],
        "urgency_score": 4,
        "tier": "Tier 2",
        "tele_health_status": "not_needed",
        "summary": "HIGH URGENCY (4/5): Wheelchair-bound individual unable to self-evacuate from single-storey home at Tezpur Mission Chariali. All neighbours evacuated, isolated.",
        "timestamp": "2026-08-03T07:40:00Z"
    },
    {
        "case_id": "c1a2b3c4-0013-4000-8000-000000000013",
        "raw_transcript": "Goalpara Dudhnoi near railway crossing. My 70-year-old mother-in-law has severe chest pain since last night. She is a heart patient and medicines are submerged. Water is 3 feet inside the house.",
        "language_detected": "English",
        "gps_or_landmark": "Dudhnoi, Goalpara District",
        "victim_count": 4,
        "emergency_categories": ["medical", "rising_water"],
        "vulnerability_flags": ["elderly", "acute_medical"],
        "urgency_score": 4,
        "tier": "Tier 2",
        "tele_health_status": "connecting",
        "summary": "HIGH URGENCY (4/5): 70-year-old cardiac patient, chest pain, medicines lost to flooding at Dudhnoi Goalpara. 3ft inundation. Tele-health ECG consult + evacuation.",
        "timestamp": "2026-08-03T08:45:00Z"
    },
    {
        "case_id": "c1a2b3c4-0014-4000-8000-000000000014",
        "raw_transcript": "Chirang Bijni town. Maa ke polio ache, woh kuch nahi kar sakti. Bhai ko boat leke aanewale log kal se nahi aaye. Teen feet paani ghar mein, khaana khatam hua.",
        "language_detected": "Hindi",
        "gps_or_landmark": "Bijni Town, Chirang District",
        "victim_count": 3,
        "emergency_categories": ["stranded", "rising_water"],
        "vulnerability_flags": ["disabled", "elderly"],
        "urgency_score": 4,
        "tier": "Tier 2",
        "tele_health_status": "not_needed",
        "summary": "HIGH URGENCY (4/5): Polio-affected elderly woman, 3 family members stranded 24+ hours at Bijni Chirang. Promised boat never arrived. Food exhausted.",
        "timestamp": "2026-08-03T09:00:00Z"
    },

    # ── TIER 2: MODERATE HIGH ────────────────────────────────────────────────────

    {
        "case_id": "c1a2b3c4-0006-4000-8000-000000000006",
        "raw_transcript": "Morigaon Bhuragaon village completely cut off. Elderly couple Nagen Deka (78) and Mina Deka (72) stuck on wooden loft. Food running out, water rising.",
        "language_detected": "English",
        "gps_or_landmark": "Morigaon Bhuragaon Village, Morigaon District",
        "victim_count": 2,
        "emergency_categories": ["stranded"],
        "vulnerability_flags": ["elderly"],
        "urgency_score": 3,
        "tier": "Tier 2",
        "tele_health_status": "not_needed",
        "summary": "MODERATE URGENCY (3/5): Elderly couple (78M + 72F) isolated on wooden loft, Bhuragaon village cut off. Food supply critically low. Standard boat queued.",
        "timestamp": "2026-08-03T06:30:00Z"
    },
    {
        "case_id": "c1a2b3c4-0007-4000-8000-000000000007",
        "raw_transcript": "Nagaon Raha Ghat near the ferry point. A villager slipped while securing boats and suffered a compound fracture of the left leg. Bone is visible. He needs hospital immediately.",
        "language_detected": "English",
        "gps_or_landmark": "Nagaon Raha Ferry Ghat, Nagaon District",
        "victim_count": 1,
        "emergency_categories": ["medical"],
        "vulnerability_flags": ["injured"],
        "urgency_score": 3,
        "tier": "Tier 2",
        "tele_health_status": "connecting",
        "summary": "MODERATE URGENCY (3/5): Compound fracture left leg (bone exposed) at Nagaon Raha Ferry Ghat. Tele-first-aid activated, evacuation to civil hospital required.",
        "timestamp": "2026-08-03T08:00:00Z"
    },
    {
        "case_id": "c1a2b3c4-0015-4000-8000-000000000015",
        "raw_transcript": "Kamrup rural Hajo area. 11 jana aasei, teen jana bura-buri aasei. Ghar bhorang hoise, timber ghar. 4 din hoil aasei. ANM nurse badeseo nalage, relief camp te pathiai dile hoi.",
        "language_detected": "Assamese",
        "gps_or_landmark": "Hajo, Kamrup Rural District",
        "victim_count": 11,
        "emergency_categories": ["stranded", "rising_water"],
        "vulnerability_flags": ["elderly"],
        "urgency_score": 3,
        "tier": "Tier 2",
        "tele_health_status": "not_needed",
        "summary": "MODERATE URGENCY (3/5): 11 stranded at Hajo including 3 elderly, 4 days isolated in partially collapsed timber house. Shelter routing to Kamrup relief camp needed.",
        "timestamp": "2026-08-03T10:00:00Z"
    },

    # ── TIER 3: STANDARD ─────────────────────────────────────────────────────────

    {
        "case_id": "c1a2b3c4-0008-4000-8000-000000000008",
        "raw_transcript": "5 adults stranded on commercial building rooftop in Guwahati West Bharalumukh. Building is concrete, water at 2nd floor. We have food for 1 day. No medical emergency.",
        "language_detected": "English",
        "gps_or_landmark": "Guwahati West Bharalumukh, Kamrup Metropolitan",
        "victim_count": 5,
        "emergency_categories": ["stranded"],
        "vulnerability_flags": [],
        "urgency_score": 3,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "MODERATE URGENCY (3/5): 5 able-bodied adults on concrete commercial rooftop, Bharalumukh. 1-day food supply. Standard boat scheduled. No medical emergency.",
        "timestamp": "2026-08-03T06:00:00Z"
    },
    {
        "case_id": "c1a2b3c4-0009-4000-8000-000000000009",
        "raw_transcript": "Kaziranga Patrol Post 4 near Bokakhat highway. Our family of 4 is safe at the embankment but 2 of our cattle and a calf are stranded in the lower barn below floodwater.",
        "language_detected": "English",
        "gps_or_landmark": "Kaziranga Patrol Post 4, Golaghat District",
        "victim_count": 4,
        "emergency_categories": ["rising_water"],
        "vulnerability_flags": [],
        "urgency_score": 2,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "LOW URGENCY (2/5): Able-bodied family of 4 secure at embankment near Kaziranga. Livestock (2 cattle + calf) trapped in barn. Standard evacuation when available.",
        "timestamp": "2026-08-03T08:10:00Z"
    },
    {
        "case_id": "c1a2b3c4-0016-4000-8000-000000000016",
        "raw_transcript": "Jorhat Titabor near Neamati Ghat. Amra 8 jon maanuh, sab youba. Ghar ure gaise baan e. Camp e jabor lagibo. Medical emergency nai, but camp te seat aasei nei ki?",
        "language_detected": "Assamese",
        "gps_or_landmark": "Titabor, Jorhat District near Neamati Ghat",
        "victim_count": 8,
        "emergency_categories": ["stranded", "rising_water"],
        "vulnerability_flags": [],
        "urgency_score": 2,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "LOW URGENCY (2/5): 8 able-bodied youth at Titabor Jorhat, house destroyed by flood surge. Requesting shelter routing to nearest relief camp. No medical emergency.",
        "timestamp": "2026-08-03T09:45:00Z"
    },
    {
        "case_id": "c1a2b3c4-0017-4000-8000-000000000017",
        "raw_transcript": "Sivasagar Nazira town. Three families together on the terrace, about 12 people total. Kids are here but healthy. We have enough food for 2 days. Water level seems stable now but road is blocked.",
        "language_detected": "English",
        "gps_or_landmark": "Nazira Town, Sivasagar District",
        "victim_count": 12,
        "emergency_categories": ["stranded"],
        "vulnerability_flags": [],
        "urgency_score": 2,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "LOW URGENCY (2/5): 12 people including children, 3 families on terrace at Nazira Sivasagar. 2-day food supply, water stable. Road access blocked, awaiting boat.",
        "timestamp": "2026-08-03T07:20:00Z"
    },
    {
        "case_id": "c1a2b3c4-0018-4000-8000-000000000018",
        "raw_transcript": "Dhubri Gauripur area. We are at the mosque roof, 20 people safe. No old or sick people here. Water came yesterday night, now 4 feet on road. Requesting transport to nearest shelter.",
        "language_detected": "English",
        "gps_or_landmark": "Gauripur Mosque, Dhubri District",
        "victim_count": 20,
        "emergency_categories": ["stranded"],
        "vulnerability_flags": [],
        "urgency_score": 2,
        "tier": "Tier 3",
        "tele_health_status": "not_needed",
        "summary": "LOW URGENCY (2/5): 20 able-bodied adults sheltering at mosque rooftop, Gauripur Dhubri. 4ft water on road since last night. Requesting batch transport to relief camp.",
        "timestamp": "2026-08-03T08:30:00Z"
    }
]
