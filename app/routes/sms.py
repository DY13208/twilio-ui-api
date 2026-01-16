"""SMS messaging, contacts, groups and campaign routes (placeholder)."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import (
    ApiKey,
    Customer,
    Message,
    SmsCampaign,
    SmsContact,
    SmsGroup,
    SmsGroupMember,
    SmsKeywordRule,
    SmsOptOut,
    SmsBlacklist,
    SmsTemplate,
)
from app.schemas import (
    SendResponse,
    SendResult,
    SmsCampaignCreate,
    SmsCampaignItem,
    SmsCampaignListResponse,
    SmsCampaignStatsResponse,
    SmsCampaignUpdate,
    SmsContactCreate,
    SmsContactItem,
    SmsContactListResponse,
    SmsContactUpdate,
    SmsGroupCreate,
    SmsGroupItem,
    SmsGroupListResponse,
    SmsGroupMembersRequest,
    SmsGroupMembersResponse,
    SmsGroupUpdate,
    SmsKeywordRuleCreate,
    SmsKeywordRuleItem,
    SmsKeywordRuleListResponse,
    SmsKeywordRuleUpdate,
    SmsOptOutCreate,
    SmsOptOutItem,
    SmsOptOutListResponse,
    SmsBlacklistCreate,
    SmsBlacklistItem,
    SmsBlacklistListResponse,
    SmsSendRequest,
    SmsStatsResponse,
    SmsTemplateCreate,
    SmsTemplateItem,
    SmsTemplateListResponse,
    SmsTemplateUpdate,
)
from app.dependencies import require_api_key, ensure_twilio
from app.utils import (
    serialize_json_list,
    serialize_json_dict,
    deserialize_json_list,
    deserialize_json_dict,
    serialize_tags,
    deserialize_tags,
    normalize_sms_phone,
    normalize_sms_phones,
    is_opted_out,
    append_opt_out_text,
    build_sms_status_callback,
    render_sms_body,
    collect_sms_recipients,
)


router = APIRouter(tags=["sms"])


def _sms_template_to_item(template: SmsTemplate) -> SmsTemplateItem:
    return SmsTemplateItem(
        id=template.id,
        name=template.name,
        body=template.body,
        variables=deserialize_json_list(template.variables),
        disabled_at=template.disabled_at,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


def _sms_contact_to_item(contact: SmsContact) -> SmsContactItem:
    return SmsContactItem(
        id=contact.id,
        phone=contact.phone,
        name=contact.name,
        tags=deserialize_tags(contact.tags),
        disabled_at=contact.disabled_at,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


def _sms_group_to_item(group: SmsGroup, member_count: int = 0) -> SmsGroupItem:
    return SmsGroupItem(
        id=group.id,
        name=group.name,
        description=group.description,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def _sms_campaign_to_item(campaign: SmsCampaign) -> SmsCampaignItem:
    return SmsCampaignItem(
        id=campaign.id,
        name=campaign.name,
        message=campaign.message,
        template_id=campaign.template_id,
        template_variables=deserialize_json_dict(campaign.template_variables),
        variant_a=campaign.variant_a,
        variant_b=campaign.variant_b,
        ab_split=campaign.ab_split,
        status=campaign.status,
        schedule_at=campaign.schedule_at,
        started_at=campaign.started_at,
        completed_at=campaign.completed_at,
        from_number=campaign.from_number,
        messaging_service_sid=campaign.messaging_service_sid,
        rate_per_minute=campaign.rate_per_minute,
        batch_size=campaign.batch_size,
        append_opt_out=campaign.append_opt_out,
        group_ids=[int(v) for v in deserialize_json_list(campaign.target_groups) if str(v).isdigit()],
        tags=[str(v) for v in deserialize_json_list(campaign.target_tags)],
        recipients=[str(v) for v in deserialize_json_list(campaign.target_recipients)],
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def send_sms_outbound(
    db: Session,
    *,
    twilio,
    recipient: str,
    body: str,
    batch_id: str,
    from_number: Optional[str],
    messaging_service_sid: Optional[str],
    campaign_id: Optional[int] = None,
    template_id: Optional[int] = None,
    variant: Optional[str] = None,
    append_opt_out_flag: bool = True,
    use_proxy: Optional[bool] = None,
    marketing_campaign_id: Optional[int] = None,
    campaign_step_id: Optional[int] = None,
    message_template_id: Optional[int] = None,
    customer_id: Optional[int] = None,
) -> SendResult:
    now = datetime.utcnow()
    
    # Check opt-out status
    opt_out_reason = is_opted_out(db, recipient)
    if opt_out_reason:
        message = Message(
            batch_id=batch_id,
            channel="sms",
            to_address=recipient,
            from_address=from_number or "",
            body=body,
            status="blocked",
            error=f"recipient opted out: {opt_out_reason}",
            direction="outbound",
            campaign_id=campaign_id,
            template_id=template_id,
            variant=variant,
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
        return SendResult(
            message_id=message.id,
            recipient=recipient,
            status="blocked",
            error=message.error,
        )

    final_body = append_opt_out_text(body, append_opt_out_flag)
    
    message = Message(
        batch_id=batch_id,
        channel="sms",
        to_address=recipient,
        from_address=from_number or "",
        body=final_body,
        status="queued",
        direction="outbound",
        campaign_id=campaign_id,
        template_id=template_id,
        variant=variant,
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

    status_callback = build_sms_status_callback(message.id)

    try:
        message_sid = twilio.send_sms(
            to_number=recipient,
            body=final_body,
            status_callback=status_callback,
            from_number=from_number,
            messaging_service_sid=messaging_service_sid,
            use_proxy=use_proxy,
        )
        message.provider_message_id = message_sid
        message.status = "sent"
    except Exception as exc:
        message.status = "failed"
        message.error = str(exc)

    message.updated_at = datetime.utcnow()
    db.add(message)

    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            customer.sms_sent_count = (customer.sms_sent_count or 0) + 1
            if marketing_campaign_id:
                customer.has_marketed = True
                customer.last_campaign_id = marketing_campaign_id
                customer.last_marketed_at = now
            customer.last_sms_status = "failed" if message.status == "failed" else "sent"
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


def dispatch_sms_campaign(db: Session, campaign: SmsCampaign) -> None:
    """Dispatch an SMS campaign to all recipients."""
    if campaign.status not in {"scheduled", "running"}:
        return
    
    template = None
    if campaign.template_id:
        template = db.query(SmsTemplate).filter(SmsTemplate.id == campaign.template_id).first()
    
    body_source = campaign.message or (template.body if template else "")
    if not body_source:
        campaign.status = "failed"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return

    from_number = campaign.from_number or settings.twilio_sms_from
    messaging_service_sid = campaign.messaging_service_sid or settings.twilio_sms_messaging_service_sid
    if not from_number and not messaging_service_sid:
        campaign.status = "failed"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return

    recipients, contact_map = collect_sms_recipients(
        db,
        recipients=deserialize_json_list(campaign.target_recipients),
        group_ids=[int(v) for v in deserialize_json_list(campaign.target_groups) if str(v).isdigit()],
        tags=deserialize_json_list(campaign.target_tags),
    )

    if not recipients:
        campaign.status = "completed"
        campaign.completed_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return

    twilio = ensure_twilio()
    batch_id = f"sms_campaign_{campaign.id}_{uuid4().hex}"
    template_variables = deserialize_json_dict(campaign.template_variables)
    append_opt_out_flag = campaign.append_opt_out if campaign.append_opt_out is not None else True

    for recipient in recipients:
        contact = contact_map.get(recipient)
        variables = dict(template_variables)
        if contact:
            variables["name"] = contact.name or ""
            variables["phone"] = contact.phone
        body = render_sms_body(body_source, variables)
        send_sms_outbound(
            db,
            twilio=twilio,
            recipient=recipient,
            body=body,
            batch_id=batch_id,
            from_number=from_number,
            messaging_service_sid=messaging_service_sid,
            campaign_id=campaign.id,
            template_id=campaign.template_id,
            append_opt_out_flag=append_opt_out_flag,
        )

    campaign.status = "completed"
    campaign.completed_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()


# Template endpoints
@router.get("/api/sms/templates", response_model=SmsTemplateListResponse)
def list_sms_templates(
    include_disabled: bool = False,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsTemplateListResponse:
    query = db.query(SmsTemplate)
    if not include_disabled:
        query = query.filter(SmsTemplate.disabled_at.is_(None))
    templates = query.order_by(SmsTemplate.created_at.desc()).all()
    return SmsTemplateListResponse(templates=[_sms_template_to_item(t) for t in templates])


@router.post("/api/sms/templates", response_model=SmsTemplateItem)
def create_sms_template(
    payload: SmsTemplateCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsTemplateItem:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    existing = db.query(SmsTemplate).filter(SmsTemplate.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="template name already exists")
    template = SmsTemplate(
        name=name,
        body=payload.body,
        variables=serialize_json_list(payload.variables),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _sms_template_to_item(template)


# Contact endpoints
@router.get("/api/sms/contacts", response_model=SmsContactListResponse)
def list_sms_contacts(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    include_disabled: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsContactListResponse:
    query = db.query(SmsContact)
    if not include_disabled:
        query = query.filter(SmsContact.disabled_at.is_(None))
    if search:
        search_value = f"%{search.strip()}%"
        query = query.filter(
            (SmsContact.phone.like(search_value)) | (SmsContact.name.like(search_value))
        )
    contacts = query.order_by(SmsContact.created_at.desc()).all()
    if tag:
        tag_value = tag.strip().lower()
        if tag_value:
            contacts = [
                c for c in contacts
                if tag_value in {t.lower() for t in deserialize_tags(c.tags)}
            ]
    total = len(contacts)
    paginated = contacts[offset:offset + limit]
    return SmsContactListResponse(
        contacts=[_sms_contact_to_item(c) for c in paginated],
        total=total,
    )


@router.post("/api/sms/contacts", response_model=SmsContactItem)
def create_sms_contact(
    payload: SmsContactCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsContactItem:
    phone = normalize_sms_phone(payload.phone)
    existing = db.query(SmsContact).filter(SmsContact.phone == phone).first()
    if existing:
        if payload.name is not None:
            existing.name = payload.name.strip() or None
        if payload.tags is not None:
            existing.tags = serialize_tags(payload.tags)
        existing.disabled_at = None
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return _sms_contact_to_item(existing)
    contact = SmsContact(
        phone=phone,
        name=payload.name.strip() if payload.name else None,
        tags=serialize_tags(payload.tags),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _sms_contact_to_item(contact)


# Group endpoints
@router.get("/api/sms/groups", response_model=SmsGroupListResponse)
def list_sms_groups(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsGroupListResponse:
    groups = db.query(SmsGroup).order_by(SmsGroup.created_at.desc()).all()
    counts = dict(
        db.query(SmsGroupMember.group_id, func.count(SmsGroupMember.id))
        .group_by(SmsGroupMember.group_id)
        .all()
    )
    return SmsGroupListResponse(
        groups=[_sms_group_to_item(g, counts.get(g.id, 0)) for g in groups]
    )


@router.post("/api/sms/groups", response_model=SmsGroupItem)
def create_sms_group(
    payload: SmsGroupCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsGroupItem:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    existing = db.query(SmsGroup).filter(SmsGroup.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="group name already exists")
    group = SmsGroup(
        name=name,
        description=payload.description,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return _sms_group_to_item(group, 0)


# Send SMS
@router.post("/api/send/sms", response_model=SendResponse)
def send_sms(
    payload: SmsSendRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SendResponse:
    if not payload.message and not payload.template_id:
        raise HTTPException(status_code=400, detail="message or template_id is required")
    
    template = None
    if payload.template_id:
        template = db.query(SmsTemplate).filter(SmsTemplate.id == payload.template_id).first()
        if not template or template.disabled_at:
            raise HTTPException(status_code=404, detail="sms template not found")
    
    body_source = payload.message or (template.body if template else "")
    if not body_source:
        raise HTTPException(status_code=400, detail="message body is required")
    
    from_number = payload.from_number or settings.twilio_sms_from
    messaging_service_sid = payload.messaging_service_sid or settings.twilio_sms_messaging_service_sid
    if not from_number and not messaging_service_sid:
        raise HTTPException(status_code=400, detail="TWILIO_SMS_FROM is not configured")

    append_opt_out_flag = payload.append_opt_out if payload.append_opt_out is not None else True
    twilio = ensure_twilio()
    batch_id = uuid4().hex
    results: List[SendResult] = []
    variables = payload.template_variables or {}

    for recipient in normalize_sms_phones(payload.recipients):
        body = render_sms_body(body_source, variables)
        results.append(
            send_sms_outbound(
                db,
                twilio=twilio,
                recipient=recipient,
                body=body,
                batch_id=batch_id,
                from_number=from_number,
                messaging_service_sid=messaging_service_sid,
                template_id=payload.template_id,
                append_opt_out_flag=append_opt_out_flag,
            )
        )

    return SendResponse(batch_id=batch_id, channel="sms", results=results)


# Campaign endpoints
@router.get("/api/sms/campaigns", response_model=SmsCampaignListResponse)
def list_sms_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsCampaignListResponse:
    query = db.query(SmsCampaign)
    if status:
        query = query.filter(SmsCampaign.status == status)
    campaigns = query.order_by(SmsCampaign.created_at.desc()).all()
    return SmsCampaignListResponse(campaigns=[_sms_campaign_to_item(c) for c in campaigns])


@router.post("/api/sms/campaigns", response_model=SmsCampaignItem)
def create_sms_campaign(
    payload: SmsCampaignCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    now = datetime.utcnow()
    campaign = SmsCampaign(
        name=payload.name.strip(),
        message=payload.message,
        template_id=payload.template_id,
        template_variables=serialize_json_dict(payload.template_variables),
        variant_a=payload.variant_a,
        variant_b=payload.variant_b,
        ab_split=payload.ab_split,
        status="draft" if not payload.schedule_at else "scheduled",
        schedule_at=payload.schedule_at,
        from_number=payload.from_number,
        messaging_service_sid=payload.messaging_service_sid,
        rate_per_minute=payload.rate_per_minute,
        batch_size=payload.batch_size,
        append_opt_out=payload.append_opt_out,
        target_groups=serialize_json_list(payload.group_ids),
        target_tags=serialize_json_list(payload.tags),
        target_recipients=serialize_json_list(payload.recipients),
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@router.post("/api/sms/campaigns/{campaign_id}/start", response_model=SmsCampaignItem)
def start_sms_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if campaign.status not in {"draft", "scheduled", "paused"}:
        raise HTTPException(status_code=400, detail="campaign cannot be started")
    campaign.status = "running"
    campaign.started_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    dispatch_sms_campaign(db, campaign)
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


# Keyword rules
@router.get("/api/sms/keyword-rules", response_model=SmsKeywordRuleListResponse)
def list_sms_keyword_rules(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsKeywordRuleListResponse:
    rules = db.query(SmsKeywordRule).order_by(SmsKeywordRule.created_at.desc()).all()
    items = [
        SmsKeywordRuleItem(
            id=r.id,
            keyword=r.keyword,
            match_type=r.match_type,
            response_text=r.response_text,
            enabled=r.enabled,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rules
    ]
    return SmsKeywordRuleListResponse(rules=items)


# Opt-out management
@router.get("/api/sms/opt-outs", response_model=SmsOptOutListResponse)
def list_sms_opt_outs(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsOptOutListResponse:
    opt_outs = db.query(SmsOptOut).order_by(SmsOptOut.created_at.desc()).all()
    items = [
        SmsOptOutItem(
            id=o.id,
            phone=o.phone,
            reason=o.reason,
            source=o.source,
            created_at=o.created_at,
        )
        for o in opt_outs
    ]
    return SmsOptOutListResponse(opt_outs=items)


@router.post("/api/sms/opt-outs", response_model=SmsOptOutItem)
def add_sms_opt_out(
    payload: SmsOptOutCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsOptOutItem:
    phone = normalize_sms_phone(payload.phone)
    existing = db.query(SmsOptOut).filter(SmsOptOut.phone == phone).first()
    if existing:
        return SmsOptOutItem(
            id=existing.id,
            phone=existing.phone,
            reason=existing.reason,
            source=existing.source,
            created_at=existing.created_at,
        )
    opt_out = SmsOptOut(
        phone=phone,
        reason=payload.reason,
        source=payload.source or "api",
        created_at=datetime.utcnow(),
    )
    db.add(opt_out)
    db.commit()
    db.refresh(opt_out)
    return SmsOptOutItem(
        id=opt_out.id,
        phone=opt_out.phone,
        reason=opt_out.reason,
        source=opt_out.source,
        created_at=opt_out.created_at,
    )


# Blacklist management
@router.get("/api/sms/blacklist", response_model=SmsBlacklistListResponse)
def list_sms_blacklist(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsBlacklistListResponse:
    items = db.query(SmsBlacklist).order_by(SmsBlacklist.created_at.desc()).all()
    return SmsBlacklistListResponse(
        blacklist=[
            SmsBlacklistItem(
                id=b.id,
                phone=b.phone,
                reason=b.reason,
                created_at=b.created_at,
            )
            for b in items
        ]
    )


@router.post("/api/sms/blacklist", response_model=SmsBlacklistItem)
def add_sms_blacklist(
    payload: SmsBlacklistCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsBlacklistItem:
    phone = normalize_sms_phone(payload.phone)
    existing = db.query(SmsBlacklist).filter(SmsBlacklist.phone == phone).first()
    if existing:
        return SmsBlacklistItem(
            id=existing.id,
            phone=existing.phone,
            reason=existing.reason,
            created_at=existing.created_at,
        )
    item = SmsBlacklist(
        phone=phone,
        reason=payload.reason,
        created_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return SmsBlacklistItem(
        id=item.id,
        phone=item.phone,
        reason=item.reason,
        created_at=item.created_at,
    )
