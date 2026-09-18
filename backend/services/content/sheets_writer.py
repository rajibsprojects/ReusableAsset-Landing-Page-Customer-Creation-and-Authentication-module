import logging
import httpx
from core.config import settings

logger = logging.getLogger(__name__)


class SheetsWriter:
    """Write access to Google Sheets through the Apps Script Web App (see /google-apps-script/Code.gs)."""

    def __init__(self, url: str, api_key: str = ""):
        self.url = url
        self.api_key = api_key

    @property
    def configured(self) -> bool:
        return bool(self.url)

    async def call(self, payload: dict) -> dict:
        if not self.configured:
            raise RuntimeError("APPS_SCRIPT_URL is not configured")
        if self.api_key:
            payload["key"] = self.api_key
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.post(self.url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("error", "Apps Script returned an error"))
        return data

    async def upsert_row(self, sheet_id: str, tab: str, key_column: str, row: dict) -> dict:
        return await self.call({"action": "upsertRow", "sheetId": sheet_id, "tab": tab, "keyColumn": key_column, "row": row})

    async def append_rows(self, sheet_id: str, tab: str, rows: list[list]) -> dict:
        return await self.call({"action": "appendRows", "sheetId": sheet_id, "tab": tab, "rows": rows})


sheets_writer = SheetsWriter(settings.APPS_SCRIPT_URL, settings.APPS_SCRIPT_API_KEY)
