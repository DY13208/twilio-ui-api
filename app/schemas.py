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
    admin_user_id: Optional[int] = None
    username: Optional[str] = None
    expires_at: Optional[datetime] = None


class ApiKeyCreate(BaseModel):
    name: Optional[str] = None
    scope: Optional[str] = None
    expires_in_days: Optional[int] = None
    admin_user_id: Optional[int] = None


class ApiKeyUpdate(BaseModel):
    scope: Optional[str] = None
    admin_user_id: Optional[int] = None


class ApiKeyItem(BaseModel):
    id: int
    name: Optional[str] = None
    prefix: str
    scope: str
    admin_user_id: Optional[int] = None
    admin_username: Optional[str] = None
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
    admin_user_id: Optional[int] = None
    admin_username: Optional[str] = None
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


class SendgridWebhookLogSettings(BaseModel):
    enabled: bool
    max_lines: Optional[int] = None
    auto_close: bool
    path: Optional[str] = None


class SendgridWebhookLogSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    max_lines: Optional[int] = None
    auto_close: Optional[bool] = None


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
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    if ConfigDict:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:  # pydantic v1 compatibility
            orm_mode = True


class ChatMessage(BaseModel):
    id: int
    batch_id: str
    channel: str
    to_address: str
    from_address: str
    subject: Optional[str]
    body: Optional[str]
    status: str
    provider_message_id: Optional[str]
    error: Optional[str]
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    if ConfigDict:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:  # pydantic v1 compatibility
            orm_mode = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessage]
    total: int
    unread_count: int


class MarkReadRequest(BaseModel):
    message_ids: List[int] = Field(..., min_length=1)


class MarkReadResponse(BaseModel):
    updated: int


class UserMessageStats(BaseModel):
    user_address: str
    total_messages: int
    unread_count: int
    last_message_at: Optional[datetime] = None
    channels: List[str] = []


class UserListResponse(BaseModel):
    users: List[UserMessageStats]
    total: int


class SmsTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    variables: Optional[List[str]] = None


class SmsTemplateUpdate(BaseModel):
    name: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[List[str]] = None
    disabled: Optional[bool] = None


class SmsTemplateItem(BaseModel):
    id: int
    name: str
    body: str
    variables: Optional[List[str]] = None
    disabled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SmsTemplateListResponse(BaseModel):
    templates: List[SmsTemplateItem]


class SmsContactCreate(BaseModel):
    phone: str = Field(..., min_length=1)
    name: Optional[str] = None
    tags: Optional[List[str]] = None


class SmsContactUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None
    disabled: Optional[bool] = None


class SmsContactItem(BaseModel):
    id: int
    phone: str
    name: Optional[str] = None
    tags: List[str] = []
    disabled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SmsContactListResponse(BaseModel):
    contacts: List[SmsContactItem]
    total: int


class SmsGroupCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None


class SmsGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SmsGroupItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class SmsGroupListResponse(BaseModel):
    groups: List[SmsGroupItem]


class SmsGroupMembersRequest(BaseModel):
    contact_ids: Optional[List[int]] = None
    phones: Optional[List[str]] = None


class SmsGroupMembersResponse(BaseModel):
    group_id: int
    members: List[SmsContactItem]


class SmsCampaignCreate(BaseModel):
    name: str = Field(..., min_length=1)
    message: Optional[str] = None
    template_id: Optional[int] = None
    template_variables: Optional[Dict[str, str]] = None
    variant_a: Optional[str] = None
    variant_b: Optional[str] = None
    ab_split: Optional[int] = None
    schedule_at: Optional[datetime] = None
    from_number: Optional[str] = None
    messaging_service_sid: Optional[str] = None
    rate_per_minute: Optional[int] = None
    batch_size: Optional[int] = None
    append_opt_out: Optional[bool] = None
    group_ids: Optional[List[int]] = None
    tags: Optional[List[str]] = None
    recipients: Optional[List[str]] = None


class SmsCampaignUpdate(BaseModel):
    name: Optional[str] = None
    message: Optional[str] = None
    template_id: Optional[int] = None
    template_variables: Optional[Dict[str, str]] = None
    variant_a: Optional[str] = None
    variant_b: Optional[str] = None
    ab_split: Optional[int] = None
    schedule_at: Optional[datetime] = None
    from_number: Optional[str] = None
    messaging_service_sid: Optional[str] = None
    rate_per_minute: Optional[int] = None
    batch_size: Optional[int] = None
    append_opt_out: Optional[bool] = None
    group_ids: Optional[List[int]] = None
    tags: Optional[List[str]] = None
    recipients: Optional[List[str]] = None
    status: Optional[str] = None


class SmsCampaignItem(BaseModel):
    id: int
    name: str
    message: Optional[str] = None
    template_id: Optional[int] = None
    template_variables: Optional[Dict[str, str]] = None
    variant_a: Optional[str] = None
    variant_b: Optional[str] = None
    ab_split: Optional[int] = None
    status: str
    schedule_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    from_number: Optional[str] = None
    messaging_service_sid: Optional[str] = None
    rate_per_minute: Optional[int] = None
    batch_size: Optional[int] = None
    append_opt_out: Optional[bool] = None
    group_ids: List[int] = []
    tags: List[str] = []
    recipients: List[str] = []
    created_at: datetime
    updated_at: datetime


class SmsCampaignListResponse(BaseModel):
    campaigns: List[SmsCampaignItem]


class SmsCampaignStatsResponse(BaseModel):
    campaign_id: int
    total: int
    delivered: int
    failed: int
    undelivered: int
    queued: int
    sent: int
    received: int
    blocked: int
    cost: Optional[float] = None
    price_unit: Optional[str] = None
    variants: Optional[Dict[str, Dict[str, int]]] = None


class SmsSendRequest(BaseModel):
    recipients: List[str] = Field(..., min_length=1)
    message: Optional[str] = None
    template_id: Optional[int] = None
    template_variables: Optional[Dict[str, str]] = None
    from_number: Optional[str] = None
    messaging_service_sid: Optional[str] = None
    rate_per_minute: Optional[int] = None
    batch_size: Optional[int] = None
    append_opt_out: Optional[bool] = None


class SmsKeywordRuleCreate(BaseModel):
    keyword: str = Field(..., min_length=1)
    match_type: str = Field(..., min_length=1)
    response_text: str = Field(..., min_length=1)
    enabled: Optional[bool] = True


class SmsKeywordRuleUpdate(BaseModel):
    keyword: Optional[str] = None
    match_type: Optional[str] = None
    response_text: Optional[str] = None
    enabled: Optional[bool] = None


class SmsKeywordRuleItem(BaseModel):
    id: int
    keyword: str
    match_type: str
    response_text: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class SmsKeywordRuleListResponse(BaseModel):
    rules: List[SmsKeywordRuleItem]


class SmsOptOutCreate(BaseModel):
    phone: str = Field(..., min_length=1)
    reason: Optional[str] = None
    source: Optional[str] = None


class SmsOptOutItem(BaseModel):
    id: int
    phone: str
    reason: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime


class SmsOptOutListResponse(BaseModel):
    opt_outs: List[SmsOptOutItem]


class SmsBlacklistCreate(BaseModel):
    phone: str = Field(..., min_length=1)
    reason: Optional[str] = None


class SmsBlacklistItem(BaseModel):
    id: int
    phone: str
    reason: Optional[str] = None
    created_at: datetime


class SmsBlacklistListResponse(BaseModel):
    blacklist: List[SmsBlacklistItem]


class SmsStatsResponse(BaseModel):
    total: int
    delivered: int
    failed: int
    undelivered: int
    queued: int
    sent: int
    received: int
    blocked: int
    cost: Optional[float] = None
    price_unit: Optional[str] = None
