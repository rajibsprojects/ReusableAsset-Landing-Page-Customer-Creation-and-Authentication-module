"""Google social login via Emergent-managed auth. Swap this module to change the social provider."""
import logging
import httpx
from fastapi import HTTPException
from core.config import settings

logger = logging.getLogger(__name__)


async def fetch_google_session(session_id: str) -> dict:
    if not settings.EMERGENT_AUTH_SESSION_URL:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(settings.EMERGENT_AUTH_SESSION_URL, headers={"X-Session-ID": session_id})
    except httpx.HTTPError as exc:
        logger.error("Google session exchange failed: %s", exc)
        raise HTTPException(status_code=502, detail="Google sign-in service is unavailable. Please try again.")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified. Please try again.")
    data = resp.json()
    if not data.get("email") or not data.get("session_token"):
        raise HTTPException(status_code=401, detail="Google sign-in returned incomplete data")
    return data
