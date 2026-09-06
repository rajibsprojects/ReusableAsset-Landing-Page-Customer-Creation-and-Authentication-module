import logging
from services.email.base import EmailProvider

logger = logging.getLogger(__name__)


class ConsoleProvider(EmailProvider):
    name = "console"

    async def send(self, to: str, subject: str, html: str) -> str:
        logger.info("[EMAIL:console] to=%s subject=%s\n%s", to, subject, html)
        return "console"
