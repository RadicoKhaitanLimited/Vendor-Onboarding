# onboarding/utils/sandbox.py

import requests

from django.conf import settings


def get_access_token():

    response = requests.post(
        "https://api.sandbox.co.in/authenticate",
        headers={
            "x-api-key": settings.SANDBOX_API_KEY,
            "x-api-secret": settings.SANDBOX_API_SECRET,
            "x-api-version": "2.0"
        }
    )

    response.raise_for_status()

    return response.json()["access_token"]