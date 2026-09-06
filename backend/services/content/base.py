from abc import ABC, abstractmethod


class ContentProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def fetch_rows(self, sheet_id: str, tab: str) -> list[dict]:
        """Return sheet rows as a list of {header: value} dicts."""
