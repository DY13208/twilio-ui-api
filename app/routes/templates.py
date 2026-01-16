"""Message template management routes."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ApiKey, MessageTemplate
from app.schemas import (
    MessageTemplateCreate,
    MessageTemplateItem,
    MessageTemplateListResponse,
    MessageTemplateUpdate,
)
from app.dependencies import require_api_key


router = APIRouter(tags=["templates"])


def _message_template_to_item(template: MessageTemplate) -> MessageTemplateItem:
    return MessageTemplateItem(
        id=template.id,
        channel=template.channel,
        name=template.name,
        language=template.language,
        subject=template.subject,
        content=template.content,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get("/api/message-templates", response_model=MessageTemplateListResponse)
@router.get("/api/templates", response_model=MessageTemplateListResponse)
def list_message_templates(
    channel: Optional[str] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> MessageTemplateListResponse:
    query = db.query(MessageTemplate)
    if channel:
        query = query.filter(MessageTemplate.channel == channel.upper())
    templates = query.order_by(MessageTemplate.created_at.desc()).all()
    return MessageTemplateListResponse(templates=[_message_template_to_item(t) for t in templates])


@router.post("/api/message-templates", response_model=MessageTemplateItem)
@router.post("/api/templates", response_model=MessageTemplateItem)
def create_message_template(
    payload: MessageTemplateCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MessageTemplateItem:
    channel = payload.channel.strip().upper()
    if channel not in {"EMAIL", "WHATSAPP", "SMS"}:
        raise HTTPException(status_code=400, detail="invalid channel")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    now = datetime.utcnow()
    template = MessageTemplate(
        channel=channel,
        name=name,
        language=payload.language,
        subject=payload.subject,
        content=payload.content,
        created_at=now,
        updated_at=now,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _message_template_to_item(template)


@router.patch("/api/message-templates/{template_id}", response_model=MessageTemplateItem)
@router.patch("/api/templates/{template_id}", response_model=MessageTemplateItem)
def update_message_template(
    template_id: int,
    payload: MessageTemplateUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MessageTemplateItem:
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="template not found")
    if payload.channel is not None:
        channel = payload.channel.strip().upper()
        if channel not in {"EMAIL", "WHATSAPP", "SMS"}:
            raise HTTPException(status_code=400, detail="invalid channel")
        template.channel = channel
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        template.name = name
    if payload.language is not None:
        template.language = payload.language
    if payload.subject is not None:
        template.subject = payload.subject
    if payload.content is not None:
        template.content = payload.content
    template.updated_at = datetime.utcnow()
    db.add(template)
    db.commit()
    db.refresh(template)
    return _message_template_to_item(template)


@router.delete("/api/message-templates/{template_id}", response_model=MessageTemplateItem)
@router.delete("/api/templates/{template_id}", response_model=MessageTemplateItem)
def delete_message_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> MessageTemplateItem:
    template = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="template not found")
    item = _message_template_to_item(template)
    db.delete(template)
    db.commit()
    return item
