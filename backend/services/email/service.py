import logging
from core.config import settings
from services.email.base import EmailProvider
from services.email.console_provider import ConsoleProvider
from services.email.resend_provider import ResendProvider
from services.email import templates
from services.content.service import content_service

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

    async def send(self, to: str, subject: str, html: str, reply_to: str | None = None) -> bool:
        try:
            message_id = await self.provider.send(to, subject, html, reply_to)
            logger.info("Email sent via %s to %s reply_to=%s (id=%s)", self.provider.name, to, reply_to, message_id)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.error("Email send failed via %s to %s: %s", self.provider.name, to, type(exc).__name__)
            return False

    async def owner_email(self) -> str:
        """Business owner's address from business_owner_data (Owner_Data.business_email_address); .env fallback."""
        try:
            content = await content_service.get_business_content()
            sheet_email = (content.get("business_email_address") or "").strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not read business_email_address from sheet: %s", exc)
            sheet_email = ""
        return sheet_email or settings.BUSINESS_NOTIFY_EMAIL

    async def send_verification_email(self, to: str, link: str) -> bool:
        return await self.send(to, "Verify your email - Madam Boutique", templates.verification_email(link), await self.owner_email())

    async def send_password_reset_email(self, to: str, link: str) -> bool:
        return await self.send(to, "Reset your password - Madam Boutique", templates.password_reset_email(link), await self.owner_email())

    async def send_welcome_email(self, to: str, name: str, customer_no: str) -> bool:
        return await self.send(to, "Welcome to Madam Boutique & Madam Fashions", templates.welcome_email(name, customer_no), await self.owner_email())

    async def send_new_customer_notification(self, user: dict) -> bool:
        owner = await self.owner_email()
        if not owner:
            logger.warning("No business_email_address in sheet and BUSINESS_NOTIFY_EMAIL not configured; owner notification skipped")
            return False
        mobile = f"{user.get('contact_mobile_cntry') or ''} {user.get('contact_mobile') or ''}".strip()
        html = templates.new_customer_notification(user.get("name", ""), user.get("email", ""), mobile, user.get("customer_no", ""))
        subject = f"New Customer: {user.get('name', '')} ({user.get('customer_no', '')}) — Madam Fashions"
        return await self.send(owner, subject, html, user.get("email"))


email_service = EmailService(build_provider())
