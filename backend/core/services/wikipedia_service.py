"""
Wikipedia image fetching service.

Uses the Wikimedia REST API (page/summary endpoint) to retrieve the lead
infobox image for a given article title.  Returns the full-resolution
``originalimage`` URL when available, falling back to the ``thumbnail``.

Wikipedia API terms: https://www.mediawiki.org/wiki/REST_API
"""

import time
import urllib.parse
from typing import Optional

import requests

_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary"
_USER_AGENT = (
    "F1Analytics/1.0 "
    "(https://github.com/AgustinReyLaje/F1-proyect-agustin) "
    "python-requests/2"
)
_REQUEST_INTERVAL = 1.0  # seconds between requests — polite default


def fetch_car_image_url(article_title: str) -> Optional[str]:
    """
    Return the lead image URL for *article_title* on English Wikipedia.

    Returns ``None`` if the article does not exist, has no image, or the
    network request fails.

    Includes a 1-second sleep after each call so callers can iterate over
    many articles without hammering the API.
    """
    slug = urllib.parse.quote(article_title.replace(" ", "_"), safe="")
    url = f"{_SUMMARY_API}/{slug}"

    try:
        resp = requests.get(
            url,
            headers={"User-Agent": _USER_AGENT},
            timeout=15,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        if "originalimage" in data:
            return data["originalimage"]["source"]
        if "thumbnail" in data:
            return data["thumbnail"]["source"]
        return None
    except Exception:
        return None
    finally:
        time.sleep(_REQUEST_INTERVAL)
