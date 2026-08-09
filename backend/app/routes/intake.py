from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body, Request
from typing import Optional, Union, Any
import json
import logging

from app.models.case import CaseSchema, IntakeResponse, IntakeTextRequest
from app.services.stt import transcribe_audio
from app.services.llm_extractor import extract_entities
from app.services.urgency_engine import calculate_urgency_and_summary

logger = logging.getLogger("intake_route")

router = APIRouter(prefix="", tags=["SOS Intake"])

def _extract_text_request(data: Any) -> Optional[IntakeTextRequest]:
    """Helper to safely extract IntakeTextRequest from dict/string/object."""
    if not data:
        return None
    if isinstance(data, IntakeTextRequest):
        return data
    if isinstance(data, dict):
        if data.get("text_input"):
            return IntakeTextRequest(
                text_input=str(data["text_input"]),
                language_hint=str(data["language_hint"]) if data.get("language_hint") else None
            )
        if isinstance(data.get("json_body"), dict) and data["json_body"].get("text_input"):
            return IntakeTextRequest(
                text_input=str(data["json_body"]["text_input"]),
                language_hint=str(data["json_body"]["language_hint"]) if data["json_body"].get("language_hint") else None
            )
        if isinstance(data.get("json_body"), str):
            return _extract_text_request(data["json_body"])
    if isinstance(data, str):
        cleaned = data.strip()
        if cleaned and cleaned not in ["{}", "null", "None", ""]:
            try:
                parsed = json.loads(cleaned)
                return _extract_text_request(parsed)
            except Exception:
                pass
    return None

@router.post("/intake", response_model=IntakeResponse)
async def process_sos_intake(
    request: Request,
    file: Optional[UploadFile] = File(None),
    text_input: Optional[str] = Form(None),
    language_hint: Optional[str] = Form(None),
    json_body: Optional[Union[IntakeTextRequest, dict, str, Any]] = Body(None)
):
    """
    Process flood SOS intake via audio file upload or text input fallback.
    Supports file uploads, form fields, and raw JSON payloads.
    Gracefully handles empty string/dict Swagger UI form fields ("{}") without 422 errors.
    """
    raw_transcript = ""
    language_detected = "Unknown"

    parsed_json_body = _extract_text_request(json_body)

    # If top-level JSON request body was sent without nesting
    if not parsed_json_body and request.headers.get("content-type", "").startswith("application/json"):
        try:
            raw_json_data = await request.json()
            parsed_json_body = _extract_text_request(raw_json_data)
        except Exception:
            pass

    try:
        # Case 1: Audio file upload
        if file is not None:
            logger.info(f"Processing audio file intake: {file.filename}")
            file_bytes = await file.read()
            raw_transcript, language_detected = await transcribe_audio(file_bytes, file.filename or "")

        # Case 2: Form text input or JSON payload
        elif text_input or (parsed_json_body and parsed_json_body.text_input):
            text = text_input if text_input else parsed_json_body.text_input
            lang = language_hint if language_hint else (parsed_json_body.language_hint if parsed_json_body else "Unknown")
            raw_transcript = text.strip()
            language_detected = lang if lang else "Unknown"

        else:
            raise HTTPException(
                status_code=400,
                detail="Must provide either an audio file upload or text_input in request body."
            )

        if not raw_transcript:
            raise HTTPException(
                status_code=422,
                detail="Empty transcript derived from intake source."
            )

        # Step 2: Extract Entities into JSON schema
        extracted_entities = await extract_entities(raw_transcript, language_detected)

        # Step 3: Run Urgency Engine
        final_case_dict = calculate_urgency_and_summary(extracted_entities)

        # Validate with CaseSchema Pydantic model
        case_obj = CaseSchema(**final_case_dict)

        # Register into Triage Priority Queue Store (Module 2 integration)
        from app.services.triage_service import queue_store
        queue_store.add_or_update_case(case_obj.model_dump())

        return IntakeResponse(
            status="success",
            message="SOS intake processed and prioritized successfully",
            case=case_obj
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing SOS intake: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process SOS intake: {str(e)}"
        )
