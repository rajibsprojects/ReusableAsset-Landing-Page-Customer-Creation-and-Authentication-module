import csv
import io
import httpx
from services.content.base import ContentProvider


class PublicSheetProvider(ContentProvider):
    """Reads a Google Sheet shared as 'Anyone with the link' via the CSV export endpoint. Dev convenience only."""
    name = "public_sheet"

    async def fetch_rows(self, sheet_id: str, tab: str) -> list[dict]:
        url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, params={"tqx": "out:csv", "sheet": tab})
        resp.raise_for_status()
        if "text/csv" not in resp.headers.get("content-type", ""):
            raise RuntimeError("Sheet is not publicly readable")
        reader = csv.DictReader(io.StringIO(resp.text))
        return [{k: v for k, v in row.items() if k} for row in reader]
