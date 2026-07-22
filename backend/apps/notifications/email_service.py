import logging
from django.conf import settings
from django.template.loader import render_to_string

from .graph_email_service import send_graph_email

logger = logging.getLogger(__name__)


def _entity_type_for_onboarding(onboarding):
    onboarding_code = str(getattr(onboarding, "onboarding_code", "") or "").strip().upper()
    if onboarding_code.startswith("V"):
        return "Vendor"
    if onboarding_code.startswith("C"):
        return "Customer"

    onboarding_type = str(
        getattr(onboarding, "onboarding_type", "") or getattr(onboarding, "target_type", "") or ""
    ).strip().upper()
    if onboarding_type == "VENDOR":
        return "Vendor"
    if onboarding_type == "CUSTOMER":
        return "Customer"

    return "Business Partner"


def _reference_code_for_onboarding(onboarding):
    return getattr(onboarding, "onboarding_code", "") or getattr(onboarding, "request_code", "")


def send_onboarding_invite(to_email: str, onboarding, token: str):

    entity_type = _entity_type_for_onboarding(onboarding)
    registration_title = f"{entity_type} Registration"

    form_url = f"{settings.FRONTEND_URL}/onboarding/{token}?type={entity_type.lower()}"

    subject = f"Radico Khaitan - {registration_title} Invitation"

    context = {
        "entity_type": entity_type,
        "entity_type_lower": entity_type.lower(),
        "registration_title": registration_title,
        "registration_title_lower": registration_title.lower(),
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


def send_sap_creation_request(onboarding):
    """Notify the SAP team once an onboarding has been approved, so the vendor/customer master can be created."""
    entity_type = _entity_type_for_onboarding(onboarding)
    reference_code = _reference_code_for_onboarding(onboarding)
    subject = f"Create {entity_type} in SAP - {reference_code}"
    record_url = f"{settings.FRONTEND_URL}/dashboard?approval={onboarding.id}"

    html_body = render_to_string(
        "email/sap_creation_request.html",
        {
            "onboarding": onboarding,
            "entity_type": entity_type,
            "reference_code": reference_code,
            "record_url": record_url,
            "logo_url": f"{settings.FRONTEND_URL}/radico-logo.png",
        },
    )

    to_email = settings.SAP_CREATION_NOTIFY_EMAIL
    logger.info("Sending SAP creation request to %s", to_email)
    send_graph_email(to_email=to_email, subject=subject, html=html_body)


def send_boss_approval_request(to_email: str, onboarding, employee):
    """Notify an assigned boss and link directly to the protected review screen."""
    is_extension_edit = hasattr(onboarding, 'request_code')
    approval_url = f"{settings.FRONTEND_URL}/dashboard?approval={onboarding.id}"
    if is_extension_edit:
        approval_url += "&approval_kind=extension_edit"
    entity_type = _entity_type_for_onboarding(onboarding)
    reference_code = _reference_code_for_onboarding(onboarding)
    request_label = f"{entity_type} {onboarding.request_type.lower()} request" if is_extension_edit else f"{entity_type} onboarding"
    subject = f"Approval required: {request_label} {reference_code}"
    html_body = render_to_string(
        "email/boss_approval_request.html",
        {
            "approval_url": approval_url,
            "onboarding": onboarding,
            "entity_type": entity_type,
            "request_label": request_label,
            "reference_code": reference_code,
            "employee_name": employee.full_name or employee.email,
            "logo_url": f"{settings.FRONTEND_URL}/radico-logo.png",
        },
    )
    logger.info("Sending boss approval request to %s", to_email)
    send_graph_email(to_email=to_email, subject=subject, html=html_body)
