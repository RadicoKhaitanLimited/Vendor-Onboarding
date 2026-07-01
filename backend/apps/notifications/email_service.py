import logging
from django.conf import settings
from django.template.loader import render_to_string

from .graph_email_service import send_graph_email

logger = logging.getLogger(__name__)


def _entity_type_for_onboarding(onboarding):
    onboarding_type = str(getattr(onboarding, "onboarding_type", "") or "").strip().upper()
    if onboarding_type == "VENDOR":
        return "Vendor"
    if onboarding_type == "CUSTOMER":
        return "Customer"

    onboarding_code = str(getattr(onboarding, "onboarding_code", "") or "").strip().upper()
    if onboarding_code.startswith("V"):
        return "Vendor"
    if onboarding_code.startswith("C"):
        return "Customer"

    return "Business Partner"


def send_onboarding_invite(to_email: str, onboarding, token: str):

    entity_type = _entity_type_for_onboarding(onboarding)

    form_url = f"{settings.FRONTEND_URL}/onboarding/{token}"

    subject = f"Radico Khaitan — {entity_type} Onboarding Invitation"

    context = {
        "entity_type": entity_type,
        "entity_type_lower": entity_type.lower(),
        "onboarding_code": onboarding.onboarding_code,
        "form_url": form_url,
        "expiry_hours": getattr(
            settings,
            "ONBOARDING_TOKEN_EXPIRY_HOURS",
            72,
        ),
        "logo_url": f"{settings.FRONTEND_URL}/radico-logo.png",
    }

    html_body = render_to_string(
        "email/onboarding_invite.html",
        context,
    )

    logger.info("Sending Graph email to %s", to_email)

    send_graph_email(
        to_email=to_email,
        subject=subject,
        html=html_body,
    )

    logger.info("Email sent successfully")
