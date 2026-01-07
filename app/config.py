from dataclasses import dataclass
import os
from typing import Optional

from dotenv import load_dotenv


load_dotenv()


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_optional_bool(name: str) -> Optional[bool]:
    value = os.getenv(name)
    if value is None or value == "":
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    public_base_url: Optional[str]
    twilio_account_sid: Optional[str]
    twilio_auth_token: Optional[str]
    twilio_whatsapp_from: Optional[str]
    twilio_sms_from: Optional[str]
    twilio_sms_messaging_service_sid: Optional[str]
    twilio_validate_webhook_signature: bool
    admin_username: Optional[str]
    admin_password: Optional[str]
    admin_jwt_secret: Optional[str]
    admin_session_ttl_minutes: int
    admin_cookie_secure: Optional[bool]
    sendgrid_api_key: Optional[str]
    sendgrid_from_email: Optional[str]
    sendgrid_from_name: Optional[str]
    sendgrid_event_webhook_verify: bool
    sendgrid_event_webhook_public_key: Optional[str]
    sms_default_country_code: Optional[str]
    sms_append_opt_out: bool
    sms_opt_out_text: Optional[str]
    sms_help_text: Optional[str]
    sms_auto_reply_enabled: bool
    sms_scheduler_enabled: bool
    sms_scheduler_interval_seconds: int
    sms_default_rate_per_minute: int
    sms_default_batch_size: int


settings = Settings(
    database_url=_require("DATABASE_URL"),
    public_base_url=os.getenv("PUBLIC_BASE_URL"),
    twilio_account_sid=os.getenv("TWILIO_ACCOUNT_SID"),
    twilio_auth_token=os.getenv("TWILIO_AUTH_TOKEN"),
    twilio_whatsapp_from=os.getenv("TWILIO_WHATSAPP_FROM"),
    twilio_sms_from=os.getenv("TWILIO_SMS_FROM"),
    twilio_sms_messaging_service_sid=os.getenv("TWILIO_SMS_MESSAGING_SERVICE_SID"),
    twilio_validate_webhook_signature=_get_bool("TWILIO_VALIDATE_WEBHOOK_SIGNATURE", False),
    admin_username=os.getenv("ADMIN_USERNAME"),
    admin_password=os.getenv("ADMIN_PASSWORD"),
    admin_jwt_secret=os.getenv("ADMIN_JWT_SECRET"),
    admin_session_ttl_minutes=_get_int("ADMIN_SESSION_TTL_MINUTES", 720),
    admin_cookie_secure=_get_optional_bool("ADMIN_COOKIE_SECURE"),
    sendgrid_api_key=os.getenv("SENDGRID_API_KEY"),
    sendgrid_from_email=os.getenv("SENDGRID_FROM_EMAIL"),
    sendgrid_from_name=os.getenv("SENDGRID_FROM_NAME"),
    sendgrid_event_webhook_verify=_get_bool("SENDGRID_EVENT_WEBHOOK_VERIFY", False),
    sendgrid_event_webhook_public_key=os.getenv("SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY"),
    sms_default_country_code=os.getenv("SMS_DEFAULT_COUNTRY_CODE", "86"),
    sms_append_opt_out=_get_bool("SMS_APPEND_OPT_OUT", True),
    sms_opt_out_text=os.getenv("SMS_OPT_OUT_TEXT", "回复T退订"),
    sms_help_text=os.getenv("SMS_HELP_TEXT", "如需退订请回复 T"),
    sms_auto_reply_enabled=_get_bool("SMS_AUTO_REPLY_ENABLED", True),
    sms_scheduler_enabled=_get_bool("SMS_SCHEDULER_ENABLED", True),
    sms_scheduler_interval_seconds=_get_int("SMS_SCHEDULER_INTERVAL_SECONDS", 15),
    sms_default_rate_per_minute=_get_int("SMS_DEFAULT_RATE_PER_MINUTE", 30),
    sms_default_batch_size=_get_int("SMS_DEFAULT_BATCH_SIZE", 100),
)
