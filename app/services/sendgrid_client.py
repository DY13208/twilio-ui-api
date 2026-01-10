from typing import Dict, Optional, Tuple

from sendgrid import SendGridAPIClient
from sendgrid.helpers.eventwebhook import EventWebhook
from sendgrid.helpers.mail import Content, CustomArg, Email, Mail, Personalization, To

from app.config import settings


class SendGridService:
    def __init__(self) -> None:
        if not settings.sendgrid_api_key:
            raise RuntimeError("SENDGRID_API_KEY is not configured")
        if not settings.sendgrid_from_email:
            raise RuntimeError("SENDGRID_FROM_EMAIL is not configured")
        self._client = SendGridAPIClient(settings.sendgrid_api_key)

    def _from_email(self, from_email: Optional[str], from_name: Optional[str]) -> Email:
        email = from_email or settings.sendgrid_from_email
        name = from_name if from_name is not None else settings.sendgrid_from_name
        if name:
            return Email(email, name)
        return Email(email)

    def _reply_to_email(self) -> Optional[Email]:
        reply_to = (settings.sendgrid_reply_to or "").strip()
        if not reply_to:
            return None
        name = (settings.sendgrid_reply_to_name or "").strip()
        if name:
            return Email(reply_to, name)
        return Email(reply_to)

    def send_email(
        self,
        to_email: str,
        subject: str,
        text: Optional[str],
        html: Optional[str],
        custom_args: Optional[Dict[str, str]],
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ) -> Tuple[int, Optional[str]]:
        mail = Mail()
        mail.from_email = self._from_email(from_email, from_name)
        mail.subject = subject
        reply_to = self._reply_to_email()
        if reply_to:
            mail.reply_to = reply_to

        if html:
            if text:
                mail.add_content(Content("text/plain", text))
            mail.add_content(Content("text/html", html))
        else:
            mail.add_content(Content("text/plain", text or ""))

        personalization = Personalization()
        personalization.add_to(To(to_email))
        if custom_args:
            for key, value in custom_args.items():
                personalization.add_custom_arg(CustomArg(key, value))
        mail.add_personalization(personalization)

        response = self._client.send(mail)
        message_id = response.headers.get("X-Message-Id") or response.headers.get("X-Message-ID")
        return response.status_code, message_id

    def verify_webhook(self, payload: bytes, signature: str, timestamp: str, public_key: str) -> bool:
        return EventWebhook().verify_signature(public_key, payload, signature, timestamp)
