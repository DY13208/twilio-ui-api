from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import declarative_base


Base = declarative_base()


class Message(Base):
    __tablename__ = "broadcast_messages"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(64), index=True, nullable=False)
    channel = Column(String(16), index=True, nullable=False)
    to_address = Column(String(255), nullable=False)
    from_address = Column(String(255), nullable=False)
    subject = Column(String(255))
    body = Column(Text)
    status = Column(String(32), index=True, nullable=False)
    direction = Column(String(16), index=True, nullable=False, default="outbound")
    provider_message_id = Column(String(128), index=True)
    campaign_id = Column(Integer, index=True)
    marketing_campaign_id = Column(Integer, index=True)
    campaign_step_id = Column(Integer, index=True)
    message_template_id = Column(Integer, index=True)
    customer_id = Column(Integer, index=True)
    parent_message_id = Column(Integer, index=True)
    followup_step = Column(Integer)
    template_id = Column(Integer, index=True)
    variant = Column(String(8))
    price = Column(Numeric(10, 4))
    price_unit = Column(String(8))
    num_segments = Column(Integer)
    error = Column(Text)
    read_at = Column(DateTime, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class WhatsAppSender(Base):
    __tablename__ = "whatsapp_senders"

    id = Column(Integer, primary_key=True, index=True)
    from_address = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EmailSender(Base):
    __tablename__ = "email_senders"

    id = Column(Integer, primary_key=True, index=True)
    from_email = Column(String(255), unique=True, nullable=False)
    from_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    prefix = Column(String(16), index=True, nullable=False)
    key_hash = Column(String(64), unique=True, index=True, nullable=False)
    admin_user_id = Column(Integer, index=True)
    scope = Column(String(32), nullable=False, default="manage")
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime)
    revoked_at = Column(DateTime)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    disabled_at = Column(DateTime)


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    admin_user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsTemplate(Base):
    __tablename__ = "sms_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    body = Column(Text, nullable=False)
    variables = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    disabled_at = Column(DateTime)


class SmsContact(Base):
    __tablename__ = "sms_contacts"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128))
    tags = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    disabled_at = Column(DateTime)


class SmsGroup(Base):
    __tablename__ = "sms_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsGroupMember(Base):
    __tablename__ = "sms_group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, index=True, nullable=False)
    contact_id = Column(Integer, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SmsCampaign(Base):
    __tablename__ = "sms_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    template_id = Column(Integer, index=True)
    template_variables = Column(Text)
    message = Column(Text)
    variant_a = Column(Text)
    variant_b = Column(Text)
    ab_split = Column(Integer)
    status = Column(String(32), index=True, nullable=False, default="draft")
    schedule_at = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    from_number = Column(String(64))
    messaging_service_sid = Column(String(64))
    rate_per_minute = Column(Integer)
    batch_size = Column(Integer)
    append_opt_out = Column(Boolean, nullable=False, default=True)
    target_groups = Column(Text)
    target_tags = Column(Text)
    target_recipients = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    from_email = Column(String(255))
    subject = Column(String(255))
    text = Column(Text)
    html = Column(Text)
    recipients = Column(Text)
    status = Column(String(32), index=True, nullable=False, default="draft")
    error = Column(Text)
    schedule_at = Column(DateTime)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    followup_enabled = Column(Boolean, nullable=False, default=False)
    followup_delay_minutes = Column(Integer)
    followup_condition = Column(String(16))
    followup_subject = Column(String(255))
    followup_text = Column(Text)
    followup_html = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255), index=True)
    whatsapp = Column(String(64), index=True)
    mobile = Column(String(64), index=True)
    country = Column(String(64))
    country_code = Column(String(16))
    tags = Column(Text)
    has_marketed = Column(Boolean, nullable=False, default=False)
    last_campaign_id = Column(Integer, index=True)
    last_marketed_at = Column(DateTime)
    email_sent_count = Column(Integer, nullable=False, default=0)
    whatsapp_sent_count = Column(Integer, nullable=False, default=0)
    sms_sent_count = Column(Integer, nullable=False, default=0)
    last_email_status = Column(String(32))
    last_whatsapp_status = Column(String(32))
    last_sms_status = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CustomerGroup(Base):
    __tablename__ = "customer_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CustomerGroupMember(Base):
    __tablename__ = "customer_group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, index=True, nullable=False)
    customer_id = Column(Integer, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id = Column(Integer, primary_key=True, index=True)
    channel = Column(String(16), index=True, nullable=False)
    name = Column(String(128), nullable=False)
    language = Column(String(16))
    subject = Column(String(255))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MarketingCampaign(Base):
    __tablename__ = "marketing_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    type = Column(String(16), index=True, nullable=False, default="MIXED")
    status = Column(String(16), index=True, nullable=False, default="DRAFT")
    run_immediately = Column(Boolean, nullable=False, default=True)
    schedule_time = Column(DateTime)
    target_customer_ids = Column(Text)
    filter_rules = Column(Text)
    created_by = Column(String(64))
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CampaignStep(Base):
    __tablename__ = "campaign_steps"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, index=True, nullable=False)
    order_no = Column(Integer, nullable=False)
    channel = Column(String(16), nullable=False)
    delay_days = Column(Integer, nullable=False, default=0)
    filter_rules = Column(Text)
    template_id = Column(Integer, index=True)
    subject = Column(String(255))
    content = Column(Text)
    content_sid = Column(String(64))
    content_variables = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CampaignStepExecution(Base):
    __tablename__ = "campaign_step_executions"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, index=True, nullable=False)
    step_id = Column(Integer, index=True, nullable=False)
    customer_id = Column(Integer, index=True, nullable=False)
    channel = Column(String(16), nullable=False)
    status = Column(String(32), nullable=False, default="queued")
    message_id = Column(Integer, index=True)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MarketingCustomerState(Base):
    __tablename__ = "marketing_customer_states"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, index=True, nullable=False)
    customer_id = Column(Integer, index=True, nullable=False)
    status = Column(String(16), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsKeywordRule(Base):
    __tablename__ = "sms_keyword_rules"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String(64), nullable=False)
    match_type = Column(String(16), nullable=False, default="contains")
    response_text = Column(Text, nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SmsOptOut(Base):
    __tablename__ = "sms_opt_outs"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(32), unique=True, index=True, nullable=False)
    reason = Column(String(128))
    source = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SmsBlacklist(Base):
    __tablename__ = "sms_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(32), unique=True, index=True, nullable=False)
    reason = Column(String(128))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
