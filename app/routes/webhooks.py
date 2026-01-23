"""Webhook handlers for Twilio and SendGrid."""
from datetime import datetime
import hashlib
import hmac
import json
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db, SessionLocal
from app.models import Customer, Message, SmsKeywordRule, SmsOptOut, AppSetting
from app.utils import get_form_value, match_keyword, normalize_sms_phone


router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_sendgrid_webhook_log_lock = threading.Lock()
SENDGRID_LOG_ENABLED_KEY = "sendgrid_webhook_log_enabled"
SENDGRID_LOG_MAX_LINES_KEY = "sendgrid_webhook_log_max_lines"
SENDGRID_LOG_AUTO_CLOSE_KEY = "sendgrid_webhook_log_auto_close"


def _get_setting_value(db: Session, key: str) -> Optional[str]:
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    return setting.value if setting else None


def _parse_setting_bool(value: Optional[str]) -> bool:
    if not value:
        return False
    return value.lower() in {"true", "1", "yes", "on"}


def _parse_setting_int(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        result = int(value)
        return result if result > 0 else None
    except ValueError:
        return None


def _set_setting_values(db: Session, values: Dict[str, Optional[str]]) -> None:
    for key, value in values.items():
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if value is None:
            if setting:
                db.delete(setting)
        else:
            if setting:
                setting.value = value
                setting.updated_at = datetime.utcnow()
                db.add(setting)
            else:
                db.add(
                    AppSetting(
                        key=key,
                        value=value,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                )
    db.commit()


@router.post("/twilio/whatsapp")
async def twilio_whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Twilio WhatsApp status updates and inbound messages."""
    local_id = request.query_params.get("local_id")
    form = await request.form()
    
    message_status = get_form_value(form, "MessageStatus")
    message_sid = get_form_value(form, "MessageSid")
    error_code = get_form_value(form, "ErrorCode")
    error_message = get_form_value(form, "ErrorMessage")
    body = get_form_value(form, "Body")
    from_address = get_form_value(form, "From")
    to_address = get_form_value(form, "To")
    
    now = datetime.utcnow()
    
    # Status update
    if local_id and message_status:
        message = db.query(Message).filter(Message.id == int(local_id)).first()
        if message:
            message.status = message_status
            if error_code:
                message.error = f"{error_code}: {error_message or ''}"
            message.updated_at = now
            db.add(message)
            
            if message.customer_id:
                customer = db.query(Customer).filter(Customer.id == message.customer_id).first()
                if customer:
                    customer.last_whatsapp_status = message_status
                    customer.updated_at = now
                    db.add(customer)
            db.commit()
    
    # Inbound message
    if body and from_address:
        inbound = Message(
            channel="whatsapp",
            to_address=to_address,
            from_address=from_address,
            body=body,
            status="received",
            direction="inbound",
            provider_message_id=message_sid,
            created_at=now,
            updated_at=now,
        )
        db.add(inbound)
        db.commit()
    
    return PlainTextResponse("OK")


@router.post("/twilio/sms/status")
async def twilio_sms_status_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Twilio SMS status updates."""
    local_id = request.query_params.get("local_id")
    form = await request.form()
    
    message_status = get_form_value(form, "MessageStatus")
    error_code = get_form_value(form, "ErrorCode")
    error_message = get_form_value(form, "ErrorMessage")
    price = get_form_value(form, "Price")
    price_unit = get_form_value(form, "PriceUnit")
    num_segments = get_form_value(form, "NumSegments")
    
    if not local_id or not message_status:
        return PlainTextResponse("OK")
    
    try:
        message_id = int(local_id)
    except (TypeError, ValueError):
        return PlainTextResponse("OK")
    
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        return PlainTextResponse("OK")
    
    now = datetime.utcnow()
    message.status = message_status
    if error_code:
        message.error = f"{error_code}: {error_message or ''}"
    if price:
        try:
            message.price = float(price)
        except ValueError:
            pass
    if price_unit:
        message.price_unit = price_unit
    if num_segments:
        try:
            message.num_segments = int(num_segments)
        except ValueError:
            pass
    message.updated_at = now
    db.add(message)
    
    if message.customer_id:
        customer = db.query(Customer).filter(Customer.id == message.customer_id).first()
        if customer:
            customer.last_sms_status = message_status
            customer.updated_at = now
            db.add(customer)
    
    db.commit()
    return PlainTextResponse("OK")


@router.post("/twilio/sms/inbound")
async def twilio_sms_inbound_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Twilio SMS inbound messages."""
    form = await request.form()
    
    body = get_form_value(form, "Body")
    from_address = get_form_value(form, "From")
    to_address = get_form_value(form, "To")
    message_sid = get_form_value(form, "MessageSid")
    
    if not body or not from_address:
        return PlainTextResponse("OK")
    
    now = datetime.utcnow()
    
    # Check for opt-out keywords
    body_lower = body.strip().lower()
    opt_out_keywords = {"stop", "unsubscribe", "cancel", "end", "quit"}
    if body_lower in opt_out_keywords:
        phone = normalize_sms_phone(from_address)
        existing = db.query(SmsOptOut).filter(SmsOptOut.phone == phone).first()
        if not existing:
            db.add(SmsOptOut(
                phone=phone,
                reason="opt-out via sms",
                source="sms_inbound",
                created_at=now,
            ))
            db.commit()
    
    # Store inbound message
    inbound = Message(
        channel="sms",
        to_address=to_address,
        from_address=from_address,
        body=body,
        status="received",
        direction="inbound",
        provider_message_id=message_sid,
        created_at=now,
        updated_at=now,
    )
    db.add(inbound)
    db.commit()
    
    # Check for auto-reply rules
    rules = (
        db.query(SmsKeywordRule)
        .filter(SmsKeywordRule.enabled.is_(True))
        .all()
    )
    for rule in rules:
        if match_keyword(rule, body) and rule.response_text:
            from app.routes.sms import send_sms_outbound
            from app.dependencies import ensure_twilio
            twilio = ensure_twilio()
            from_number = settings.twilio_sms_from
            messaging_service_sid = settings.twilio_sms_messaging_service_sid
            if from_number or messaging_service_sid:
                send_sms_outbound(
                    db,
                    twilio=twilio,
                    recipient=from_address,
                    body=rule.response_text,
                    batch_id=f"auto_reply_{inbound.id}",
                    from_number=from_number,
                    messaging_service_sid=messaging_service_sid,
                    append_opt_out_flag=False,
                )
            break
    
    return PlainTextResponse("OK")


@router.post("/sendgrid")
async def sendgrid_event_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle SendGrid event webhooks."""
    try:
        events = await request.json()
    except Exception:
        return PlainTextResponse("OK")
    
    if not isinstance(events, list):
        events = [events]
    
    now = datetime.utcnow()
    
    for event in events:
        if not isinstance(event, dict):
            continue
        
        event_type = event.get("event")
        local_message_id = event.get("local_message_id")
        custom_args = event.get("custom_args")
        if not local_message_id and isinstance(custom_args, dict):
            local_message_id = custom_args.get("local_message_id") or custom_args.get("message_id")
        sg_message_id = event.get("sg_message_id")
        
        message = None
        if local_message_id:
            try:
                message = db.query(Message).filter(Message.id == int(local_message_id)).first()
            except (TypeError, ValueError):
                pass
        if not message and sg_message_id:
            message = db.query(Message).filter(Message.provider_message_id == sg_message_id).first()
        
        if not message:
            continue
        
        # Update status based on event type
        status_map = {
            "processed": "processed",
            "dropped": "failed",
            "deferred": "deferred",
            "bounce": "bounced",
            "delivered": "delivered",
            "open": "opened",
            "click": "clicked",
            "spamreport": "spam",
            "unsubscribe": "unsubscribed",
        }
        
        if event_type in status_map:
            message.status = status_map[event_type]
            if event_type == "open" and not message.read_at:
                message.read_at = now
            message.updated_at = now
            db.add(message)
            
            if message.customer_id:
                customer = db.query(Customer).filter(Customer.id == message.customer_id).first()
                if customer:
                    customer.last_email_status = status_map[event_type]
                    customer.updated_at = now
                    db.add(customer)
    
    db.commit()
    return PlainTextResponse("OK")


@router.post("/sendgrid/inbound")
async def sendgrid_inbound_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle SendGrid inbound email webhooks."""
    form = await request.form()
    
    from_email = get_form_value(form, "from")
    to_email = get_form_value(form, "to")
    subject = get_form_value(form, "subject")
    text = get_form_value(form, "text")
    html = get_form_value(form, "html")
    
    if not from_email:
        return PlainTextResponse("OK")
    
    now = datetime.utcnow()
    
    inbound = Message(
        channel="email",
        to_address=to_email,
        from_address=from_email,
        subject=subject,
        body=html or text,
        status="received",
        direction="inbound",
        created_at=now,
        updated_at=now,
    )
    db.add(inbound)
    db.commit()
    
    return PlainTextResponse("OK")
