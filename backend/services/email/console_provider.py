import logging
from services.email.base import EmailProvider

logger = logging.getLogger(__name__)


class ConsoleProvider(EmailProvider):
    name = "console"

    async def send(self, to: str, subject: str, html: str, reply_to: str | None = None) -> str:
        logger.info("[EMAIL:console] to=%s reply_to=%s subject=%s\n%s", to, reply_to, subject, html)
        return "console"
