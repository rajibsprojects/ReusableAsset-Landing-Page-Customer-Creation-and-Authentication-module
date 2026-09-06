import json
from pathlib import Path
from services.content.base import ContentProvider

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class LocalProvider(ContentProvider):
    name = "local"

    async def fetch_rows(self, sheet_id: str, tab: str) -> list[dict]:
        path = DATA_DIR / "business_owner_data.json"
        return [json.loads(path.read_text(encoding="utf-8"))]
