"""Common utility functions for data transformation and validation."""
from datetime import datetime
import html as html_lib
import json
import posixpath
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Customer,
    SmsBlacklist,
    SmsContact,
    SmsGroupMember,
    SmsKeywordRule,
    SmsOptOut,
)
from app.services.twilio_client import normalize_whatsapp


# URL utilities
def public_url(request: Request) -> str:
    base = settings.public_base_url
    if base:
        base = base.rstrip("/")
        return f"{base}{request.url.path}" + (f"?{request.url.query}" if request.url.query else "")
    return str(request.url)


def login_redirect_path(request: Request) -> str:
    path = request.url.path or "/"
    base_dir = posixpath.dirname(path) or "/"
    return posixpath.relpath("/login", base_dir)


# JSON serialization
def serialize_json_list(values: Optional[List[Any]]) -> Optional[str]:
    if not values:
        return None
    cleaned = [value for value in values if value not in (None, "")]
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=True)


def serialize_json_dict(values: Optional[Dict[str, Any]]) -> Optional[str]:
    if not values:
        return None
    cleaned = {str(k): v for k, v in values.items() if k not in (None, "")}
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=True)


def deserialize_json_list(value: Optional[str]) -> List[Any]:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return data
    return []


def deserialize_json_dict(value: Optional[str]) -> Dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return {}
    if isinstance(data, dict):
        return data
    return {}


# Tags handling
def serialize_tags(tags: Optional[List[str]]) -> Optional[str]:
    if not tags:
        return None
    cleaned = sorted({tag.strip() for tag in tags if tag and tag.strip()})
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=True)


def deserialize_tags(value: Optional[str]) -> List[str]:
    if not value:
        return []
    items = deserialize_json_list(value)
    if items:
        return [str(item).strip() for item in items if str(item).strip()]
    return [part.strip() for part in value.split(",") if part.strip()]


# Phone normalization
def normalize_sms_phone(value: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="phone is required")
    cleaned = cleaned.replace("whatsapp:", "").strip()
    if cleaned.startswith("+"):
        digits = re.sub(r"\D", "", cleaned)
        if not digits:
            raise HTTPException(status_code=400, detail="phone is invalid")
        return f"+{digits}"
    digits = re.sub(r"\D", "", cleaned)
    if not digits:
        raise HTTPException(status_code=400, detail="phone is invalid")
    default_cc = (settings.sms_default_country_code or "").lstrip("+")
    if default_cc:
        if digits.startswith(default_cc):
            return f"+{digits}"
        return f"+{default_cc}{digits}"
    return f"+{digits}"


def normalize_sms_phones(values: List[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        normalized = normalize_sms_phone(value)
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


# Address normalization
def normalize_whatsapp_sender(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="from_address is required")
    return normalize_whatsapp(cleaned)


def normalize_whatsapp_address(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="address is required")
    return normalize_whatsapp(cleaned)


def normalize_email_sender(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="from_email is required")
    return cleaned.lower()


# Customer normalization
def normalize_customer_email(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def normalize_customer_whatsapp(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return normalize_whatsapp_address(cleaned)


def normalize_customer_mobile(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return normalize_sms_phone(cleaned)


def require_customer_contact(
    email: Optional[str], whatsapp: Optional[str], mobile: Optional[str]
) -> None:
    if not email and not whatsapp and not mobile:
        raise HTTPException(
            status_code=400,
            detail="email, whatsapp, or mobile is required",
        )


# Template rendering
_PLACEHOLDER_PATTERN = re.compile(r"{{\s*([a-zA-Z0-9_.-]+)\s*}}")


def render_message_template(template: str, context: Dict[str, Any]) -> str:
    if not template:
        return template

    def replace(match: re.Match) -> str:
        key = match.group(1)
        value = context.get(key)
        if value is None:
            return match.group(0)
        return str(value)

    return _PLACEHOLDER_PATTERN.sub(replace, template)


class _SafeFormatDict(dict):
    def __missing__(self, key: str) -> str:
        return f"{{{key}}}"


def render_sms_body(template: str, variables: Optional[Dict[str, Any]]) -> str:
    if not variables:
        return template
    safe_vars = {str(key): str(value) for key, value in variables.items()}
    return template.format_map(_SafeFormatDict(safe_vars))


# SMS utilities
def append_opt_out_text(body: str, append_opt_out: bool) -> str:
    if not append_opt_out:
        return body
    if not settings.sms_append_opt_out:
        return body
    suffix = (settings.sms_opt_out_text or "").strip()
    if not suffix:
        return body
    if suffix in body:
        return body
    return f"{body}\n{suffix}".strip()


def build_sms_status_callback(message_id: int) -> Optional[str]:
    if not settings.public_base_url:
        return None
    base = settings.public_base_url.rstrip("/")
    return f"{base}/webhooks/twilio/sms/status?local_id={message_id}"


def is_opted_out(db: Session, phone: str) -> Optional[str]:
    if db.query(SmsBlacklist).filter(SmsBlacklist.phone == phone).first():
        return "blacklist"
    if db.query(SmsOptOut).filter(SmsOptOut.phone == phone).first():
        return "opt_out"
    return None


def match_keyword(rule: SmsKeywordRule, text: str) -> bool:
    keyword = (rule.keyword or "").strip()
    if not keyword:
        return False
    text_value = text.strip()
    match_type = (rule.match_type or "contains").lower()
    if match_type == "exact":
        return text_value.lower() == keyword.lower()
    if match_type == "regex":
        try:
            return re.search(keyword, text_value, re.IGNORECASE) is not None
        except re.error:
            return False
    return keyword.lower() in text_value.lower()


def collect_sms_recipients(
    db: Session,
    recipients: Optional[List[str]] = None,
    group_ids: Optional[List[int]] = None,
    tags: Optional[List[str]] = None,
) -> Tuple[List[str], Dict[str, SmsContact]]:
    phones: List[str] = []
    contact_map: Dict[str, SmsContact] = {}
    if recipients:
        for phone in normalize_sms_phones(recipients):
            phones.append(phone)
    if group_ids:
        members = (
            db.query(SmsContact)
            .join(SmsGroupMember, SmsGroupMember.contact_id == SmsContact.id)
            .filter(SmsGroupMember.group_id.in_(group_ids), SmsContact.disabled_at.is_(None))
            .all()
        )
        for contact in members:
            phones.append(contact.phone)
            contact_map[contact.phone] = contact
    if tags:
        tag_set = {tag.strip().lower() for tag in tags if tag and tag.strip()}
        if tag_set:
            contacts = db.query(SmsContact).filter(SmsContact.disabled_at.is_(None)).all()
            for contact in contacts:
                contact_tags = {tag.lower() for tag in deserialize_tags(contact.tags)}
                if contact_tags.intersection(tag_set):
                    phones.append(contact.phone)
                    contact_map[contact.phone] = contact
    unique = []
    seen = set()
    for phone in phones:
        normalized = normalize_sms_phone(phone)
        if normalized in seen:
            continue
        seen.add(normalized)
        unique.append(normalized)
    return unique, contact_map


# Customer filtering
def parse_rule_tags(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def filter_customers_by_rules(
    customers: List[Customer], rules: Optional[Dict[str, Any]]
) -> List[Customer]:
    if not rules:
        return customers
    country = str(rules.get("country") or "").strip().lower()
    country_code = str(rules.get("country_code") or "").strip().lower()
    has_marketed = rules.get("has_marketed")
    tag_list = parse_rule_tags(rules.get("tags") or rules.get("tag"))
    tag_set = {tag.lower() for tag in tag_list if tag}
    last_email_status = str(rules.get("last_email_status") or "").strip().lower()
    last_whatsapp_status = str(rules.get("last_whatsapp_status") or "").strip().lower()
    last_sms_status = str(rules.get("last_sms_status") or "").strip().lower()
    email_value = normalize_customer_email(rules.get("email"))
    whatsapp_value = normalize_customer_whatsapp(rules.get("whatsapp"))
    mobile_value = normalize_customer_mobile(rules.get("mobile"))

    filtered: List[Customer] = []
    for customer in customers:
        if country and (customer.country or "").strip().lower() != country:
            continue
        if country_code and (customer.country_code or "").strip().lower() != country_code:
            continue
        if has_marketed is not None and bool(customer.has_marketed) != bool(has_marketed):
            continue
        if last_email_status and (customer.last_email_status or "").strip().lower() != last_email_status:
            continue
        if last_whatsapp_status and (customer.last_whatsapp_status or "").strip().lower() != last_whatsapp_status:
            continue
        if last_sms_status and (customer.last_sms_status or "").strip().lower() != last_sms_status:
            continue
        if email_value and (customer.email or "").strip().lower() != email_value:
            continue
        if whatsapp_value and (customer.whatsapp or "").strip().lower() != whatsapp_value:
            continue
        if mobile_value and (customer.mobile or "").strip().lower() != mobile_value:
            continue
        if tag_set:
            customer_tags = {tag.lower() for tag in deserialize_tags(customer.tags)}
            if not customer_tags.intersection(tag_set):
                continue
        filtered.append(customer)
    return filtered


def build_customer_context(customer: Customer) -> Dict[str, Any]:
    return {
        "id": customer.id,
        "name": customer.name or "",
        "email": customer.email or "",
        "whatsapp": customer.whatsapp or "",
        "mobile": customer.mobile or "",
        "country": customer.country or "",
        "country_code": customer.country_code or "",
        "tags": ", ".join(deserialize_tags(customer.tags)),
    }


# Text transformation
def text_to_html(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    escaped = html_lib.escape(normalized)
    escaped = escaped.replace("\n", "<br>")
    return f"<html><body>{escaped}</body></html>"


# Form utilities
def get_form_value(form: Any, key: str) -> Optional[str]:
    value = form.get(key)
    if isinstance(value, str):
        return value
    return None


# Pydantic helpers
def field_is_set(payload: Any, name: str) -> bool:
    if hasattr(payload, "model_fields_set"):
        return name in payload.model_fields_set
    if hasattr(payload, "__fields_set__"):
        return name in payload.__fields_set__
    return False
