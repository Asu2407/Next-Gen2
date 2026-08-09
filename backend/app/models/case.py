from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone

class CaseSchema(BaseModel):
    case_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    raw_transcript: str
    language_detected: str
    gps_or_landmark: str = "Unknown Location"
    victim_count: int = 1
    emergency_categories: List[str] = Field(default_factory=list)
    vulnerability_flags: List[str] = Field(default_factory=list)
    urgency_score: int = Field(ge=1, le=5, default=3)
    tier: str = "Tier 2"  # "Tier 1" | "Tier 2" | "Tier 3"
    tele_health_status: str = "not_needed"  # "not_needed" | "connecting" | "connected" | "completed"
    summary: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    merged_count: int = 1
    merged_reports: Optional[List[Dict[str, Any]]] = None

class IntakeTextRequest(BaseModel):
    text_input: str
    language_hint: Optional[str] = None

class IntakeResponse(BaseModel):
    status: str = "success"
    message: str = "SOS intake processed successfully"
    case: CaseSchema
