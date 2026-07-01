import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_onboarding_invite(to_email: str, onboarding, token: str):
    try:
        entity_type = onboarding.onboarding_type.capitalize()
        form_url = f"{settings.FRONTEND_URL}/onboarding/{token}"

        subject = f"Radico Khaitan — {entity_type} Onboarding Invitation"

        context = {
            'entity_type': entity_type,
            'onboarding_code': onboarding.onboarding_code,
            'form_url': form_url,
            'expiry_hours': getattr(settings, 'ONBOARDING_TOKEN_EXPIRY_HOURS', 72),
            'logo_url': f"{settings.FRONTEND_URL}/radico-logo.png",
        }

        html_body = render_to_string('email/onboarding_invite.html', context)
        text_body = (
            f"Dear {entity_type},\n\n"
            f"You have been invited to complete the Radico Khaitan {entity_type} onboarding process.\n\n"
            f"Your Reference Code: {onboarding.onboarding_code}\n\n"
            f"Please click the link below to fill your onboarding form:\n{form_url}\n\n"
            f"This link will expire in {context['expiry_hours']} hours.\n\n"
            f"Regards,\nRadico Khaitan Ltd"
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        email.attach_alternative(html_body, 'text/html')
        email.send(fail_silently=False)

    except Exception as e:
        logger.exception("Email sending failed")
    raise