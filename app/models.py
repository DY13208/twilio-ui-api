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
