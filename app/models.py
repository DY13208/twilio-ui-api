from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
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
    provider_message_id = Column(String(128), index=True)
    error = Column(Text)
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
