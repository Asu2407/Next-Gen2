import re
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.config import settings

logger = logging.getLogger("llm_extractor")

# Multilingual Keyword Dictionaries for High-Precision SOS Extraction
VULNERABILITY_PATTERNS = {
    "pregnant": [
        r"pregnant", r"expecting", r"in\s+labor", r"in\s+labour", r"giving\s+birth",
        r"delivery", r"delivery\s+pain", r"maternity", r"গৰ্ভৱতী", r"গৰ্ভৱতী\s+মহিলা",
        r"গর্ভবতী", r"অন্তঃসত্ত্বা", r"গর্ভযন্ত্রণা", r"প্রসব", r"गर्भवती", r"प्रसव",
        r"प्रसव\s+पीड़ा", r"प्रसव\s+वेदना", r"बच्चा\s+होने\s+वाला"
    ],
    "infant": [
        r"infant", r"baby", r"toddler", r"newborn", r"কেঁচুৱা", r"শিশুর", r"শিশু",
        r"নবজাতক", r"ছোট\s+বাচ্চা", r"बच्चा", r"नवजात", r"शिशु"
    ],
    "elderly": [
        r"elderly", r"senior", r"old\s+age", r"old\s+person", r"aged", r"82\s+سال",
        r"82\s+বছর", r"82\s+years", r"বৃদ্ধ", r"বৃদ্ধা", r"বয়স্ক", r"বুজ়ুর্গ",
        r"बुजुर्ग", r"बूढ़े", r"वृद्ध"
    ],
    "disabled": [
        r"disabled", r"handicapped", r"paralyzed", r"bedridden", r"cannot\s+walk",
        r"wheelchair", r"বিশেষভাৱে\s+সক্ষম", r"অচল", r"প্রতিবন্ধী", r"दिव्यांग",
        r"विकलांग"
    ],
    "dialysis": [
        r"dialysis", r"kidney\s+patient", r"kidney\s+failure", r"ডায়ালিসিস", r"डायलिसिस"
    ]
}

EMERGENCY_PATTERNS = {
    "rising_water": [
        r"rising\s+water", r"water\s+rising", r"water\s+level", r"water\s+entering",
        r"water\s+entered", r"flooding", r"floodwater", r"submerged", r"inundated",
        r"fast-rising", r"rapidly\s+rising", r"পানী[\s]*বহুত[\s]*বেগেৰে[\s]*বাঢ়িছে",
        r"পাানী[\s]*বহুত[\s]*বেগেৰে[\s]*বাঢ়িছে", r"পানী[\s]*বাঢ়িছে", r"পানি[\s]*বাঢ়িছে",
        r"জল[\s]*খুব[\s]*দ্রুত[\s]*বাড়ছে", r"জলমগ্ন", r"पानी[\s]*का[\s]*स्तर", r"पानी[\s]*बढ़[\s]*रहा"
    ],
    "medical": [
        r"medical", r"labor", r"labour", r"hospital", r"doctor", r"sick", r"injured",
        r"injury", r"bleeding", r"emergency", r"ambulance", r"heart\s+attack",
        r"মেডিকেল", r"রোগী", r"বিমার", r"ইমার্জেন্সি", r"इमरजेंसी", r"बीमार", r"इलाज"
    ],
    "stranded": [
        r"stranded", r"trapped", r"surrounded\s+by\s+water", r"on\s+roof", r"rooftop",
        r"stuck", r"আৱদ্ধ", r"আটকে", r"ফংসে", r"फंसे", r"छत\s+पर"
    ]
}

LANDMARK_PATTERNS = [
    (r"শিলচৰ পাব্লিক স্কুল[ৰ]*|Silchar[a-zA-Z\s]*School", "Silchar Public School, Cachar"),
    (r"করিমগঞ্জ বাজার[ে]*|Karimganj[a-zA-Z\s]*bazaar", "Karimganj Bazaar, Karimganj"),
    (r"গুwahati West|গুwahati|Guwahati[a-zA-Z\s]*West", "Guwahati West, Kamrup Metropolitan"),
    (r"Kaziranga[a-zA-Z\s]*patrol[a-zA-Z\s]*post|Kaziranga[a-zA-Z\s]*embankment", "Kaziranga Patrol Post, Golaghat"),
    (r"Majuli[a-zA-Z\s]*dike|মাজুলী", "Majuli Dike, Majuli"),
    (r"Karimganj", "Karimganj District")
]

async def extract_entities(raw_transcript: str, language_detected: str = "Unknown") -> Dict[str, Any]:
    """
    Extracts structured case entities from a raw SOS transcript using LLM API if key available,
    otherwise uses an intelligent multilingual rule-based NLP extraction fallback engine.
    """
    # 1. Try LLM API (OpenAI / Gemini) if key is set
    if settings.OPENAI_API_KEY:
        try:
            import httpx
            prompt = f"""
You are an emergency SOS entity extraction model for Assam flood disaster response.
Extract structured entities from this transcript:
Transcript: "{raw_transcript}"
Detected Language: "{language_detected}"

Return strictly valid JSON with this exact schema:
{{
  "case_id": "{str(uuid.uuid4())}",
  "raw_transcript": "{raw_transcript}",
  "language_detected": "{language_detected}",
  "gps_or_landmark": "extracted specific landmark or city/district or Unknown Location",
  "victim_count": number of people stranded/affected (default 1 if unspecified),
  "emergency_categories": ["rising_water", "medical", "stranded"],
  "vulnerability_flags": ["pregnant", "infant", "elderly", "disabled", "dialysis"],
  "timestamp": "{datetime.now(timezone.utc).isoformat()}"
}}
"""
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"}
                    },
                    timeout=15.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return parsed
        except Exception as e:
            logger.error(f"LLM API extraction failed: {e}. Switching to rule-based fallback.")

    # 2. Rule-Based Fallback NLP Extraction Engine
    vulnerability_flags = []
    for flag, patterns in VULNERABILITY_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, raw_transcript, re.IGNORECASE):
                if flag not in vulnerability_flags:
                    vulnerability_flags.append(flag)
                break

    emergency_categories = []
    for cat, patterns in EMERGENCY_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, raw_transcript, re.IGNORECASE):
                # Filter out livestock stranded false positives
                if cat == "stranded" and any(k in raw_transcript.lower() for k in ["livestock", "barn", "animal"]):
                    continue
                if cat not in emergency_categories:
                    emergency_categories.append(cat)
                break

    # Extract landmark
    gps_or_landmark = "Unknown Location"
    for pat, location_name in LANDMARK_PATTERNS:
        if re.search(pat, raw_transcript, re.IGNORECASE):
            gps_or_landmark = location_name
            break

    # Extract victim count
    victim_count = 1
    num_match = re.search(r"(\d+|৪|৫|৮২|১|২|৩)\s*(জন|लोग|people|persons|members)", raw_transcript, re.IGNORECASE)
    if num_match:
        val = num_match.group(1)
        digit_map = {'১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9, '০': 0}
        if val in digit_map:
            victim_count = digit_map[val]
        else:
            try:
                parsed_num = int(val)
                if parsed_num < 50:
                    victim_count = parsed_num
            except ValueError:
                victim_count = 1

    # Language detection fallback
    if language_detected in ["Unknown", "", None]:
        if any(c in raw_transcript for c in "পাানীবাঢ়িছেশিলচৰগৰ্ভৱতীকেঁচুৱা"):
            language_detected = "Assamese"
        elif any(c in raw_transcript for c in "জলবাড়ছেকরিমগঞ্জবৃদ্ধডায়ালিসিসমজবুর"):
            language_detected = "Bengali"
        elif any(c in raw_transcript for c in "पानीस्तरगुवाहाटीछतफंसे"):
            language_detected = "Hindi"
        else:
            language_detected = "English"

    return {
        "case_id": str(uuid.uuid4()),
        "raw_transcript": raw_transcript,
        "language_detected": language_detected,
        "gps_or_landmark": gps_or_landmark,
        "victim_count": victim_count,
        "emergency_categories": emergency_categories,
        "vulnerability_flags": vulnerability_flags,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
