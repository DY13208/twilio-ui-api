"""Message history and chat routes."""
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, func, case
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ApiKey, Message
from app.services.twilio_client import normalize_whatsapp
from app.schemas import (
    ChatHistoryResponse,
    ChatMessage,
    MarkReadRequest,
    MarkReadResponse,
    MessageStatus,
    SmsStatsResponse,
    TwilioMessageStatus,
    UserListResponse,
    UserMessageStats,
)
from app.dependencies import require_api_key, ensure_twilio


router = APIRouter(tags=["messages"])


def _message_to_status(message: Message) -> MessageStatus:
    return MessageStatus(
        id=message.id,
        batch_id=message.batch_id,
        channel=message.channel,
        to_address=message.to_address,
        from_address=message.from_address,
        subject=message.subject,
        status=message.status,
        provider_message_id=message.provider_message_id,
        error=message.error,
        parent_message_id=message.parent_message_id,
        followup_step=message.followup_step,
        read_at=message.read_at,
        created_at=message.created_at,
        updated_at=message.updated_at,
    )


def _message_to_chat(message: Message) -> ChatMessage:
    return ChatMessage(
        id=message.id,
        batch_id=message.batch_id,
        channel=message.channel,
        to_address=message.to_address,
        from_address=message.from_address,
        subject=message.subject,
        body=message.body,
        status=message.status,
        provider_message_id=message.provider_message_id,
        error=message.error,
        parent_message_id=message.parent_message_id,
        followup_step=message.followup_step,
        read_at=message.read_at,
        created_at=message.created_at,
        updated_at=message.updated_at,
    )


def _user_address_expr():
    return case(
        (Message.direction == "inbound", Message.from_address),
        else_=Message.to_address,
    )


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _load_chat_history(
    db: Session,
    address: str,
    channel: Optional[str],
    limit: int,
    offset: int,
) -> ChatHistoryResponse:
    cleaned_user = address.strip()
    normalized_user = None
    if cleaned_user and "@" not in cleaned_user:
        normalized_user = normalize_whatsapp(cleaned_user)

    base_filter = (Message.to_address == cleaned_user) | (
        Message.from_address == cleaned_user
    )
    if normalized_user and normalized_user != cleaned_user:
        base_filter = base_filter | (
            (Message.channel == "whatsapp")
            & (
                (Message.to_address == normalized_user)
                | (Message.from_address == normalized_user)
            )
        )

    query = db.query(Message).filter(base_filter)
    if channel:
        query = query.filter(Message.channel == channel)

    total = query.count()
    unread_count = query.filter(Message.read_at.is_(None)).count()
    messages = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
    return ChatHistoryResponse(
        messages=[_message_to_chat(m) for m in reversed(messages)],
        total=total,
        unread_count=unread_count,
    )


@router.get("/api/messages", response_model=List[MessageStatus])
def list_messages(
    batch_id: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> List[MessageStatus]:
    query = db.query(Message)
    if batch_id:
        query = query.filter(Message.batch_id == batch_id)
    if channel:
        query = query.filter(Message.channel == channel)
    if status:
        query = query.filter(Message.status == status)
    if direction:
        query = query.filter(Message.direction == direction)
    messages = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
    return [_message_to_status(m) for m in messages]


@router.get("/api/messages/{message_id}", response_model=ChatMessage)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> ChatMessage:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="message not found")
    return _message_to_chat(message)


@router.get("/api/messages/batch/{batch_id}", response_model=List[MessageStatus])
def get_batch_messages(
    batch_id: str,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> List[MessageStatus]:
    messages = (
        db.query(Message)
        .filter(Message.batch_id == batch_id)
        .order_by(Message.created_at.desc())
        .all()
    )
    return [_message_to_status(m) for m in messages]


@router.get("/api/chat/users", response_model=UserListResponse)
@router.get("/api/users", response_model=UserListResponse)
def list_chat_users(
    channel: Optional[str] = None,
    created_from: Optional[str] = None,
    created_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> UserListResponse:
    """List users with message stats for chat view."""
    from_datetime = _parse_datetime(created_from)
    to_datetime = _parse_datetime(created_to)

    user_address_expr = _user_address_expr().label("user_address")
    base_query = db.query(user_address_expr)

    if channel:
        base_query = base_query.filter(Message.channel == channel)
    if from_datetime:
        base_query = base_query.filter(Message.created_at >= from_datetime)
    if to_datetime:
        base_query = base_query.filter(Message.created_at <= to_datetime)
    base_query = base_query.filter(user_address_expr.isnot(None), user_address_expr != "")

    distinct_users = base_query.distinct().all()
    total_users = len(distinct_users)
    paginated_users = distinct_users[offset : offset + limit]

    user_stats_list = []
    for (user_address,) in paginated_users:
        user_filter = (Message.to_address == user_address) | (
            Message.from_address == user_address
        )
        user_query = db.query(Message).filter(user_filter)

        if channel:
            user_query = user_query.filter(Message.channel == channel)
        if from_datetime:
            user_query = user_query.filter(Message.created_at >= from_datetime)
        if to_datetime:
            user_query = user_query.filter(Message.created_at <= to_datetime)

        total_messages = user_query.count()
        unread_count = user_query.filter(Message.read_at.is_(None)).count()

        last_message = user_query.order_by(Message.created_at.desc()).first()
        last_message_at = last_message.created_at if last_message else None

        channels_query = db.query(Message.channel).filter(user_filter).distinct()
        if channel:
            channels_query = channels_query.filter(Message.channel == channel)
        if from_datetime:
            channels_query = channels_query.filter(Message.created_at >= from_datetime)
        if to_datetime:
            channels_query = channels_query.filter(Message.created_at <= to_datetime)

        channels = [ch[0] for ch in channels_query.all()]

        user_stats_list.append(
            UserMessageStats(
                user_address=user_address,
                total_messages=total_messages,
                unread_count=unread_count,
                last_message_at=last_message_at,
                channels=channels,
            )
        )

    user_stats_list.sort(
        key=lambda item: item.last_message_at or datetime.min, reverse=True
    )
    return UserListResponse(users=user_stats_list, total=total_users)


@router.get("/api/chat/history", response_model=ChatHistoryResponse)
def get_chat_history(
    address: str,
    channel: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> ChatHistoryResponse:
    """Get chat history with a specific user/address."""
    return _load_chat_history(db, address, channel, limit, offset)


@router.get("/api/chat/{user_address}", response_model=ChatHistoryResponse)
def get_chat_history_by_address(
    user_address: str,
    channel: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> ChatHistoryResponse:
    """Compatibility alias for chat history by address."""
    return _load_chat_history(db, user_address, channel, limit, offset)


@router.post("/api/chat/mark-read", response_model=MarkReadResponse)
def mark_messages_read(
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> MarkReadResponse:
    """Mark messages as read."""
    now = datetime.utcnow()
    updated_count = 0
    
    if payload.message_ids:
        updated_count = (
            db.query(Message)
            .filter(Message.id.in_(payload.message_ids), Message.read_at.is_(None))
            .update({"read_at": now, "updated_at": now}, synchronize_session=False)
        )
    elif payload.address:
        query = db.query(Message).filter(
            Message.from_address == payload.address,
            Message.direction == "inbound",
            Message.read_at.is_(None),
        )
        if payload.channel:
            query = query.filter(Message.channel == payload.channel)
        updated_count = query.update({"read_at": now, "updated_at": now}, synchronize_session=False)
    
    db.commit()
    return MarkReadResponse(updated_count=updated_count)


@router.get("/api/sms/stats", response_model=SmsStatsResponse)
def get_sms_stats(
    campaign_id: Optional[int] = None,
    batch_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsStatsResponse:
    """Get SMS statistics."""
    query = db.query(Message).filter(Message.channel == "sms")
    if campaign_id:
        query = query.filter(Message.campaign_id == campaign_id)
    if batch_id:
        query = query.filter(Message.batch_id == batch_id)
    
    counts = dict(
        query.with_entities(Message.status, func.count(Message.id))
        .group_by(Message.status)
        .all()
    )
    total = sum(counts.values())
    cost = query.with_entities(func.sum(Message.price)).scalar()
    price_unit = (
        query.with_entities(Message.price_unit)
        .filter(Message.price_unit.isnot(None))
        .first()
    )
    price_unit_value = price_unit[0] if price_unit else None
    
    return SmsStatsResponse(
        total=total,
        delivered=counts.get("delivered", 0),
        failed=counts.get("failed", 0),
        undelivered=counts.get("undelivered", 0),
        queued=counts.get("queued", 0),
        sent=counts.get("sent", 0),
        received=counts.get("received", 0),
        blocked=counts.get("blocked", 0),
        cost=float(cost) if cost is not None else None,
        price_unit=price_unit_value,
    )


@router.get("/api/twilio/message/{message_sid}", response_model=TwilioMessageStatus)
def get_twilio_message_status(
    message_sid: str,
    use_proxy: Optional[bool] = None,
    _: ApiKey = Depends(require_api_key("read")),
) -> TwilioMessageStatus:
    """Get message status directly from Twilio API."""
    twilio = ensure_twilio()
    try:
        data = twilio.get_message(message_sid, use_proxy=use_proxy)
        return TwilioMessageStatus(
            sid=data.get("sid"),
            status=data.get("status"),
            error_code=data.get("error_code"),
            error_message=data.get("error_message"),
            price=data.get("price"),
            price_unit=data.get("price_unit"),
            num_segments=data.get("num_segments"),
            date_created=data.get("date_created"),
            date_updated=data.get("date_updated"),
            date_sent=data.get("date_sent"),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
