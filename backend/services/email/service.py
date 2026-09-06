import logging
from core.config import settings
from services.email.base import EmailProvider
from services.email.console_provider import ConsoleProvider
from services.email.resend_provider import ResendProvider
from services.email import templates

logger = logging.getLogger(__name__)


def build_provider() -> EmailProvider:
    if settings.EMAIL_PROVIDER == "resend" and settings.RESEND_API_KEY and settings.SENDER_EMAIL:
        return ResendProvider(settings.RESEND_API_KEY, settings.SENDER_EMAIL)
    if settings.EMAIL_PROVIDER == "resend":
        logger.warning("Resend selected but RESEND_API_KEY/SENDER_EMAIL missing; falling back to console provider")
    return ConsoleProvider()


class EmailService:
    """Provider-independent transactional email service. Never raises to callers."""

    def __init__(self, provider: EmailProvider):
        self.provider = provider

    async def send(self, to: str, subject: str, html: str) -> bool:
        try:
            message_id = await self.provider.send(to, subject, html)
            logger.info("Email sent via %s to %s (id=%s)", self.provider.name, to, message_id)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Email send failed via %s to %s: %s", self.provider.name, to, type(exc).__name__)
            return False

    async def send_verification_email(self, to: str, link: str) -> bool:
        return await self.send(to, "Verify your email - Madam Boutique", templates.verification_email(link))

    async def send_password_reset_email(self, to: str, link: str) -> bool:
        return await self.send(to, "Reset your password - Madam Boutique", templates.password_reset_email(link))

    async def send_welcome_email(self, to: str, name: str, customer_no: str) -> bool:
        return await self.send(to, "Welcome to Madam Boutique & Madam Fashions", templates.welcome_email(name, customer_no))


email_service = EmailService(build_provider())
