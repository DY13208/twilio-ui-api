import base64
import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, ProxyHandler, build_opener, urlopen

from twilio.http.http_client import TwilioHttpClient
from twilio.request_validator import RequestValidator
from twilio.rest import Client

from app.config import settings


def normalize_whatsapp(value: str) -> str:
    if value.startswith("whatsapp:"):
        return value
    return f"whatsapp:{value}"


class TwilioService:
    def __init__(self) -> None:
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            raise RuntimeError("Twilio credentials are not configured")
        self._client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self._client_no_proxy: Optional[Client] = None
        self._validator = RequestValidator(settings.twilio_auth_token)

    @property
    def from_number(self) -> str:
        if not settings.twilio_whatsapp_from:
            raise RuntimeError("TWILIO_WHATSAPP_FROM is not configured")
        return normalize_whatsapp(settings.twilio_whatsapp_from)

    def sms_from_number(self) -> Optional[str]:
        if settings.twilio_sms_from:
            return settings.twilio_sms_from
        return None

    def _get_client(self, use_proxy: Optional[bool]) -> Client:
        if use_proxy is False:
            if self._client_no_proxy is None:
                http_client = TwilioHttpClient()
                if http_client.session is not None:
                    http_client.session.trust_env = False
                self._client_no_proxy = Client(
                    settings.twilio_account_sid,
                    settings.twilio_auth_token,
                    http_client=http_client,
                )
            return self._client_no_proxy
        return self._client

    def send_whatsapp(
        self,
        to_number: str,
        body: Optional[str],
        media_urls: Optional[List[str]],
        status_callback: Optional[str],
        from_number: Optional[str] = None,
        content_sid: Optional[str] = None,
        content_variables: Optional[Dict[str, Any]] = None,
        use_proxy: Optional[bool] = None,
    ) -> str:
        from_value = normalize_whatsapp(from_number) if from_number else self.from_number
        payload = {
            "to": normalize_whatsapp(to_number),
            "from_": from_value,
        }
        if status_callback:
            payload["status_callback"] = status_callback
        if body:
            payload["body"] = body
        if media_urls:
            payload["media_url"] = media_urls
        if content_sid:
            payload["content_sid"] = content_sid
        if content_variables is not None:
            payload["content_variables"] = json.dumps(content_variables)
        client = self._get_client(use_proxy)
        message = client.messages.create(**payload)
        return message.sid

    def send_sms(
        self,
        to_number: str,
        body: str,
        status_callback: Optional[str],
        from_number: Optional[str] = None,
        messaging_service_sid: Optional[str] = None,
        use_proxy: Optional[bool] = None,
    ) -> str:
        payload: Dict[str, Any] = {
            "to": to_number,
            "body": body,
        }
        if messaging_service_sid:
            payload["messaging_service_sid"] = messaging_service_sid
        else:
            from_value = from_number or self.sms_from_number()
            if not from_value:
                raise RuntimeError("TWILIO_SMS_FROM is not configured")
            payload["from_"] = from_value
        if status_callback:
            payload["status_callback"] = status_callback
        client = self._get_client(use_proxy)
        message = client.messages.create(**payload)
        return message.sid

    def fetch_message(self, message_sid: str, use_proxy: Optional[bool] = None) -> Any:
        client = self._get_client(use_proxy)
        return client.messages(message_sid).fetch()

    def validate_webhook(self, url: str, params: dict, signature: str) -> bool:
        return self._validator.validate(url, params, signature)

    def list_templates(
        self,
        page_size: int = 50,
        page_token: Optional[str] = None,
        use_proxy: Optional[bool] = None,
    ) -> Dict[str, Any]:
        query_params = {"PageSize": max(1, min(page_size, 200))}
        if page_token:
            query_params["PageToken"] = page_token
        query = urlencode(query_params)
        url = f"https://content.twilio.com/v1/Content?{query}"
        auth_raw = f"{settings.twilio_account_sid}:{settings.twilio_auth_token}".encode("utf-8")
        auth_value = base64.b64encode(auth_raw).decode("ascii")
        request = Request(
            url,
            headers={
                "Authorization": f"Basic {auth_value}",
                "Accept": "application/json",
            },
            method="GET",
        )
        if use_proxy is False:
            opener = build_opener(ProxyHandler({}))
            with opener.open(request, timeout=10) as response:
                payload = response.read().decode("utf-8")
        else:
            with urlopen(request, timeout=10) as response:
                payload = response.read().decode("utf-8")
        data = json.loads(payload or "{}")
        return data
