from abc import ABC, abstractmethod


class EmailProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def send(self, to: str, subject: str, html: str, reply_to: str | None = None) -> str:
        """Send an email and return the provider message id."""
