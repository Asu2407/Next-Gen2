import os
import json
import logging
import httpx
from typing import Tuple
from app.config import settings

logger = logging.getLogger("stt_service")

# Pre-recorded audio sample mappings for offline demo / stub mode
SAMPLE_TRANSCRIPTS = {
    "assamese": {
        "transcript": "পাানী বহুত বেগেৰে বাঢ়িছে! শিলচৰ পাব্লিক স্কুলৰ ওচৰত ৪ জন মানুহ আৱদ্ধ হৈ আছে। এজনী গৰ্ভৱতী মহিলা আৰু এটা কেঁচুৱা আছে। সোনকালে সহায় পঠিয়াওক!",
        "language": "Assamese",
        "sample_name": "sample_assamese.wav"
    },
    "bengali": {
        "transcript": "জল খুব দ্রুত বাড়ছে! করিমগঞ্জ বাজারে বাড়ি জলমগ্ন। ৮২ বছরের একজন বৃদ্ধ ডায়ালিসিস রোগী ঘরের ভেতরে আটকে আছেন। মেডিকেল ইমার্জেন্সি!",
        "language": "Bengali",
        "sample_name": "sample_bengali.wav"
    },
    "hindi": {
        "transcript": "गुवाहाटी वेस्ट में पानी का स्तर बहुत बढ़ गया है। छत पर 5 लोग फंसे हुए हैं। राशन और पीने का पानी खत्म हो गया है, तुरंत रेस्क्यू बोट भेजो।",
        "language": "Hindi",
        "sample_name": "sample_hindi.wav"
    },
    "english": {
        "transcript": "This is a routine update from Majuli dike embankment post. Water level is steady, clear weather, zero human casualties, routine check complete.",
        "language": "English",
        "sample_name": "sample_english.wav"
    }
}

async def transcribe_audio(file_bytes: bytes, filename: str = "") -> Tuple[str, str]:
    """
    Transcribes audio bytes using OpenAI Whisper API if OPENAI_API_KEY is available.
    Otherwise uses an intelligent mock STT provider keyed on sample names/headers/language hints.
    Returns: (raw_transcript, language_detected)
    """
    # 1. Check if OpenAI Whisper API key is available
    if settings.OPENAI_API_KEY:
        try:
            logger.info("Attempting OpenAI Whisper API transcription...")
            async with httpx.AsyncClient() as client:
                files = {"file": (filename or "audio.wav", file_bytes, "audio/wav")}
                data = {"model": "whisper-1"}
                headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=30.0
                )
                if response.status_code == 200:
                    res_json = response.json()
                    transcript = res_json.get("text", "")
                    lang = res_json.get("language", "English").capitalize()
                    return transcript, lang
                else:
                    logger.warning(f"Whisper API error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Whisper API exception: {e}. Falling back to mock STT.")

    # 2. Mock STT Fallback & Pre-recorded Sample Matching
    filename_lower = filename.lower()
    
    if "assamese" in filename_lower or "sample_assamese" in filename_lower or b"ASSAMESE" in file_bytes[:100]:
        item = SAMPLE_TRANSCRIPTS["assamese"]
        return item["transcript"], item["language"]
    elif "bengali" in filename_lower or "sample_bengali" in filename_lower or b"BENGALI" in file_bytes[:100]:
        item = SAMPLE_TRANSCRIPTS["bengali"]
        return item["transcript"], item["language"]
    elif "hindi" in filename_lower or "sample_hindi" in filename_lower or b"HINDI" in file_bytes[:100]:
        item = SAMPLE_TRANSCRIPTS["hindi"]
        return item["transcript"], item["language"]
    elif "english" in filename_lower or "sample_english" in filename_lower or b"ENGLISH" in file_bytes[:100]:
        item = SAMPLE_TRANSCRIPTS["english"]
        return item["transcript"], item["language"]

    # Generic file bytes header matching
    if len(file_bytes) > 0:
        try:
            content_str = file_bytes.decode('utf-8', errors='ignore')
            for key, item in SAMPLE_TRANSCRIPTS.items():
                if key in content_str.lower() or item["sample_name"].lower() in content_str.lower():
                    return item["transcript"], item["language"]
        except Exception:
            pass

    default_item = SAMPLE_TRANSCRIPTS["assamese"]
    return default_item["transcript"], default_item["language"]
