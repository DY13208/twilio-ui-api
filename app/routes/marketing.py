"""Marketing campaign routes."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import (
    ApiKey,
    CampaignStep,
    CampaignStepExecution,
    Customer,
    CustomerGroupMember,
    MarketingCustomerState,
    MarketingCampaign,
    Message,
    MessageTemplate,
)
from app.schemas import (
    CampaignStepBatchCreate,
    CampaignStepCreate,
    CampaignStepExecutionCreate,
    CampaignStepExecutionItem,
    CampaignStepExecutionListResponse,
    CampaignStepExecutionUpdate,
    CampaignStepItem,
    CampaignStepListResponse,
    CampaignStepUpdate,
    MarketingCampaignCreate,
    MarketingCampaignItem,
    MarketingCampaignListResponse,
    MarketingCustomerProgressItem,
    MarketingCustomerProgressResponse,
    MarketingCustomerStateItem,
    MarketingCampaignUpdate,
)
from app.dependencies import require_api_key, ensure_sendgrid, ensure_twilio
from app.utils import (
    serialize_json_list,
    serialize_json_dict,
    deserialize_json_list,
    deserialize_json_dict,
    deserialize_tags,
    filter_customers_by_rules,
    build_customer_context,
    render_message_template,
)


router = APIRouter(tags=["marketing"])

_ALLOWED_STEP_CHANNELS = {"EMAIL", "WHATSAPP", "SMS"}


def _normalize_step_channel(channel: str) -> str:
    cleaned = channel.strip().upper()
    if cleaned not in _ALLOWED_STEP_CHANNELS:
        raise HTTPException(status_code=400, detail="invalid channel")
    return cleaned


def _build_campaign_step(
    campaign_id: int, payload: CampaignStepCreate, now: datetime
) -> CampaignStep:
    return CampaignStep(
        campaign_id=campaign_id,
        order_no=payload.order_no,
        channel=_normalize_step_channel(payload.channel),
        delay_days=payload.delay_days or 0,
        filter_rules=serialize_json_dict(payload.filter_rules),
        template_id=payload.template_id,
        subject=payload.subject,
        content=payload.content,
        content_sid=payload.content_sid,
        content_variables=serialize_json_dict(payload.content_variables),
        created_at=now,
        updated_at=now,
    )


def _campaign_step_to_item(step: CampaignStep) -> CampaignStepItem:
    return CampaignStepItem(
        id=step.id,
        campaign_id=step.campaign_id,
        order_no=step.order_no,
        channel=step.channel,
        delay_days=step.delay_days or 0,
        filter_rules=deserialize_json_dict(step.filter_rules),
        template_id=step.template_id,
        subject=step.subject,
        content=step.content,
        content_sid=step.content_sid,
        content_variables=deserialize_json_dict(step.content_variables),
        created_at=step.created_at,
        updated_at=step.updated_at,
    )


def _campaign_step_execution_to_item(
    execution: CampaignStepExecution,
) -> CampaignStepExecutionItem:
    return CampaignStepExecutionItem(
        id=execution.id,
        campaign_id=execution.campaign_id,
        step_id=execution.step_id,
        customer_id=execution.customer_id,
        channel=execution.channel,
        status=execution.status,
        message_id=execution.message_id,
        note=execution.note,
        created_at=execution.created_at,
        updated_at=execution.updated_at,
    )


def _load_paused_customer_ids(db: Session, campaign_id: int) -> set:
    states = (
        db.query(MarketingCustomerState)
        .filter(
            MarketingCustomerState.campaign_id == campaign_id,
            MarketingCustomerState.status == "PAUSED",
        )
        .all()
    )
    return {state.customer_id for state in states}


def _marketing_campaign_to_item(
    campaign: MarketingCampaign, stats: Optional[Dict[str, int]] = None
) -> MarketingCampaignItem:
    stats = stats or {}
    return MarketingCampaignItem(
        id=campaign.id,
        name=campaign.name,
        type=campaign.type,
        status=campaign.status,
        run_immediately=bool(campaign.run_immediately),
        schedule_time=campaign.schedule_time,
        customer_ids=[
            int(v) for v in deserialize_json_list(campaign.target_customer_ids) if str(v).isdigit()
        ],
        filter_rules=deserialize_json_dict(campaign.filter_rules),
        created_by=campaign.created_by,
        started_at=campaign.started_at,
        completed_at=campaign.completed_at,
        total_customers=stats.get("total_customers", 0),
        success_count=stats.get("success_count", 0),
        failed_count=stats.get("failed_count", 0),
        delivered_count=stats.get("delivered_count", 0),
        email_sent_count=stats.get("email_sent_count", 0),
        email_opened_count=stats.get("email_opened_count", 0),
        email_replied_count=stats.get("email_replied_count", 0),
        whatsapp_replied_count=stats.get("whatsapp_replied_count", 0),
        sms_replied_count=stats.get("sms_replied_count", 0),
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def dispatch_marketing_campaign(db: Session, campaign: MarketingCampaign, now: datetime) -> None:
    """Dispatch a marketing campaign - simplified implementation."""
    if campaign.status not in {"DRAFT", "RUNNING"}:
        return
    
    # Load campaign steps
    steps = (
        db.query(CampaignStep)
        .filter(CampaignStep.campaign_id == campaign.id)
        .order_by(CampaignStep.order_no)
        .all()
    )
    if not steps:
        campaign.status = "COMPLETED"
        campaign.completed_at = now
        campaign.updated_at = now
        db.add(campaign)
        db.commit()
        return

    # Load customers
    customer_ids = deserialize_json_list(campaign.target_customer_ids)
    if customer_ids:
        customers = db.query(Customer).filter(Customer.id.in_(customer_ids)).all()
    else:
        customers = db.query(Customer).all()
    
    filter_rules = deserialize_json_dict(campaign.filter_rules)
    raw_group_ids = filter_rules.pop("group_ids", None)
    if raw_group_ids is None:
        raw_group_ids = filter_rules.pop("group_id", None)
    group_ids: List[int] = []
    if isinstance(raw_group_ids, list):
        group_ids = [int(v) for v in raw_group_ids if str(v).isdigit()]
    elif raw_group_ids is not None and str(raw_group_ids).isdigit():
        group_ids = [int(raw_group_ids)]
    if group_ids:
        member_ids = {
            row[0]
            for row in db.query(CustomerGroupMember.customer_id)
            .filter(CustomerGroupMember.group_id.in_(group_ids))
            .all()
        }
        if member_ids:
            customers = [customer for customer in customers if customer.id in member_ids]
        else:
            customers = []
    eligible_customers = filter_customers_by_rules(customers, filter_rules)

    if not eligible_customers:
        campaign.status = "COMPLETED"
        campaign.completed_at = now
        campaign.updated_at = now
        db.add(campaign)
        db.commit()
        return

    paused_ids = _load_paused_customer_ids(db, campaign.id)
    customers = [customer for customer in eligible_customers if customer.id not in paused_ids]
    if not customers:
        return

    # Process first step for simplicity
    step = steps[0]
    channel = step.channel.upper()
    
    for customer in customers:
        context = build_customer_context(customer)
        
        if channel == "EMAIL" and customer.email:
            from app.routes.email import send_email_outbound, _resolve_email_sender
            sendgrid = ensure_sendgrid()
            sender = _resolve_email_sender(db, None)
            if sender:
                template = None
                if step.template_id:
                    template = db.query(MessageTemplate).filter(MessageTemplate.id == step.template_id).first()
                subject = render_message_template(step.subject or (template.subject if template else ""), context)
                content = render_message_template(step.content or (template.content if template else ""), context)
                send_email_outbound(
                    db,
                    sendgrid=sendgrid,
                    recipient=customer.email,
                    subject=subject,
                    text=content,
                    html=None,
                    batch_id=f"marketing_{campaign.id}_{uuid4().hex}",
                    sender=sender,
                    marketing_campaign_id=campaign.id,
                    campaign_step_id=step.id,
                    message_template_id=step.template_id,
                    customer_id=customer.id,
                )
        elif channel == "WHATSAPP" and customer.whatsapp:
            from app.routes.whatsapp import send_whatsapp_outbound, _resolve_whatsapp_sender
            twilio = ensure_twilio()
            from_address = _resolve_whatsapp_sender(db, None)
            if from_address:
                template = None
                if step.template_id:
                    template = db.query(MessageTemplate).filter(MessageTemplate.id == step.template_id).first()
                content = render_message_template(step.content or (template.content if template else ""), context)
                send_whatsapp_outbound(
                    db,
                    twilio=twilio,
                    recipient=customer.whatsapp,
                    body=content,
                    batch_id=f"marketing_{campaign.id}_{uuid4().hex}",
                    from_address=from_address,
                    content_sid=step.content_sid,
                    content_variables=deserialize_json_dict(step.content_variables),
                    marketing_campaign_id=campaign.id,
                    campaign_step_id=step.id,
                    message_template_id=step.template_id,
                    customer_id=customer.id,
                )
        elif channel == "SMS" and customer.mobile:
            from app.routes.sms import send_sms_outbound
            twilio = ensure_twilio()
            template = None
            if step.template_id:
                template = db.query(MessageTemplate).filter(MessageTemplate.id == step.template_id).first()
            content = render_message_template(step.content or (template.content if template else ""), context)
            from_number = settings.twilio_sms_from
            messaging_service_sid = settings.twilio_sms_messaging_service_sid
            if from_number or messaging_service_sid:
                send_sms_outbound(
                    db,
                    twilio=twilio,
                    recipient=customer.mobile,
                    body=content,
                    batch_id=f"marketing_{campaign.id}_{uuid4().hex}",
                    from_number=from_number,
                    messaging_service_sid=messaging_service_sid,
                    marketing_campaign_id=campaign.id,
                    campaign_step_id=step.id,
                    message_template_id=step.template_id,
                    customer_id=customer.id,
                )

    campaign.status = "COMPLETED"
    campaign.completed_at = now
    campaign.updated_at = now
    db.add(campaign)
    db.commit()


@router.get("/api/marketing/campaigns", response_model=MarketingCampaignListResponse)
def list_marketing_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> MarketingCampaignListResponse:
    query = db.query(MarketingCampaign)
    if status:
        query = query.filter(MarketingCampaign.status == status.upper())
    campaigns = query.order_by(MarketingCampaign.created_at.desc()).all()
    return MarketingCampaignListResponse(
        campaigns=[_marketing_campaign_to_item(c) for c in campaigns]
    )


@router.post("/api/marketing/campaigns", response_model=MarketingCampaignItem)
def create_marketing_campaign(
    payload: MarketingCampaignCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCampaignItem:
    now = datetime.utcnow()
    campaign = MarketingCampaign(
        name=payload.name.strip(),
        type=payload.type or "GENERAL",
        status="DRAFT",
        run_immediately=payload.run_immediately or False,
        schedule_time=payload.schedule_time,
        target_customer_ids=serialize_json_list(payload.customer_ids),
        filter_rules=serialize_json_dict(payload.filter_rules),
        created_by=payload.created_by,
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _marketing_campaign_to_item(campaign)


@router.patch("/api/marketing/campaigns/{campaign_id}", response_model=MarketingCampaignItem)
def update_marketing_campaign(
    campaign_id: int,
    payload: MarketingCampaignUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCampaignItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if payload.name is not None:
        campaign.name = payload.name.strip()
    if payload.type is not None:
        campaign.type = payload.type
    if payload.status is not None:
        campaign.status = payload.status.upper()
    if payload.run_immediately is not None:
        campaign.run_immediately = payload.run_immediately
    if payload.schedule_time is not None:
        campaign.schedule_time = payload.schedule_time
    if payload.customer_ids is not None:
        campaign.target_customer_ids = serialize_json_list(payload.customer_ids)
    if payload.filter_rules is not None:
        campaign.filter_rules = serialize_json_dict(payload.filter_rules)
    if payload.created_by is not None:
        campaign.created_by = payload.created_by
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _marketing_campaign_to_item(campaign)


@router.delete("/api/marketing/campaigns/{campaign_id}", response_model=MarketingCampaignItem)
def delete_marketing_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCampaignItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    item = _marketing_campaign_to_item(campaign)
    db.delete(campaign)
    db.commit()
    return item


@router.post("/api/marketing/campaigns/{campaign_id}/start", response_model=MarketingCampaignItem)
def start_marketing_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCampaignItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if campaign.status not in {"DRAFT", "SCHEDULED"}:
        raise HTTPException(status_code=400, detail="campaign cannot be started")
    now = datetime.utcnow()
    campaign.status = "RUNNING"
    campaign.started_at = now
    campaign.updated_at = now
    db.add(campaign)
    db.commit()
    dispatch_marketing_campaign(db, campaign, now)
    db.refresh(campaign)
    return _marketing_campaign_to_item(campaign)


@router.post("/api/marketing/campaigns/{campaign_id}/stop", response_model=MarketingCampaignItem)
def stop_marketing_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCampaignItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    campaign.status = "STOPPED"
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _marketing_campaign_to_item(campaign)


# Campaign steps
@router.get("/api/marketing/campaigns/{campaign_id}/steps", response_model=CampaignStepListResponse)
def list_campaign_steps(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CampaignStepListResponse:
    steps = (
        db.query(CampaignStep)
        .filter(CampaignStep.campaign_id == campaign_id)
        .order_by(CampaignStep.order_no)
        .all()
    )
    return CampaignStepListResponse(steps=[_campaign_step_to_item(s) for s in steps])


@router.post("/api/marketing/campaigns/{campaign_id}/steps", response_model=CampaignStepItem)
def create_campaign_step(
    campaign_id: int,
    payload: CampaignStepCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    now = datetime.utcnow()
    step = _build_campaign_step(campaign_id, payload, now)
    db.add(step)
    db.commit()
    db.refresh(step)
    return _campaign_step_to_item(step)


@router.patch(
    "/api/marketing/campaigns/{campaign_id}/steps/{step_id}",
    response_model=CampaignStepItem,
)
def update_campaign_step(
    campaign_id: int,
    step_id: int,
    payload: CampaignStepUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepItem:
    step = (
        db.query(CampaignStep)
        .filter(CampaignStep.id == step_id, CampaignStep.campaign_id == campaign_id)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="campaign step not found")
    if payload.order_no is not None:
        step.order_no = payload.order_no
    if payload.channel is not None:
        step.channel = _normalize_step_channel(payload.channel)
    if payload.delay_days is not None:
        step.delay_days = payload.delay_days or 0
    if payload.filter_rules is not None:
        step.filter_rules = serialize_json_dict(payload.filter_rules)
    if payload.template_id is not None:
        step.template_id = payload.template_id
    if payload.subject is not None:
        step.subject = payload.subject
    if payload.content is not None:
        step.content = payload.content
    if payload.content_sid is not None:
        step.content_sid = payload.content_sid
    if payload.content_variables is not None:
        step.content_variables = serialize_json_dict(payload.content_variables)
    step.updated_at = datetime.utcnow()
    db.add(step)
    db.commit()
    db.refresh(step)
    return _campaign_step_to_item(step)


@router.post(
    "/api/marketing/campaigns/{campaign_id}/steps/batch",
    response_model=CampaignStepListResponse,
)
def create_campaign_steps(
    campaign_id: int,
    payload: CampaignStepBatchCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepListResponse:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    now = datetime.utcnow()
    steps = [_build_campaign_step(campaign_id, step_payload, now) for step_payload in payload.steps]
    db.add_all(steps)
    db.commit()
    for step in steps:
        db.refresh(step)
    return CampaignStepListResponse(steps=[_campaign_step_to_item(step) for step in steps])


@router.delete("/api/marketing/campaigns/{campaign_id}/steps/{step_id}", response_model=CampaignStepItem)
def delete_campaign_step(
    campaign_id: int,
    step_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepItem:
    step = (
        db.query(CampaignStep)
        .filter(CampaignStep.id == step_id, CampaignStep.campaign_id == campaign_id)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="campaign step not found")
    item = _campaign_step_to_item(step)
    db.delete(step)
    db.commit()
    return item


# Campaign step executions
@router.get(
    "/api/marketing/campaigns/{campaign_id}/executions",
    response_model=CampaignStepExecutionListResponse,
)
def list_campaign_step_executions(
    campaign_id: int,
    step_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CampaignStepExecutionListResponse:
    query = db.query(CampaignStepExecution).filter(
        CampaignStepExecution.campaign_id == campaign_id
    )
    if step_id is not None:
        query = query.filter(CampaignStepExecution.step_id == step_id)
    if customer_id is not None:
        query = query.filter(CampaignStepExecution.customer_id == customer_id)
    if status:
        query = query.filter(CampaignStepExecution.status == status)
    executions = (
        query.order_by(CampaignStepExecution.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return CampaignStepExecutionListResponse(
        executions=[_campaign_step_execution_to_item(item) for item in executions]
    )


@router.post(
    "/api/marketing/campaigns/{campaign_id}/executions",
    response_model=CampaignStepExecutionItem,
)
def create_campaign_step_execution(
    campaign_id: int,
    payload: CampaignStepExecutionCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepExecutionItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    step = (
        db.query(CampaignStep)
        .filter(CampaignStep.id == payload.step_id, CampaignStep.campaign_id == campaign_id)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="campaign step not found")
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="customer not found")
    channel = payload.channel or step.channel
    channel = _normalize_step_channel(channel)
    now = datetime.utcnow()
    execution = CampaignStepExecution(
        campaign_id=campaign_id,
        step_id=payload.step_id,
        customer_id=payload.customer_id,
        channel=channel,
        status=(payload.status or "queued").strip(),
        message_id=payload.message_id,
        note=payload.note,
        created_at=now,
        updated_at=now,
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return _campaign_step_execution_to_item(execution)


@router.patch(
    "/api/marketing/campaigns/{campaign_id}/executions/{execution_id}",
    response_model=CampaignStepExecutionItem,
)
def update_campaign_step_execution(
    campaign_id: int,
    execution_id: int,
    payload: CampaignStepExecutionUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepExecutionItem:
    execution = (
        db.query(CampaignStepExecution)
        .filter(
            CampaignStepExecution.id == execution_id,
            CampaignStepExecution.campaign_id == campaign_id,
        )
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="campaign execution not found")
    if payload.status is not None:
        execution.status = payload.status
    if payload.message_id is not None:
        execution.message_id = payload.message_id
    if payload.note is not None:
        execution.note = payload.note
    execution.updated_at = datetime.utcnow()
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return _campaign_step_execution_to_item(execution)


@router.delete(
    "/api/marketing/campaigns/{campaign_id}/executions/{execution_id}",
    response_model=CampaignStepExecutionItem,
)
def delete_campaign_step_execution(
    campaign_id: int,
    execution_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CampaignStepExecutionItem:
    execution = (
        db.query(CampaignStepExecution)
        .filter(
            CampaignStepExecution.id == execution_id,
            CampaignStepExecution.campaign_id == campaign_id,
        )
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="campaign execution not found")
    item = _campaign_step_execution_to_item(execution)
    db.delete(execution)
    db.commit()
    return item


# Campaign customer progress
@router.get(
    "/api/marketing/campaigns/{campaign_id}/customers/progress",
    response_model=MarketingCustomerProgressResponse,
)
def get_campaign_customer_progress(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> MarketingCustomerProgressResponse:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")

    steps = (
        db.query(CampaignStep)
        .filter(CampaignStep.campaign_id == campaign_id)
        .order_by(CampaignStep.order_no)
        .all()
    )
    step_order = {step.id: step.order_no for step in steps}
    step_channel = {step.id: step.channel for step in steps}

    messages = (
        db.query(Message)
        .filter(
            Message.marketing_campaign_id == campaign_id,
            Message.direction == "outbound",
            Message.customer_id.isnot(None),
        )
        .order_by(Message.created_at.desc())
        .all()
    )

    progress_map: Dict[int, Dict[str, Any]] = {}
    for message in messages:
        customer_id = message.customer_id
        if not customer_id:
            continue
        order = step_order.get(message.campaign_step_id, 0)
        current = progress_map.get(customer_id)
        if current:
            if order < current["order"]:
                continue
            if order == current["order"] and message.created_at <= current["last_message_at"]:
                continue
        progress_map[customer_id] = {
            "step_id": message.campaign_step_id,
            "order": order,
            "channel": step_channel.get(message.campaign_step_id),
            "status": message.status,
            "last_message_at": message.created_at,
        }

    if not progress_map:
        return MarketingCustomerProgressResponse(campaign_id=campaign_id, total=0, customers=[])

    customer_ids = list(progress_map.keys())
    customers = db.query(Customer).filter(Customer.id.in_(customer_ids)).all()
    customer_map = {customer.id: customer for customer in customers}
    paused_ids = _load_paused_customer_ids(db, campaign_id)

    items: List[MarketingCustomerProgressItem] = []
    for customer_id, info in progress_map.items():
        customer = customer_map.get(customer_id)
        items.append(
            MarketingCustomerProgressItem(
                customer_id=customer_id,
                name=customer.name if customer else None,
                email=customer.email if customer else None,
                whatsapp=customer.whatsapp if customer else None,
                mobile=customer.mobile if customer else None,
                last_step_id=info.get("step_id"),
                last_step_order=info.get("order") or None,
                last_step_channel=info.get("channel"),
                last_message_status=info.get("status"),
                last_message_at=info.get("last_message_at"),
                paused=customer_id in paused_ids,
            )
        )

    items.sort(
        key=lambda item: item.last_message_at or datetime.min,
        reverse=True,
    )
    return MarketingCustomerProgressResponse(
        campaign_id=campaign_id, total=len(items), customers=items
    )


def _set_customer_state(
    db: Session, campaign_id: int, customer_id: int, status: str
) -> MarketingCustomerStateItem:
    state = (
        db.query(MarketingCustomerState)
        .filter(
            MarketingCustomerState.campaign_id == campaign_id,
            MarketingCustomerState.customer_id == customer_id,
        )
        .first()
    )
    now = datetime.utcnow()
    if state:
        state.status = status
        state.updated_at = now
    else:
        state = MarketingCustomerState(
            campaign_id=campaign_id,
            customer_id=customer_id,
            status=status,
            created_at=now,
            updated_at=now,
        )
        db.add(state)
    db.commit()
    db.refresh(state)
    return MarketingCustomerStateItem(
        campaign_id=state.campaign_id,
        customer_id=state.customer_id,
        status=state.status,
        updated_at=state.updated_at,
    )


@router.post(
    "/api/marketing/campaigns/{campaign_id}/customers/{customer_id}/pause",
    response_model=MarketingCustomerStateItem,
)
def pause_marketing_customer(
    campaign_id: int,
    customer_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCustomerStateItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="customer not found")
    return _set_customer_state(db, campaign_id, customer_id, "PAUSED")


@router.post(
    "/api/marketing/campaigns/{campaign_id}/customers/{customer_id}/resume",
    response_model=MarketingCustomerStateItem,
)
def resume_marketing_customer(
    campaign_id: int,
    customer_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MarketingCustomerStateItem:
    campaign = db.query(MarketingCampaign).filter(MarketingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="customer not found")
    return _set_customer_state(db, campaign_id, customer_id, "ACTIVE")
