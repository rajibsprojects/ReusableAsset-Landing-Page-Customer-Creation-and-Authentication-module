import asyncio
import resend
from services.email.base import EmailProvider


class ResendProvider(EmailProvider):
    name = "resend"

    def __init__(self, api_key: str, sender: str):
        resend.api_key = api_key
        self.sender = sender

    async def send(self, to: str, subject: str, html: str, reply_to: str | None = None) -> str:
        params = {"from": self.sender, "to": [to], "subject": subject, "html": html}
        if reply_to:
            params["reply_to"] = reply_to
        result = await asyncio.to_thread(resend.Emails.send, params)
        return (result or {}).get("id", "")
