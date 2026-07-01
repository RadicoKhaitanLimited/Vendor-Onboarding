import logging
import msal
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

AUTHORITY = f"https://login.microsoftonline.com/{settings.API_TENANT_ID}"
SCOPES = ["https://graph.microsoft.com/.default"]


def get_access_token():
    logger.info("=" * 60)
    logger.info("MICROSOFT GRAPH CONFIG")
    logger.info("CLIENT_ID        : %s", settings.API_CLIENT_ID)
    logger.info("TENANT_ID        : %s", settings.API_TENANT_ID)
    logger.info("SENDER_EMAIL     : %s", settings.GRAPH_SENDER_EMAIL)
    logger.info("SECRET LENGTH    : %d", len(settings.API_SECRET))
    logger.info("SECRET PREFIX    : %s", settings.API_SECRET[:8])
    logger.info("=" * 60)

    app = msal.ConfidentialClientApplication(
        client_id=settings.API_CLIENT_ID,
        authority=AUTHORITY,
        client_credential=settings.API_SECRET,
    )

    result = app.acquire_token_for_client(scopes=SCOPES)

    logger.info("MSAL RESPONSE : %s", result)

    if "access_token" not in result:
        raise Exception(result)

    return result["access_token"]


def send_graph_email(to_email, subject, html):
    token = get_access_token()

    url = f"https://graph.microsoft.com/v1.0/users/{settings.GRAPH_SENDER_EMAIL}/sendMail"

    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": html,
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to_email
                    }
                }
            ],
        },
        "saveToSentItems": True,
    }

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )

    logger.info("GRAPH STATUS : %s", response.status_code)
    logger.info("GRAPH RESPONSE : %s", response.text)

    response.raise_for_status()