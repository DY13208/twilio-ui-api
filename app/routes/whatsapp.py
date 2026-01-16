"""WhatsApp messaging routes."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse
from uuid import uuid4
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import ApiKey, Customer, Message, WhatsAppSender
from app.schemas import (
    SendResponse,
    SendResult,
    WhatsAppSenderCreate,
    WhatsAppSenderUpsertResponse,
    WhatsAppSendersResponse,
    WhatsAppSendRequest,
    WhatsAppTemplateItem,
    WhatsAppTemplatesResponse,
)
from app.dependencies import require_api_key, ensure_twilio
from app.utils import normalize_whatsapp_sender, normalize_whatsapp_address
from app.services.twilio_client import normalize_whatsapp


router = APIRouter(tags=["whatsapp"])


def _list_whatsapp_senders(db: Session) -> List[str]:
    senders = set()
    if settings.twilio_whatsapp_from:
        senders.add(normalize_whatsapp(settings.twilio_whatsapp_from))
    db_senders = db.query(WhatsAppSender).all()
    for sender in db_senders:
        if sender.from_address:
            senders.add(normalize_whatsapp(sender.from_address))
    return sorted(senders)


def _resolve_whatsapp_sender(db: Session, from_address: Optional[str]) -> Optional[str]:
    if from_address:
        normalized = normalize_whatsapp_sender(from_address)
        if normalized in _list_whatsapp_senders(db):
            return normalized
        return None
    if settings.twilio_whatsapp_from:
        return normalize_whatsapp(settings.twilio_whatsapp_from)
    senders = _list_whatsapp_senders(db)
    return senders[0] if senders else None


def send_whatsapp_outbound(
    db: Session,
    *,
    twilio,
    recipient: str,
    body: Optional[str],
    batch_id: str,
    from_address: str,
    content_sid: Optional[str] = None,
    content_variables: Optional[Dict[str, Any]] = None,
    media_urls: Optional[List[str]] = None,
    use_proxy: Optional[bool] = None,
    marketing_campaign_id: Optional[int] = None,
    campaign_step_id: Optional[int] = None,
    message_template_id: Optional[int] = None,
    customer_id: Optional[int] = None,
) -> SendResult:
    stored_body = body
    if content_sid:
        stored_body = f"template:{content_sid} variables:{json.dumps(content_variables or {}, ensure_ascii=True)}"
    now = datetime.utcnow()
    message = Message(
        batch_id=batch_id,
        channel="whatsapp",
        to_address=recipient,
        from_address=from_address,
        subject=None,
        body=stored_body,
        status="queued",
        direction="outbound",
        marketing_campaign_id=marketing_campaign_id,
        campaign_step_id=campaign_step_id,
        message_template_id=message_template_id,
        customer_id=customer_id,
        created_at=now,
        updated_at=now,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    status_callback = None
    if settings.public_base_url:
        status_callback = (
            f"{settings.public_base_url.rstrip('/')}/webhooks/twilio/whatsapp"
            f"?local_id={message.id}"
        )

    try:
        message_sid = twilio.send_whatsapp(
            to_number=recipient,
            body=body if not content_sid else None,
            media_urls=media_urls if not content_sid else None,
            status_callback=status_callback,
            from_number=from_address,
            content_sid=content_sid,
            content_variables=content_variables,
            use_proxy=use_proxy,
        )
        message.provider_message_id = message_sid
    except Exception as exc:
        message.status = "failed"
        message.error = str(exc)

    message.updated_at = datetime.utcnow()
    db.add(message)

    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            customer.whatsapp_sent_count = (customer.whatsapp_sent_count or 0) + 1
            if marketing_campaign_id:
                customer.has_marketed = True
                customer.last_campaign_id = marketing_campaign_id
                customer.last_marketed_at = now
            customer.last_whatsapp_status = "failed" if message.status == "failed" else "sent"
            customer.updated_at = datetime.utcnow()
            db.add(customer)

    db.commit()

    return SendResult(
        message_id=message.id,
        recipient=recipient,
        status=message.status,
        provider_message_id=message.provider_message_id,
        error=message.error,
    )


def _extract_page_token(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parsed = urlparse(url)
    params = parse_qs(parsed.query or "")
    token = params.get("PageToken") or params.get("page_token")
    if token:
        return token[0]
    return None


@router.get("/api/whatsapp/senders", response_model=WhatsAppSendersResponse)
def list_whatsapp_senders(
    db: Session = Depends(get_db), _: ApiKey = Depends(require_api_key("read"))
) -> WhatsAppSendersResponse:
    return WhatsAppSendersResponse(senders=_list_whatsapp_senders(db))


@router.get("/api/whatsapp/templates", response_model=WhatsAppTemplatesResponse)
def list_whatsapp_templates(
    limit: int = 50,
    page_token: Optional[str] = None,
    search: Optional[str] = None,
    use_proxy: Optional[bool] = None,
    _: ApiKey = Depends(require_api_key("read")),
) -> WhatsAppTemplatesResponse:
    twilio = ensure_twilio()
    try:
        data = twilio.list_templates(page_size=limit, page_token=page_token, use_proxy=use_proxy)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    raw_items = data.get("contents") or data.get("content") or data.get("results") or []
    meta = data.get("meta") or {}
    next_page_token = meta.get("next_page_token") or _extract_page_token(
        meta.get("next_page_url") or meta.get("next_page_uri")
    )
    previous_page_token = meta.get("previous_page_token") or _extract_page_token(
        meta.get("previous_page_url") or meta.get("previous_page_uri")
    )
    search_value = (search or "").strip().lower()

    templates: List[WhatsAppTemplateItem] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        sid = item.get("sid") or item.get("content_sid") or item.get("id")
        if not sid:
            continue
        friendly_name = item.get("friendly_name") or item.get("friendlyName") or item.get("name")
        language = item.get("language")
        types_value = item.get("types")
        types_list: Optional[List[str]] = None
        if isinstance(types_value, dict):
            types_list = list(types_value.keys())
        elif isinstance(types_value, list):
            types_list = [str(value) for value in types_value]
        elif isinstance(types_value, str):
            types_list = [types_value]
        if search_value:
            name_value = (friendly_name or "").lower()
            if search_value not in name_value and search_value not in sid.lower():
                continue
        templates.append(
            WhatsAppTemplateItem(
                sid=sid,
                friendly_name=friendly_name,
                language=language,
                types=types_list,
            )
        )

    return WhatsAppTemplatesResponse(
        templates=templates,
        next_page_token=next_page_token,
        previous_page_token=previous_page_token,
    )


@router.post("/api/whatsapp/senders", response_model=WhatsAppSenderUpsertResponse)
def add_whatsapp_sender(
    request: WhatsAppSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> WhatsAppSenderUpsertResponse:
    normalized = normalize_whatsapp_sender(request.from_address)
    default_sender = (
        normalize_whatsapp(settings.twilio_whatsapp_from)
        if settings.twilio_whatsapp_from
        else None
    )
    status = "exists"
    if normalized != default_sender:
        existing = db.query(WhatsAppSender).filter(WhatsAppSender.from_address == normalized).first()
        if not existing:
            db.add(WhatsAppSender(from_address=normalized, created_at=datetime.utcnow()))
            db.commit()
            status = "added"
    return WhatsAppSenderUpsertResponse(
        from_address=normalized,
        status=status,
        senders=_list_whatsapp_senders(db),
    )


@router.delete("/api/whatsapp/senders", response_model=WhatsAppSenderUpsertResponse)
def delete_whatsapp_sender(
    request: WhatsAppSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> WhatsAppSenderUpsertResponse:
    normalized = normalize_whatsapp_sender(request.from_address)
    default_sender = (
        normalize_whatsapp(settings.twilio_whatsapp_from)
        if settings.twilio_whatsapp_from
        else None
    )
    status = "not_found"
    if normalized == default_sender:
        status = "protected"
    else:
        existing = db.query(WhatsAppSender).filter(WhatsAppSender.from_address == normalized).first()
        if existing:
            db.delete(existing)
            db.commit()
            status = "deleted"
    return WhatsAppSenderUpsertResponse(
        from_address=normalized,
        status=status,
        senders=_list_whatsapp_senders(db),
    )


@router.post("/api/send/whatsapp", response_model=SendResponse)
def send_whatsapp(
    request: WhatsAppSendRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SendResponse:
    twilio = ensure_twilio()
    batch_id = uuid4().hex
    results: List[SendResult] = []

    selected_from = _resolve_whatsapp_sender(db, request.from_address)
    if request.from_address and not selected_from:
        raise HTTPException(status_code=400, detail="from_address is not in whitelist")
    if not selected_from:
        raise HTTPException(status_code=400, detail="TWILIO_WHATSAPP_FROM is not configured")
    if not request.body and not request.content_sid:
        raise HTTPException(status_code=400, detail="body or content_sid is required")
    if request.content_variables and not request.content_sid:
        raise HTTPException(
            status_code=400, detail="content_sid is required when content_variables is set"
        )

    for recipient in request.recipients:
        normalized_recipient = normalize_whatsapp_address(recipient)
        result = send_whatsapp_outbound(
            db,
            twilio=twilio,
            recipient=normalized_recipient,
            body=request.body,
            batch_id=batch_id,
            from_address=selected_from,
            content_sid=request.content_sid,
            content_variables=request.content_variables,
            media_urls=request.media_urls,
            use_proxy=request.use_proxy,
        )
        results.append(
            SendResult(
                message_id=result.message_id,
                recipient=recipient,
                status=result.status,
                provider_message_id=result.provider_message_id,
                error=result.error,
            )
        )

    return SendResponse(batch_id=batch_id, channel="whatsapp", results=results)
