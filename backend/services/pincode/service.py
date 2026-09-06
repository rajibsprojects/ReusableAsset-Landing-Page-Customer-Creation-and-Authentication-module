import re
from abc import ABC, abstractmethod
import httpx
from core.config import settings


class PincodeServiceError(Exception):
    """Raised when the external PIN service is unavailable."""


class PincodeProvider(ABC):
    @abstractmethod
    async def lookup(self, pin: str) -> dict | None:
        """Return {city, state, district, post_offices} or None when the PIN is unknown."""


class IndiaPostProvider(PincodeProvider):
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def lookup(self, pin: str) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(f"{self.base_url}{pin}")
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise PincodeServiceError(str(exc)) from exc
        if not data or data[0].get("Status") != "Success" or not data[0].get("PostOffice"):
            return None
        offices = data[0]["PostOffice"]
        first = offices[0]
        return {
            "pin": pin,
            "city": first.get("District") or first.get("Block") or "",
            "district": first.get("District", ""),
            "state": first.get("State", ""),
            "post_offices": [o.get("Name", "") for o in offices],
        }


class PincodeService:
    def __init__(self, provider: PincodeProvider | None):
        self.provider = provider

    @staticmethod
    def is_valid(pin: str) -> bool:
        return bool(re.fullmatch(r"[1-9]\d{5}", pin or ""))

    async def lookup(self, pin: str) -> dict | None:
        if not self.provider:
            raise PincodeServiceError("PIN lookup service not configured")
        return await self.provider.lookup(pin)


pincode_service = PincodeService(IndiaPostProvider(settings.PINCODE_API_URL) if settings.PINCODE_API_URL else None)
