import logging
import re
import time
from core.config import settings
from services.content.apps_script_provider import AppsScriptProvider
from services.content.local_provider import LocalProvider
from services.content.public_sheet_provider import PublicSheetProvider

logger = logging.getLogger(__name__)

KEY_ALIASES = {"business_citi": "business_city", "business_linkedin_url": "business_linkedin_url"}
PLACEHOLDERS = {"", "to be added", "tba", "n/a", "na", "-"}
DRIVE_FIELDS = ("owner_photo_url", "business_logo")
DRIVE_PATTERNS = [re.compile(r"drive\.google\.com/file/d/([\w-]+)"), re.compile(r"drive\.google\.com/(?:open|uc)\?(?:.*&)?id=([\w-]+)")]


def to_direct_drive_url(url: str) -> str:
    for pattern in DRIVE_PATTERNS:
        match = pattern.search(url)
        if match:
            return f"https://drive.google.com/thumbnail?id={match.group(1)}&sz=w1600"
    return url


def normalize_row(row: dict) -> dict:
    out = {}
    for key, value in row.items():
        k = KEY_ALIASES.get(key.strip().lower(), key.strip().lower())
        v = (value or "").strip() if isinstance(value, str) else value
        if isinstance(v, str) and v.lower() in PLACEHOLDERS:
            continue
        if v not in (None, ""):
            out[k] = v
    for field in DRIVE_FIELDS:
        if out.get(field):
            out[field] = to_direct_drive_url(out[field])
    return out


class ContentService:
    def __init__(self):
        self.local = LocalProvider()
        self.providers = []
        mode = settings.CONTENT_PROVIDER
        if mode in ("auto", "apps_script") and settings.APPS_SCRIPT_URL:
            self.providers.append(AppsScriptProvider(settings.APPS_SCRIPT_URL, settings.APPS_SCRIPT_API_KEY))
        if mode in ("auto", "public_sheet") and settings.GOOGLE_SHEET_ID_BUSINESS:
            self.providers.append(PublicSheetProvider())
        self._cache: dict = {}

    async def _defaults(self) -> dict:
        return normalize_row((await self.local.fetch_rows("", ""))[0])

    async def get_business_content(self, force: bool = False) -> dict:
        cached = self._cache.get("business")
        if cached and not force and time.time() - cached["ts"] < settings.CONTENT_CACHE_SECONDS:
            return cached["data"]
        defaults = await self._defaults()
        content, source = dict(defaults), "local"
        for provider in self.providers:
            try:
                rows = await provider.fetch_rows(settings.GOOGLE_SHEET_ID_BUSINESS, settings.GOOGLE_SHEET_TAB_OWNER)
                if rows:
                    content.update(normalize_row(rows[0]))
                    source = provider.name
                    break
            except Exception as exc:  # noqa: BLE001
                logger.warning("Content provider %s failed: %s", provider.name, exc)
        content["_meta"] = {"source": source, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        self._cache["business"] = {"ts": time.time(), "data": content}
        return content


content_service = ContentService()
