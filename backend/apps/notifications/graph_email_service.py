import msal
import requests
from django.conf import settings

AUTHORITY = f"https://login.microsoftonline.com/{settings.API_TENANT_ID}"
SCOPES = ["https://graph.microsoft.com/.default"]


def get_access_token():
    app = msal.ConfidentialClientApplication(
        client_id=settings.API_CLIENT_ID,
        authority=AUTHORITY,
        client_credential=settings.API_SECRET,
    )

    result = app.acquire_token_for_client(scopes=SCOPES)

    if "access_token" not in result:
        raise Exception(result)

    return result["access_token"]


def send_graph_email(to_email, subject, html):

    token = get_access_token()

    url = (
        f"https://graph.microsoft.com/v1.0/"
        f"users/{settings.API_USER_ID}/sendMail"
    )

    body = {
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
            ]
        },
        "saveToSentItems": True
    }

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=body,
        timeout=30
    )

    if response.status_code != 202:
        raise Exception(response.text)