import logging
from django.conf import settings
from django.template.loader import render_to_string

from .graph_email_service import send_graph_email

logger = logging.getLogger(__name__)


def send_onboarding_invite(to_email: str, onboarding, token: str):

    entity_type = onboarding.onboarding_type.capitalize()

    form_url = f"{settings.FRONTEND_URL}/onboarding/{token}"

    subject = f"Radico Khaitan — {entity_type} Onboarding Invitation"

    context = {
        "entity_type": entity_type,
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