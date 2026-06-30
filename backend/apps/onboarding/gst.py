"""
Standalone MSME / Udyam verification API test.

Goal: hit the provider's API directly, print the RAW response, and learn the
exact field names + shape BEFORE wiring anything into Django/React.

Run locally (NOT inside the project):
    pip install requests
    python test_udyam_verify.py

Fill in your keys below or set them as environment variables.
"""

import os
import json
import requests


# ──────────────────────────────────────────────────────────────
# Pick ONE provider block to test. Cashfree is recommended because
# PAN -> Udyam is a single call with no OTP, and you already have a
# verified PAN from the earlier step.
# ──────────────────────────────────────────────────────────────


def pretty(label, obj):
    print(f"\n===== {label} =====")
    try:
        print(json.dumps(obj, indent=2, ensure_ascii=False))
    except TypeError:
        print(obj)


# ============================================================
# OPTION A — Cashfree: PAN -> Udyam  (recommended, no OTP)
# Docs: https://www.cashfree.com/docs/api-reference/vrs/v2/pan-to-udyam/fetch-udyam-with-pan
# ============================================================

CASHFREE_CLIENT_ID     = os.getenv("CASHFREE_CLIENT_ID",     "PASTE_CLIENT_ID")
CASHFREE_CLIENT_SECRET = os.getenv("CASHFREE_CLIENT_SECRET", "PASTE_CLIENT_SECRET")

# Test host shown above; swap to the production host once it works.
CASHFREE_BASE = "https://sandbox.cashfree.com"

print(repr(CASHFREE_CLIENT_ID), repr(CASHFREE_CLIENT_SECRET))


def cashfree_pan_to_udyam(pan, verification_id="test-001"):
    url = f"{CASHFREE_BASE}/verification/pan-udyam"
    resp = requests.post(
        url,
        json={"verification_id": verification_id, "pan": pan.upper()},
        headers={
            "Content-Type": "application/json",
            "x-client-id": CASHFREE_CLIENT_ID,
            "x-client-secret": CASHFREE_CLIENT_SECRET,
        },
        timeout=30,
    )
    print(f"HTTP {resp.status_code}")
    try:
        return resp.json()
    except ValueError:
        return resp.text


# ============================================================
# OPTION B — Sandbox.co.in  (ONLY if your Console shows a Udyam endpoint).
# Reuses the exact auth pattern from your backend/apps/onboarding/utils/sandbox.py
# ============================================================

SANDBOX_API_KEY    = os.getenv("SANDBOX_API_KEY",    "PASTE_SANDBOX_KEY")
SANDBOX_API_SECRET = os.getenv("SANDBOX_API_SECRET", "PASTE_SANDBOX_SECRET")

# CONFIRM this path in your Sandbox Console — it may not exist at all.
SANDBOX_UDYAM_URL  = "https://api.sandbox.co.in/kyc/udyam/verify"


def sandbox_get_token():
    resp = requests.post(
        "https://api.sandbox.co.in/authenticate",
        headers={
            "x-api-key": SANDBOX_API_KEY,
            "x-api-secret": SANDBOX_API_SECRET,
            "x-api-version": "2.0",
        },
        timeout=30,
    )
    resp.raise_for_status()
    body = resp.json()
    # Your util reads access_token at top level; newer docs nest it under "data".
    # Handle both so the test doesn't silently fail.
    return body.get("access_token") or body.get("data", {}).get("access_token")


def sandbox_verify_udyam(udyam):
    token = sandbox_get_token()
    resp = requests.post(
        SANDBOX_UDYAM_URL,
        json={
            "@entity": "in.co.sandbox.kyc.udyam.request",  # CONFIRM
            "udyam_number": udyam.upper(),
            "consent": "Y",
            "reason": "Vendor onboarding MSME verification",
        },
        headers={
            "Authorization": token,
            "x-api-key": SANDBOX_API_KEY,
            "x-api-version": "1.0.0",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    print(f"HTTP {resp.status_code}")
    try:
        return resp.json()
    except ValueError:
        return resp.text


if __name__ == "__main__":
    # ---- Test Cashfree PAN -> Udyam ----
    result = cashfree_pan_to_udyam(pan="ABCPV1234D")  # use a real/test PAN
    pretty("Cashfree PAN -> Udyam", result)

    # ---- Or test Sandbox directly (uncomment if your Console has the endpoint) ----
    # result = sandbox_verify_udyam(udyam="UDYAM-MH-26-1234567")
    # pretty("Sandbox Udyam verify", result)