# apps/documents/utils/scan.py
"""
Extract structured fields from uploaded KYC documents using Claude vision.

Used by DocumentScanView. Returns a plain dict of extracted fields so the
reviewer can confirm them and feed PAN / GSTIN into the existing verify APIs.
"""

import base64
import json
import mimetypes

import anthropic
from django.conf import settings


PROMPTS = {
    "PAN": (
        "You are extracting fields from an Indian PAN card. "
        "Return ONLY a JSON object with exactly these keys: "
        '{"pan_number", "name", "father_name", "date_of_birth"}. '
        "date_of_birth in DD/MM/YYYY if present."
    ),
    "GST": (
        "You are extracting fields from an Indian GST registration certificate. "
        "Return ONLY a JSON object with exactly these keys: "
        '{"gstin", "legal_name", "trade_name", "constitution", '
        '"registration_date", "address"}.'
    ),
    "CHEQUE": (
        "You are extracting fields from a cancelled cheque. "
        "Return ONLY a JSON object with exactly these keys: "
        '{"account_number", "ifsc", "bank_name", "branch", "account_holder_name"}.'
    ),
    "MSME": (
        "You are extracting fields from an Indian Udyam (MSME) registration "
        "certificate. Return ONLY a JSON object with exactly these keys: "
        '{"udyam_number", "enterprise_name", "enterprise_type", '
        '"major_activity", "registration_date", "address"}. '
        "enterprise_type must be one of MME, MSE, MSM, MET, MMT, MST, or MNA. "
        "Use MME for Micro or A or D, MSE for Small or B or E, MSM for Medium "
        "or C or F, MET for Micro Enterprises - Trading, MMT for Medium "
        "Enterprise - Trading, MST for Small Enterprise - Trading, and MNA for "
        "Not MSME Registered/Applicable."
    ),
}

INSTRUCTION_SUFFIX = (
    " If a field is not present, set its value to null. "
    "Respond with raw JSON only - no prose, no explanation, no markdown fences."
)


def _build_content(file_bytes, filename, prompt):
    media_type, _ = mimetypes.guess_type(filename or "")
    b64 = base64.b64encode(file_bytes).decode("utf-8")

    if media_type == "application/pdf":
        source_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
        }
    else:
        if media_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            media_type = "image/jpeg"  # safe default for jpg/unknown image
        source_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        }

    return [source_block, {"type": "text", "text": prompt + INSTRUCTION_SUFFIX}]


def scan_document(file_bytes, filename, document_type):
    """Run extraction for a single document.

    Args:
        file_bytes:    raw bytes of the uploaded file
        filename:      original filename (used to detect pdf vs image)
        document_type: one of PAN / GST / CHEQUE / MSME

    Returns:
        dict of extracted fields

    Raises:
        ValueError on unknown document_type
        json.JSONDecodeError if the model returns non-JSON (caller should catch)
    """
    prompt = PROMPTS.get(document_type)
    if prompt is None:
        raise ValueError(f"Unsupported document_type: {document_type}")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": _build_content(file_bytes, filename, prompt)}
        ],
    )

    raw = "".join(b.text for b in message.content if b.type == "text").strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    return json.loads(raw)
