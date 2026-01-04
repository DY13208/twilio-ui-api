from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

try:
    from pydantic import ConfigDict
except ImportError:  # pragma: no cover - pydantic v1 fallback
    ConfigDict = None


class EmailSendRequest(BaseModel):
    recipients: List[EmailStr] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    text: Optional[str] = None
    html: Optional[str] = None
    from_email: Optional[EmailStr] = None


class EmailSenderCreate(BaseModel):
    from_email: EmailStr


class EmailSenderItem(BaseModel):
    from_email: EmailStr
    from_name: Optional[str] = None


class EmailSendersResponse(BaseModel):
    senders: List[EmailSenderItem]


class EmailSenderUpsertResponse(BaseModel):
    from_email: EmailStr
    status: str
    senders: List[EmailSenderItem]


class WhatsAppSendRequest(BaseModel):
    recipients: List[str] = Field(..., min_length=1)
    body: Optional[str] = None
    media_urls: Optional[List[str]] = None
    from_address: Optional[str] = None
    content_sid: Optional[str] = None
    content_variables: Optional[Dict[str, str]] = None
    use_proxy: Optional[bool] = None


class WhatsAppSenderCreate(BaseModel):
    from_address: str = Field(..., min_length=1)


class WhatsAppSendersResponse(BaseModel):
    senders: List[str]


class WhatsAppSenderUpsertResponse(BaseModel):
    from_address: str
    status: str
    senders: List[str]


class WhatsAppTemplateItem(BaseModel):
    sid: str
    friendly_name: Optional[str] = None
    language: Optional[str] = None
    types: Optional[List[str]] = None
    status: Optional[str] = None
    variables: Optional[List[str]] = None
    whatsapp_eligibility: Optional[List[str]] = None


class WhatsAppTemplatesResponse(BaseModel):
    templates: List[WhatsAppTemplateItem]
    next_page_token: Optional[str] = None
    previous_page_token: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    status: str
    token: Optional[str] = None


class ApiKeyCreate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    expires_in_days: Optional[int] = None


class ApiKeyItem(BaseModel):
    id: int
    name: Optional[str] = None
    prefix: str
    scope: str
    expires_at: Optional[datetime] = None
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class ApiKeyListResponse(BaseModel):
    keys: List[ApiKeyItem]


class ApiKeyCreateResponse(BaseModel):
    id: int
    name: Optional[str] = None
    prefix: str
    scope: str
    expires_at: Optional[datetime] = None
    api_key: str
    created_at: datetime


class AdminUserCreate(BaseModel):
    username: str
    password: str


class AdminUserItem(BaseModel):
    id: int
    username: str
    created_at: datetime
    disabled_at: Optional[datetime] = None


class AdminUserListResponse(BaseModel):
    users: List[AdminUserItem]


class TwilioMessageStatus(BaseModel):
    sid: str
    status: Optional[str] = None
    to: Optional[str] = None
    from_address: Optional[str] = None
    direction: Optional[str] = None
    error_code: Optional[int] = None
    error_message: Optional[str] = None
    price: Optional[str] = None
    price_unit: Optional[str] = None
    num_segments: Optional[str] = None
    num_media: Optional[str] = None
    messaging_service_sid: Optional[str] = None
    date_created: Optional[datetime] = None
    date_updated: Optional[datetime] = None
    date_sent: Optional[datetime] = None
    body: Optional[str] = None
    account_sid: Optional[str] = None
    api_version: Optional[str] = None
    uri: Optional[str] = None


class SendResult(BaseModel):
    message_id: int
    recipient: str
    status: str
    provider_message_id: Optional[str] = None
    error: Optional[str] = None


class SendResponse(BaseModel):
    batch_id: str
    channel: str
    results: List[SendResult]


class MessageStatus(BaseModel):
    id: int
    batch_id: str
    channel: str
    to_address: str
    from_address: str
    subject: Optional[str]
    status: str
    provider_message_id: Optional[str]
    error: Optional[str]
    created_at: datetime
    updated_at: datetime

    if ConfigDict:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:  # pydantic v1 compatibility
            orm_mode = True
