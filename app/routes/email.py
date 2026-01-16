"""Email sending and campaign routes."""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4
import html as html_lib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import (
    ApiKey,
    CampaignStepExecution,
    Customer,
    EmailCampaign,
    EmailSender,
    Message,
)
from app.schemas import (
    EmailCampaignCreate,
    EmailCampaignItem,
    EmailCampaignListResponse,
    EmailCampaignUpdate,
    EmailFollowupFlowItem,
    EmailFollowupFlowResponse,
    EmailSenderCreate,
    EmailSenderItem,
    EmailSenderUpsertResponse,
    EmailSendersResponse,
    EmailSendRequest,
    SendResponse,
    SendResult,
)
from app.dependencies import require_api_key, ensure_sendgrid
from app.utils import (
    serialize_json_list,
    deserialize_json_list,
    normalize_email_sender,
    text_to_html,
    field_is_set,
)


router = APIRouter(tags=["email"])


def _list_email_senders(db: Session) -> List[EmailSenderItem]:
    senders = []
    if settings.sendgrid_from_email:
        senders.append(
            EmailSenderItem(
                from_email=normalize_email_sender(settings.sendgrid_from_email),
                from_name=settings.sendgrid_from_name,
            )
        )
    db_senders = db.query(EmailSender).all()
    for sender in db_senders:
        if sender.from_email:
            normalized = normalize_email_sender(sender.from_email)
            if not any(s.from_email == normalized for s in senders):
                senders.append(EmailSenderItem(from_email=normalized, from_name=sender.from_name))
    return senders


def _resolve_email_sender(db: Session, from_email: Optional[str]) -> Optional[EmailSenderItem]:
    if from_email:
        normalized = normalize_email_sender(from_email)
        for sender in _list_email_senders(db):
            if sender.from_email == normalized:
                return sender
        return None
    if settings.sendgrid_from_email:
        normalized = normalize_email_sender(settings.sendgrid_from_email)
        return EmailSenderItem(
            from_email=normalized,
            from_name=settings.sendgrid_from_name,
        )
    return None


def _email_campaign_to_item(campaign: EmailCampaign) -> EmailCampaignItem:
    return EmailCampaignItem(
        id=campaign.id,
        name=campaign.name,
        recipients=[str(value) for value in deserialize_json_list(campaign.recipients)],
        subject=campaign.subject,
        text=campaign.text,
        html=campaign.html,
        from_email=campaign.from_email,
        status=campaign.status,
        error=campaign.error,
        schedule_at=campaign.schedule_at,
        started_at=campaign.started_at,
        completed_at=campaign.completed_at,
        followup_enabled=bool(campaign.followup_enabled),
        followup_delay_minutes=campaign.followup_delay_minutes,
        followup_condition=campaign.followup_condition,
        followup_subject=campaign.followup_subject,
        followup_text=campaign.followup_text,
        followup_html=campaign.followup_html,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def send_email_outbound(
    db: Session,
    *,
    sendgrid,
    recipient: str,
    subject: str,
    text: Optional[str],
    html: Optional[str],
    batch_id: str,
    sender: EmailSenderItem,
    campaign_id: Optional[int] = None,
    parent_message_id: Optional[int] = None,
    followup_step: Optional[int] = None,
    marketing_campaign_id: Optional[int] = None,
    campaign_step_id: Optional[int] = None,
    message_template_id: Optional[int] = None,
    customer_id: Optional[int] = None,
) -> SendResult:
    html_payload = html
    if not html_payload and text:
        html_payload = text_to_html(text)

    now = datetime.utcnow()
    message = Message(
        batch_id=batch_id,
        channel="email",
        to_address=recipient,
        from_address=sender.from_email,
        subject=subject,
        body=html or text,
        status="queued",
        direction="outbound",
        campaign_id=campaign_id,
        marketing_campaign_id=marketing_campaign_id,
        campaign_step_id=campaign_step_id,
        message_template_id=message_template_id,
        customer_id=customer_id,
        parent_message_id=parent_message_id,
        followup_step=followup_step or 0,
        created_at=now,
        updated_at=now,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    custom_args = {"local_message_id": str(message.id), "batch_id": batch_id}
    try:
        status_code, message_id = sendgrid.send_email(
            to_email=recipient,
            subject=subject,
            text=text,
            html=html_payload,
            custom_args=custom_args,
            from_email=sender.from_email,
            from_name=sender.from_name,
        )
        if 200 <= status_code < 300:
            message.status = "accepted"
            message.provider_message_id = message_id
        else:
            message.status = "failed"
            message.error = f"SendGrid status {status_code}"
    except Exception as exc:
        message.status = "failed"
        message.error = str(exc)

    message.updated_at = datetime.utcnow()
    db.add(message)

    if marketing_campaign_id and campaign_step_id and customer_id:
        execution = CampaignStepExecution(
            campaign_id=marketing_campaign_id,
            step_id=campaign_step_id,
            customer_id=customer_id,
            channel="EMAIL",
            status=message.status,
            message_id=message.id,
            created_at=now,
            updated_at=message.updated_at,
        )
        db.add(execution)

    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            customer.email_sent_count = (customer.email_sent_count or 0) + 1
            if marketing_campaign_id:
                customer.has_marketed = True
                customer.last_campaign_id = marketing_campaign_id
                customer.last_marketed_at = now
            customer.last_email_status = "failed" if message.status == "failed" else "sent"
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


def dispatch_email_campaign(db: Session, campaign: EmailCampaign) -> None:
    """Dispatch an email campaign to all recipients."""
    if campaign.status not in {"scheduled", "running"}:
        return
    if not campaign.subject:
        campaign.status = "failed"
        campaign.error = "subject is required"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return
    if not campaign.text and not campaign.html:
        campaign.status = "failed"
        campaign.error = "text or html is required"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return

    recipients = deserialize_json_list(campaign.recipients)
    sender = _resolve_email_sender(db, campaign.from_email)
    if not sender:
        campaign.status = "failed"
        campaign.error = "sender not configured"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return

    sendgrid = ensure_sendgrid()
    batch_id = f"email_campaign_{campaign.id}_{uuid4().hex}"
    for recipient in recipients:
        send_email_outbound(
            db,
            sendgrid=sendgrid,
            recipient=recipient,
            subject=campaign.subject,
            text=campaign.text,
            html=campaign.html,
            batch_id=batch_id,
            sender=sender,
            campaign_id=campaign.id,
        )

    if campaign.followup_enabled:
        campaign.status = "followup"
    else:
        campaign.status = "completed"
        campaign.completed_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()


def dispatch_email_followups(db: Session, now: datetime) -> None:
    """Process followup emails for campaigns."""
    campaigns = (
        db.query(EmailCampaign)
        .filter(
            EmailCampaign.status == "followup",
            EmailCampaign.followup_enabled.is_(True),
        )
        .all()
    )
    for campaign in campaigns:
        # Simplified followup logic
        delay_minutes = campaign.followup_delay_minutes or 60
        threshold = now - timedelta(minutes=delay_minutes)
        condition = (campaign.followup_condition or "unread").lower()

        initial_messages = (
            db.query(Message)
            .filter(
                Message.campaign_id == campaign.id,
                Message.direction == "outbound",
                Message.followup_step == 0,
            )
            .all()
        )

        due_messages = []
        for msg in initial_messages:
            if msg.created_at > threshold:
                continue
            has_followup = (
                db.query(Message)
                .filter(
                    Message.campaign_id == campaign.id,
                    Message.parent_message_id == msg.id,
                    Message.followup_step == 1,
                )
                .first()
            )
            if has_followup:
                continue
            if condition == "unread" and msg.read_at is not None:
                continue
            due_messages.append(msg)

        if not due_messages:
            # Check if all messages have followups
            total_initial = len(initial_messages)
            total_followups = (
                db.query(Message)
                .filter(Message.campaign_id == campaign.id, Message.followup_step == 1)
                .count()
            )
            if total_followups >= total_initial:
                campaign.status = "completed"
                campaign.completed_at = now
                campaign.updated_at = now
                db.add(campaign)
                db.commit()
            continue

        sender = _resolve_email_sender(db, campaign.from_email)
        if not sender:
            continue
        sendgrid = ensure_sendgrid()
        batch_id = f"email_followup_{campaign.id}_{uuid4().hex}"
        followup_subject = campaign.followup_subject or f"Re: {campaign.subject}"

        for msg in due_messages:
            send_email_outbound(
                db,
                sendgrid=sendgrid,
                recipient=msg.to_address,
                subject=followup_subject,
                text=campaign.followup_text,
                html=campaign.followup_html,
                batch_id=batch_id,
                sender=sender,
                campaign_id=campaign.id,
                parent_message_id=msg.id,
                followup_step=1,
            )


@router.get("/api/email/senders", response_model=EmailSendersResponse)
def list_email_senders(
    db: Session = Depends(get_db), _: ApiKey = Depends(require_api_key("read"))
) -> EmailSendersResponse:
    return EmailSendersResponse(senders=_list_email_senders(db))


@router.post("/api/email/senders", response_model=EmailSenderUpsertResponse)
def add_email_sender(
    request: EmailSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> EmailSenderUpsertResponse:
    normalized = normalize_email_sender(request.from_email)
    default_email = (
        normalize_email_sender(settings.sendgrid_from_email)
        if settings.sendgrid_from_email
        else None
    )
    status = "exists"
    if normalized != default_email:
        existing = db.query(EmailSender).filter(EmailSender.from_email == normalized).first()
        if not existing:
            db.add(EmailSender(from_email=normalized, created_at=datetime.utcnow()))
            db.commit()
            status = "added"
    return EmailSenderUpsertResponse(
        from_email=normalized,
        status=status,
        senders=_list_email_senders(db),
    )


@router.delete("/api/email/senders", response_model=EmailSenderUpsertResponse)
def delete_email_sender(
    request: EmailSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> EmailSenderUpsertResponse:
    normalized = normalize_email_sender(request.from_email)
    default_email = (
        normalize_email_sender(settings.sendgrid_from_email)
        if settings.sendgrid_from_email
        else None
    )
    status = "not_found"
    if normalized == default_email:
        status = "protected"
    else:
        existing = db.query(EmailSender).filter(EmailSender.from_email == normalized).first()
        if existing:
            db.delete(existing)
            db.commit()
            status = "deleted"
    return EmailSenderUpsertResponse(
        from_email=normalized,
        status=status,
        senders=_list_email_senders(db),
    )


@router.post("/api/send/email", response_model=SendResponse)
def send_email(
    request: EmailSendRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SendResponse:
    if not request.text and not request.html:
        raise HTTPException(status_code=400, detail="text or html is required")

    sendgrid = ensure_sendgrid()
    batch_id = uuid4().hex
    results: List[SendResult] = []
    sender = _resolve_email_sender(db, request.from_email)
    if request.from_email and not sender:
        raise HTTPException(status_code=400, detail="from_email is not in whitelist")
    if not sender:
        raise HTTPException(status_code=400, detail="SENDGRID_FROM_EMAIL is not configured")

    for recipient in request.recipients:
        results.append(
            send_email_outbound(
                db,
                sendgrid=sendgrid,
                recipient=recipient,
                subject=request.subject,
                text=request.text,
                html=request.html,
                batch_id=batch_id,
                sender=sender,
            )
        )

    return SendResponse(batch_id=batch_id, channel="email", results=results)


@router.get("/api/email/campaigns", response_model=EmailCampaignListResponse)
def list_email_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> EmailCampaignListResponse:
    query = db.query(EmailCampaign)
    if status:
        query = query.filter(EmailCampaign.status == status)
    campaigns = query.order_by(EmailCampaign.created_at.desc()).all()
    return EmailCampaignListResponse(campaigns=[_email_campaign_to_item(c) for c in campaigns])


@router.post("/api/email/campaigns", response_model=EmailCampaignItem)
def create_email_campaign(
    payload: EmailCampaignCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> EmailCampaignItem:
    now = datetime.utcnow()
    campaign = EmailCampaign(
        name=payload.name.strip(),
        recipients=serialize_json_list(payload.recipients),
        subject=payload.subject,
        text=payload.text,
        html=payload.html,
        from_email=payload.from_email,
        status="draft" if not payload.schedule_at else "scheduled",
        schedule_at=payload.schedule_at,
        followup_enabled=payload.followup_enabled or False,
        followup_delay_minutes=payload.followup_delay_minutes,
        followup_condition=payload.followup_condition,
        followup_subject=payload.followup_subject,
        followup_text=payload.followup_text,
        followup_html=payload.followup_html,
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _email_campaign_to_item(campaign)


@router.patch("/api/email/campaigns/{campaign_id}", response_model=EmailCampaignItem)
def update_email_campaign(
    campaign_id: int,
    payload: EmailCampaignUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> EmailCampaignItem:
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if payload.name is not None:
        campaign.name = payload.name.strip()
    if payload.recipients is not None:
        campaign.recipients = serialize_json_list(payload.recipients)
    if payload.subject is not None:
        campaign.subject = payload.subject
    if payload.text is not None:
        campaign.text = payload.text
    if payload.html is not None:
        campaign.html = payload.html
    if payload.from_email is not None:
        campaign.from_email = payload.from_email
    if payload.schedule_at is not None:
        campaign.schedule_at = payload.schedule_at
    if payload.status is not None:
        campaign.status = payload.status
    if payload.followup_enabled is not None:
        campaign.followup_enabled = payload.followup_enabled
    if payload.followup_delay_minutes is not None:
        campaign.followup_delay_minutes = payload.followup_delay_minutes
    if payload.followup_condition is not None:
        campaign.followup_condition = payload.followup_condition
    if payload.followup_subject is not None:
        campaign.followup_subject = payload.followup_subject
    if payload.followup_text is not None:
        campaign.followup_text = payload.followup_text
    if payload.followup_html is not None:
        campaign.followup_html = payload.followup_html
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _email_campaign_to_item(campaign)


@router.post("/api/email/campaigns/{campaign_id}/start", response_model=EmailCampaignItem)
def start_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> EmailCampaignItem:
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if campaign.status not in {"draft", "scheduled", "paused"}:
        raise HTTPException(status_code=400, detail="campaign cannot be started")
    campaign.status = "running"
    campaign.started_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    dispatch_email_campaign(db, campaign)
    db.refresh(campaign)
    return _email_campaign_to_item(campaign)


@router.post("/api/email/campaigns/{campaign_id}/pause", response_model=EmailCampaignItem)
def pause_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> EmailCampaignItem:
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if campaign.status == "running":
        campaign.status = "paused"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
    return _email_campaign_to_item(campaign)


@router.post("/api/email/campaigns/{campaign_id}/cancel", response_model=EmailCampaignItem)
def cancel_email_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> EmailCampaignItem:
    campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    campaign.status = "cancelled"
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _email_campaign_to_item(campaign)
