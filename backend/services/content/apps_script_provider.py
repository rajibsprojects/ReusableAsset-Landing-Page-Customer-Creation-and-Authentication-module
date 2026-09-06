import httpx
from services.content.base import ContentProvider


class AppsScriptProvider(ContentProvider):
    """Google Apps Script Web App acting as the Sheets/Drive API layer (see /google-apps-script/Code.gs)."""
    name = "apps_script"

    def __init__(self, url: str, api_key: str = ""):
        self.url = url
        self.api_key = api_key

    async def fetch_rows(self, sheet_id: str, tab: str) -> list[dict]:
        params = {"action": "getSheet", "sheetId": sheet_id, "tab": tab}
        if self.api_key:
            params["key"] = self.api_key
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(self.url, params=params)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("error", "Apps Script returned an error"))
        return data.get("rows", [])
