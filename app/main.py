from datetime import datetime, timedelta
from email.utils import getaddresses
import base64
import csv
import html as html_lib
import io
import os
import random
import re
import threading
import time
import hashlib
import hmac
import json
import posixpath
from pathlib import Path
import secrets
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text, func, distinct, case
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, engine, get_db
from app.models import (
    AdminSession,
    AdminUser,
    ApiKey,
    AppSetting,
    Base,
    EmailSender,
    Message,
    WhatsAppSender,
    SmsTemplate,
    SmsContact,
    SmsGroup,
    SmsGroupMember,
    SmsCampaign,
    SmsKeywordRule,
    SmsOptOut,
    SmsBlacklist,
)
from app.schemas import (
    ApiKeyCreate,
    ApiKeyCreateResponse,
    ApiKeyItem,
    ApiKeyListResponse,
    ApiKeyUpdate,
    AdminUserCreate,
    AdminUserItem,
    AdminUserListResponse,
    ChatHistoryResponse,
    ChatMessage,
    EmailSendRequest,
    EmailSenderCreate,
    EmailSenderItem,
    EmailSenderUpsertResponse,
    EmailSendersResponse,
    LoginRequest,
    LoginResponse,
    MarkReadRequest,
    MarkReadResponse,
    MessageStatus,
    SendgridWebhookLogSettings,
    SendgridWebhookLogSettingsUpdate,
    SendResponse,
    SendResult,
    SmsTemplateCreate,
    SmsTemplateUpdate,
    SmsTemplateItem,
    SmsTemplateListResponse,
    SmsContactCreate,
    SmsContactUpdate,
    SmsContactItem,
    SmsContactListResponse,
    SmsGroupCreate,
    SmsGroupUpdate,
    SmsGroupItem,
    SmsGroupListResponse,
    SmsGroupMembersRequest,
    SmsGroupMembersResponse,
    SmsCampaignCreate,
    SmsCampaignUpdate,
    SmsCampaignItem,
    SmsCampaignListResponse,
    SmsCampaignStatsResponse,
    SmsSendRequest,
    SmsKeywordRuleCreate,
    SmsKeywordRuleUpdate,
    SmsKeywordRuleItem,
    SmsKeywordRuleListResponse,
    SmsOptOutCreate,
    SmsOptOutItem,
    SmsOptOutListResponse,
    SmsBlacklistCreate,
    SmsBlacklistItem,
    SmsBlacklistListResponse,
    SmsStatsResponse,
    TwilioMessageStatus,
    UserListResponse,
    UserMessageStats,
    WhatsAppSenderCreate,
    WhatsAppSenderUpsertResponse,
    WhatsAppSendersResponse,
    WhatsAppSendRequest,
    WhatsAppTemplateItem,
    WhatsAppTemplatesResponse,
)
from app.services.sendgrid_client import SendGridService
from app.services.twilio_client import TwilioService, normalize_whatsapp


app = FastAPI(title="Twilio Broadcast Console")

static_dir = Path(__file__).resolve().parent / "static"
_sms_scheduler_started = False


class AuthStaticFiles(StaticFiles):
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await super().__call__(scope, receive, send)
            return
        request = Request(scope, receive=receive)
        db = SessionLocal()
        try:
            session = _get_admin_session(request, db)
        finally:
            db.close()
        if not session:
            response = RedirectResponse(url=_login_redirect_path(request))
            await response(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


app.mount("/static", AuthStaticFiles(directory=static_dir), name="static")

ADMIN_COOKIE_NAME = "admin_session"
API_KEY_HEADER = "X-API-Key"
ADMIN_TOKEN_HEADER = "Authorization"
ADMIN_TOKEN_PREFIX = "Bearer "
SENDGRID_LOG_ENABLED_KEY = "sendgrid_webhook_log_enabled"
SENDGRID_LOG_MAX_LINES_KEY = "sendgrid_webhook_log_max_lines"
SENDGRID_LOG_AUTO_CLOSE_KEY = "sendgrid_webhook_log_auto_close"
_sendgrid_webhook_log_lock = threading.Lock()


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_schema()
    with SessionLocal() as db:
        _bootstrap_admin_user(db)
    _start_sms_scheduler()


@app.get("/", response_class=FileResponse)
def index(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "index.html", media_type="text/html; charset=utf-8")


@app.get("/login", response_class=FileResponse)
def login_page() -> FileResponse:
    return FileResponse(static_dir / "login.html", media_type="text/html; charset=utf-8")


@app.get("/keys", response_class=FileResponse)
def keys_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "keys.html", media_type="text/html; charset=utf-8")


@app.get("/users", response_class=FileResponse)
def users_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "users.html", media_type="text/html; charset=utf-8")


@app.get("/settings", response_class=FileResponse)
def settings_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "settings.html", media_type="text/html; charset=utf-8")


@app.get("/api-docs", response_class=FileResponse)
def api_docs(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "api.html", media_type="text/html; charset=utf-8")


@app.get("/chat", response_class=FileResponse)
def chat_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "chat.html", media_type="text/html; charset=utf-8")


@app.get("/sms", response_class=FileResponse)
def sms_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not _get_admin_session(request, db):
        return RedirectResponse(url=_login_redirect_path(request))
    return FileResponse(static_dir / "sms.html", media_type="text/html; charset=utf-8")


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
        read_at=message.read_at,
        created_at=message.created_at,
        updated_at=message.updated_at,
    )


def _sms_template_to_item(template: SmsTemplate) -> SmsTemplateItem:
    return SmsTemplateItem(
        id=template.id,
        name=template.name,
        body=template.body,
        variables=_deserialize_json_list(template.variables),
        disabled_at=template.disabled_at,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


def _sms_contact_to_item(contact: SmsContact) -> SmsContactItem:
    return SmsContactItem(
        id=contact.id,
        phone=contact.phone,
        name=contact.name,
        tags=_deserialize_tags(contact.tags),
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
        template_variables=_deserialize_json_dict(campaign.template_variables),
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
        group_ids=[int(value) for value in _deserialize_json_list(campaign.target_groups) if str(value).isdigit()],
        tags=[str(value) for value in _deserialize_json_list(campaign.target_tags)],
        recipients=[str(value) for value in _deserialize_json_list(campaign.target_recipients)],
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _sms_keyword_rule_to_item(rule: SmsKeywordRule) -> SmsKeywordRuleItem:
    return SmsKeywordRuleItem(
        id=rule.id,
        keyword=rule.keyword,
        match_type=rule.match_type,
        response_text=rule.response_text,
        enabled=rule.enabled,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


def _public_url(request: Request) -> str:
    base = settings.public_base_url
    if base:
        base = base.rstrip("/")
        return f"{base}{request.url.path}" + (f"?{request.url.query}" if request.url.query else "")
    return str(request.url)


def _login_redirect_path(request: Request) -> str:
    path = request.url.path or "/"
    base_dir = posixpath.dirname(path) or "/"
    return posixpath.relpath("/login", base_dir)


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 200_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${dk.hex()}"


def _verify_password(password: str, hashed: str) -> bool:
    try:
        algorithm, iterations, salt, digest = hashed.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        )
        return secrets.compare_digest(dk.hex(), digest)
    except Exception:
        return False


def _get_admin_jwt_secret() -> str:
    if settings.admin_jwt_secret:
        return settings.admin_jwt_secret
    if settings.admin_password:
        return settings.admin_password
    raise HTTPException(status_code=500, detail="ADMIN_JWT_SECRET is not configured")


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _encode_admin_jwt(payload: Dict[str, Any], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_encoded = _base64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    payload_encoded = _base64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header_encoded}.{payload_encoded}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_encoded}.{payload_encoded}.{_base64url_encode(signature)}"


def _decode_admin_jwt(token: str, secret: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="admin token is invalid")
    try:
        header_raw = _base64url_decode(parts[0])
        payload_raw = _base64url_decode(parts[1])
    except Exception:
        raise HTTPException(status_code=401, detail="admin token is invalid")
    signature_raw = parts[2]
    signing_input = f"{parts[0]}.{parts[1]}".encode("ascii")
    expected_signature = _base64url_encode(
        hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    )
    if not secrets.compare_digest(expected_signature, signature_raw):
        raise HTTPException(status_code=401, detail="admin token is invalid")
    try:
        header = json.loads(header_raw)
        payload = json.loads(payload_raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=401, detail="admin token is invalid")
    if header.get("alg") != "HS256":
        raise HTTPException(status_code=401, detail="admin token is invalid")
    exp = payload.get("exp")
    if exp is not None:
        try:
            exp_value = int(exp)
        except (TypeError, ValueError):
            raise HTTPException(status_code=401, detail="admin token is invalid")
        if exp_value <= int(datetime.utcnow().timestamp()):
            raise HTTPException(status_code=401, detail="admin token is expired")
    return payload


def _issue_admin_jwt(session: AdminSession, user: AdminUser) -> str:
    secret = _get_admin_jwt_secret()
    now = int(datetime.utcnow().timestamp())
    expires_at = int(session.expires_at.timestamp())
    payload = {
        "sub": user.id,
        "username": user.username,
        "sid": session.token,
        "iat": now,
        "exp": expires_at,
    }
    return _encode_admin_jwt(payload, secret)


def _bootstrap_admin_user(db: Session) -> None:
    if not settings.admin_username or not settings.admin_password:
        return
    user = db.query(AdminUser).filter(AdminUser.username == settings.admin_username).first()
    password_hash = _hash_password(settings.admin_password)
    if user:
        user.password_hash = password_hash
        user.disabled_at = None
    else:
        user = AdminUser(
            username=settings.admin_username,
            password_hash=password_hash,
            created_at=datetime.utcnow(),
        )
        db.add(user)
    db.commit()


def _column_names(inspector, table_name: str) -> set:
    return {column["name"] for column in inspector.get_columns(table_name)}


def _ensure_table_columns(conn, inspector, table_name: str, columns: Dict[str, str]) -> None:
    if not inspector.has_table(table_name):
        return
    existing = _column_names(inspector, table_name)
    for column_name, ddl in columns.items():
        if column_name in existing:
            continue
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _ensure_schema() -> None:
    inspector = inspect(engine)
    with engine.begin() as conn:
        admin_sessions_missing_user = False
        if inspector.has_table("admin_sessions"):
            admin_sessions_missing_user = (
                "admin_user_id" not in _column_names(inspector, "admin_sessions")
            )
        if inspector.has_table("admin_sessions"):
            if admin_sessions_missing_user:
                conn.execute(text("ALTER TABLE admin_sessions ADD COLUMN admin_user_id INT NULL"))
            if inspector.has_table("admin_users"):
                result = conn.execute(
                    text("SELECT id FROM admin_users ORDER BY id LIMIT 1")
                ).first()
                if result:
                    conn.execute(
                        text(
                            "UPDATE admin_sessions SET admin_user_id=:user_id "
                            "WHERE admin_user_id IS NULL"
                        ),
                        {"user_id": result[0]},
                    )
                else:
                    conn.execute(text("DELETE FROM admin_sessions"))
            else:
                conn.execute(text("DELETE FROM admin_sessions"))
            try:
                conn.execute(
                    text("ALTER TABLE admin_sessions MODIFY COLUMN admin_user_id INT NOT NULL")
                )
            except Exception:
                pass

        _ensure_table_columns(
            conn,
            inspector,
            "api_keys",
            {
                "admin_user_id": "admin_user_id INT NULL",
                "scope": "scope VARCHAR(32) NOT NULL DEFAULT 'manage'",
                "expires_at": "expires_at DATETIME NULL",
                "last_used_at": "last_used_at DATETIME NULL",
                "revoked_at": "revoked_at DATETIME NULL",
            },
        )
        if inspector.has_table("api_keys"):
            conn.execute(
                text("UPDATE api_keys SET scope='manage' WHERE scope IS NULL OR scope = ''")
            )
            if inspector.has_table("admin_users"):
                admin_count = conn.execute(text("SELECT COUNT(*) FROM admin_users")).scalar()
                if admin_count == 1:
                    admin_id = conn.execute(
                        text("SELECT id FROM admin_users ORDER BY id LIMIT 1")
                    ).scalar()
                    if admin_id:
                        conn.execute(
                            text(
                                "UPDATE api_keys SET admin_user_id=:admin_id "
                                "WHERE admin_user_id IS NULL"
                            ),
                            {"admin_id": admin_id},
                        )

        _ensure_table_columns(
            conn,
            inspector,
            "admin_users",
            {"disabled_at": "disabled_at DATETIME NULL"},
        )

        _ensure_table_columns(
            conn,
            inspector,
            "email_senders",
            {"from_name": "from_name VARCHAR(255) NULL"},
        )

        _ensure_table_columns(
            conn,
            inspector,
            "broadcast_messages",
            {
                "read_at": "read_at DATETIME NULL",
                "direction": "direction VARCHAR(16) NULL",
                "campaign_id": "campaign_id INT NULL",
                "template_id": "template_id INT NULL",
                "variant": "variant VARCHAR(8) NULL",
                "price": "price DECIMAL(10,4) NULL",
                "price_unit": "price_unit VARCHAR(8) NULL",
                "num_segments": "num_segments INT NULL",
            },
        )
        if inspector.has_table("broadcast_messages"):
            conn.execute(
                text(
                    "UPDATE broadcast_messages "
                    "SET direction='outbound' "
                    "WHERE direction IS NULL OR direction = ''"
                )
            )
            conn.execute(
                text(
                    "UPDATE broadcast_messages "
                    "SET to_address = CONCAT('whatsapp:', to_address) "
                    "WHERE channel='whatsapp' "
                    "AND to_address IS NOT NULL "
                    "AND to_address != '' "
                    "AND to_address NOT LIKE 'whatsapp:%'"
                )
            )
            conn.execute(
                text(
                    "UPDATE broadcast_messages "
                    "SET from_address = CONCAT('whatsapp:', from_address) "
                    "WHERE channel='whatsapp' "
                    "AND from_address IS NOT NULL "
                    "AND from_address != '' "
                    "AND from_address NOT LIKE 'whatsapp:%'"
                )
            )


def _normalize_scope(value: Optional[str]) -> str:
    scope = (value or "manage").strip().lower()
    if scope not in {"read", "send", "manage"}:
        raise HTTPException(status_code=400, detail="invalid api key scope")
    return scope

def _hash_api_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _create_api_key_record(
    db: Session,
    *,
    name: Optional[str],
    scope: Optional[str],
    expires_in_days: Optional[int],
    admin_user_id: Optional[int],
) -> Tuple[ApiKey, str]:
    scope_value = _normalize_scope(scope)
    expires_at = None
    if expires_in_days is not None:
        if expires_in_days <= 0:
            raise HTTPException(status_code=400, detail="expires_in_days must be positive")
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    for _ in range(5):
        raw_key = f"sk_{secrets.token_urlsafe(32)}"
        key_hash = _hash_api_key(raw_key)
        exists = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
        if exists:
            continue
        record = ApiKey(
            name=(name or "").strip() or None,
            prefix=raw_key[:8],
            key_hash=key_hash,
            scope=scope_value,
            expires_at=expires_at,
            admin_user_id=admin_user_id,
            created_at=datetime.utcnow(),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record, raw_key
    raise HTTPException(status_code=500, detail="failed to generate api key")


def _extract_api_key(request: Request) -> Optional[str]:
    header_value = request.headers.get(API_KEY_HEADER)
    if header_value:
        return header_value.strip()
    auth_value = request.headers.get(ADMIN_TOKEN_HEADER, "")
    if auth_value.lower().startswith("bearer "):
        return auth_value[7:].strip()
    return None


def _extract_admin_token(request: Request) -> Optional[str]:
    auth_value = request.headers.get(ADMIN_TOKEN_HEADER, "")
    if auth_value.lower().startswith(ADMIN_TOKEN_PREFIX.lower()):
        return auth_value[len(ADMIN_TOKEN_PREFIX) :].strip()
    return None


def _get_admin_session_by_token(token: str, db: Session) -> Optional[AdminSession]:
    if not token:
        return None
    session = db.query(AdminSession).filter(AdminSession.token == token).first()
    if not session:
        return None
    user = db.query(AdminUser).filter(AdminUser.id == session.admin_user_id).first()
    if not user or user.disabled_at:
        db.delete(session)
        db.commit()
        return None
    if session.expires_at <= datetime.utcnow():
        db.delete(session)
        db.commit()
        return None
    return session


def _get_admin_session(request: Request, db: Session) -> Optional[AdminSession]:
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    if not token:
        return None
    return _get_admin_session_by_token(token, db)


def _get_admin_session_from_jwt(token: str, db: Session) -> Optional[AdminSession]:
    secret = _get_admin_jwt_secret()
    payload = _decode_admin_jwt(token, secret)
    session_token = payload.get("sid")
    user_id = payload.get("sub")
    if not session_token or user_id is None:
        return None
    session = _get_admin_session_by_token(str(session_token), db)
    if not session:
        return None
    try:
        user_id_value = int(user_id)
    except (TypeError, ValueError):
        return None
    if session.admin_user_id != user_id_value:
        return None
    return session


def _require_admin(
    request: Request, db: Session = Depends(get_db)
) -> AdminSession:
    session = _get_admin_session(request, db)
    if not session:
        raise HTTPException(status_code=401, detail="admin login required")
    return session


def _require_admin_api(
    request: Request, db: Session = Depends(get_db)
) -> AdminSession:
    token = _extract_admin_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="admin token required")
    session = _get_admin_session_from_jwt(token, db)
    if not session:
        raise HTTPException(status_code=401, detail="admin token is invalid")
    return session


def _require_api_key(
    request: Request, db: Session, required_scope: str
) -> ApiKey:
    api_key = _extract_api_key(request)
    if not api_key:
        raise HTTPException(status_code=401, detail="api_key is required")
    key_hash = _hash_api_key(api_key)
    record = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None))
        .first()
    )
    if not record:
        raise HTTPException(status_code=401, detail="api_key is invalid")
    if record.expires_at and record.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=401, detail="api_key is expired")
    if record.admin_user_id is not None:
        user = db.query(AdminUser).filter(AdminUser.id == record.admin_user_id).first()
        if not user or user.disabled_at:
            raise HTTPException(status_code=401, detail="api_key is invalid")
    scope_rank = {"read": 1, "send": 2, "manage": 3}
    record_scope = record.scope or "manage"
    if record_scope not in scope_rank:
        raise HTTPException(status_code=403, detail="api_key scope is invalid")
    if scope_rank[record_scope] < scope_rank[required_scope]:
        raise HTTPException(status_code=403, detail="api_key scope is insufficient")
    record.last_used_at = datetime.utcnow()
    db.add(record)
    db.commit()
    return record


def require_api_key(required_scope: str):
    def dependency(request: Request, db: Session = Depends(get_db)) -> ApiKey:
        return _require_api_key(request, db, required_scope)

    return dependency


def _is_secure_request(request: Request) -> bool:
    if settings.admin_cookie_secure is not None:
        return settings.admin_cookie_secure
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto:
        return forwarded_proto.split(",")[0].strip().lower() == "https"
    return request.url.scheme == "https"


def _set_admin_cookie(response: Response, token: str, request: Request) -> None:
    max_age = settings.admin_session_ttl_minutes * 60
    response.set_cookie(
        ADMIN_COOKIE_NAME,
        token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=_is_secure_request(request),
    )


def _clear_admin_cookie(response: Response) -> None:
    response.delete_cookie(ADMIN_COOKIE_NAME)


def _ensure_sendgrid() -> SendGridService:
    try:
        return SendGridService()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _ensure_twilio() -> TwilioService:
    try:
        return TwilioService()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if not user or user.disabled_at:
        raise HTTPException(status_code=401, detail="invalid credentials")
    if not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.admin_session_ttl_minutes)
    session = AdminSession(
        token=session_token,
        admin_user_id=user.id,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    jwt_token = _issue_admin_jwt(session, user)
    _set_admin_cookie(response, session_token, request)
    return LoginResponse(
        status="ok",
        token=jwt_token,
        admin_user_id=user.id,
        username=user.username,
        expires_at=expires_at,
    )


@app.post("/api/logout", response_model=LoginResponse)
def logout(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> LoginResponse:
    session = None
    cookie_token = request.cookies.get(ADMIN_COOKIE_NAME)
    if cookie_token:
        session = db.query(AdminSession).filter(AdminSession.token == cookie_token).first()
    if not session:
        admin_token = _extract_admin_token(request)
        if admin_token:
            try:
                session = _get_admin_session_from_jwt(admin_token, db)
            except HTTPException:
                session = None
    if session:
        db.delete(session)
        db.commit()
    _clear_admin_cookie(response)
    return LoginResponse(status="ok")


@app.get("/api/admin/token", response_model=LoginResponse)
def admin_token(
    request: Request, db: Session = Depends(get_db)
) -> LoginResponse:
    session = _get_admin_session(request, db)
    if not session:
        raise HTTPException(status_code=401, detail="admin login required")
    user = db.query(AdminUser).filter(AdminUser.id == session.admin_user_id).first()
    if not user or user.disabled_at:
        raise HTTPException(status_code=401, detail="admin login required")
    jwt_token = _issue_admin_jwt(session, user)
    return LoginResponse(
        status="ok",
        token=jwt_token,
        admin_user_id=user.id,
        username=user.username,
        expires_at=session.expires_at,
    )


@app.get("/logout")
def logout_page(request: Request, db: Session = Depends(get_db)) -> RedirectResponse:
    response = RedirectResponse(url=_login_redirect_path(request))
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    if token:
        session = db.query(AdminSession).filter(AdminSession.token == token).first()
        if session:
            db.delete(session)
            db.commit()
    _clear_admin_cookie(response)
    return response


@app.get("/api/keys", response_model=ApiKeyListResponse)
def list_api_keys(
    admin_user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> ApiKeyListResponse:
    query = db.query(ApiKey)
    if admin_user_id is not None:
        query = query.filter(ApiKey.admin_user_id == admin_user_id)
    keys = query.order_by(ApiKey.created_at.desc()).all()
    admin_ids = {key.admin_user_id for key in keys if key.admin_user_id}
    admin_lookup: Dict[int, str] = {}
    if admin_ids:
        users = db.query(AdminUser).filter(AdminUser.id.in_(admin_ids)).all()
        admin_lookup = {user.id: user.username for user in users}
    items = [
        ApiKeyItem(
            id=key.id,
            name=key.name,
            prefix=key.prefix,
            scope=key.scope or "manage",
            admin_user_id=key.admin_user_id,
            admin_username=admin_lookup.get(key.admin_user_id or 0),
            expires_at=key.expires_at,
            created_at=key.created_at,
            last_used_at=key.last_used_at,
            revoked_at=key.revoked_at,
        )
        for key in keys
    ]
    return ApiKeyListResponse(keys=items)


@app.post("/api/keys", response_model=ApiKeyCreateResponse)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(_require_admin_api),
) -> ApiKeyCreateResponse:
    owner_id = payload.admin_user_id
    if owner_id is None:
        owner_id = session.admin_user_id
    owner = db.query(AdminUser).filter(AdminUser.id == owner_id).first()
    if not owner or owner.disabled_at:
        raise HTTPException(status_code=400, detail="admin user is invalid")
    record, raw_key = _create_api_key_record(
        db,
        name=payload.name,
        scope=payload.scope,
        expires_in_days=payload.expires_in_days,
        admin_user_id=owner_id,
    )
    return ApiKeyCreateResponse(
        id=record.id,
        name=record.name,
        prefix=record.prefix,
        scope=record.scope or "manage",
        admin_user_id=record.admin_user_id,
        admin_username=owner.username,
        expires_at=record.expires_at,
        api_key=raw_key,
        created_at=record.created_at,
    )


@app.post("/api/keys/{key_id}/revoke", response_model=ApiKeyItem)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> ApiKeyItem:
    record = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="api key not found")
    if record.revoked_at is None:
        record.revoked_at = datetime.utcnow()
        db.add(record)
        db.commit()
        db.refresh(record)
    owner_name = None
    if record.admin_user_id:
        owner = db.query(AdminUser).filter(AdminUser.id == record.admin_user_id).first()
        owner_name = owner.username if owner else None
    return ApiKeyItem(
        id=record.id,
        name=record.name,
        prefix=record.prefix,
        scope=record.scope or "manage",
        admin_user_id=record.admin_user_id,
        admin_username=owner_name,
        expires_at=record.expires_at,
        created_at=record.created_at,
        last_used_at=record.last_used_at,
        revoked_at=record.revoked_at,
    )


@app.patch("/api/keys/{key_id}", response_model=ApiKeyItem)
def update_api_key(
    key_id: int,
    payload: ApiKeyUpdate,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> ApiKeyItem:
    record = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="api key not found")
    if payload.scope is not None:
        record.scope = _normalize_scope(payload.scope)
    if payload.admin_user_id is not None:
        owner = db.query(AdminUser).filter(AdminUser.id == payload.admin_user_id).first()
        if not owner or owner.disabled_at:
            raise HTTPException(status_code=400, detail="admin user is invalid")
        record.admin_user_id = owner.id
    db.add(record)
    db.commit()
    db.refresh(record)
    owner_name = None
    if record.admin_user_id:
        owner = db.query(AdminUser).filter(AdminUser.id == record.admin_user_id).first()
        owner_name = owner.username if owner else None
    return ApiKeyItem(
        id=record.id,
        name=record.name,
        prefix=record.prefix,
        scope=record.scope or "manage",
        admin_user_id=record.admin_user_id,
        admin_username=owner_name,
        expires_at=record.expires_at,
        created_at=record.created_at,
        last_used_at=record.last_used_at,
        revoked_at=record.revoked_at,
    )


@app.get("/api/admin/users", response_model=AdminUserListResponse)
def list_admin_users(
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> AdminUserListResponse:
    users = db.query(AdminUser).order_by(AdminUser.created_at.asc()).all()
    items = [
        AdminUserItem(
            id=user.id,
            username=user.username,
            created_at=user.created_at,
            disabled_at=user.disabled_at,
        )
        for user in users
    ]
    return AdminUserListResponse(users=items)


@app.post("/api/admin/users", response_model=AdminUserItem)
def upsert_admin_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> AdminUserItem:
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="username is required")
    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="password is required")
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    password_hash = _hash_password(payload.password)
    if user:
        user.password_hash = password_hash
        user.disabled_at = None
    else:
        user = AdminUser(
            username=username,
            password_hash=password_hash,
            created_at=datetime.utcnow(),
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    db.query(AdminSession).filter(AdminSession.admin_user_id == user.id).delete()
    db.commit()
    return AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )


@app.post("/api/admin/users/{user_id}/disable", response_model=AdminUserItem)
def disable_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(_require_admin_api),
) -> AdminUserItem:
    if user_id == session.admin_user_id:
        raise HTTPException(status_code=400, detail="cannot disable current user")
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    if user.disabled_at is None:
        user.disabled_at = datetime.utcnow()
        db.add(user)
        db.commit()
    db.query(AdminSession).filter(AdminSession.admin_user_id == user.id).delete()
    db.commit()
    return AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )


@app.post("/api/admin/users/{user_id}/enable", response_model=AdminUserItem)
def enable_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> AdminUserItem:
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    if user.disabled_at is not None:
        user.disabled_at = None
        db.add(user)
        db.commit()
    return AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )


@app.delete("/api/admin/users/{user_id}", response_model=AdminUserItem)
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(_require_admin_api),
) -> AdminUserItem:
    if user_id == session.admin_user_id:
        raise HTTPException(status_code=400, detail="cannot delete current user")
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    now = datetime.utcnow()
    db.query(ApiKey).filter(
        ApiKey.admin_user_id == user.id, ApiKey.revoked_at.is_(None)
    ).update({"revoked_at": now}, synchronize_session=False)
    db.query(AdminSession).filter(AdminSession.admin_user_id == user.id).delete()
    item = AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )
    db.delete(user)
    db.commit()
    return item


@app.get(
    "/api/admin/settings/sendgrid-webhook-log",
    response_model=SendgridWebhookLogSettings,
)
def get_sendgrid_webhook_log_settings(
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> SendgridWebhookLogSettings:
    return _get_sendgrid_log_settings(db)


@app.patch(
    "/api/admin/settings/sendgrid-webhook-log",
    response_model=SendgridWebhookLogSettings,
)
def update_sendgrid_webhook_log_settings(
    payload: SendgridWebhookLogSettingsUpdate,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin_api),
) -> SendgridWebhookLogSettings:
    updates: Dict[str, Optional[str]] = {}
    if payload.enabled is not None:
        updates[SENDGRID_LOG_ENABLED_KEY] = "true" if payload.enabled else "false"
    if _field_is_set(payload, "max_lines"):
        updates[SENDGRID_LOG_MAX_LINES_KEY] = (
            str(payload.max_lines) if payload.max_lines and payload.max_lines > 0 else None
        )
    if payload.auto_close is not None:
        updates[SENDGRID_LOG_AUTO_CLOSE_KEY] = "true" if payload.auto_close else "false"
    if updates:
        _set_setting_values(db, updates)
    return _get_sendgrid_log_settings(db)


def _normalize_whatsapp_sender(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="from_address is required")
    return normalize_whatsapp(cleaned)


def _normalize_whatsapp_address(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="address is required")
    return normalize_whatsapp(cleaned)


def _normalize_email_sender(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="from_email is required")
    return cleaned.lower()


def _text_to_html(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    escaped = html_lib.escape(normalized)
    escaped = escaped.replace("\n", "<br>")
    return f"<html><body>{escaped}</body></html>"


def _get_setting_value(db: Session, key: str) -> Optional[str]:
    record = db.query(AppSetting).filter(AppSetting.key == key).first()
    return record.value if record else None


def _set_setting_values(db: Session, values: Dict[str, Optional[str]]) -> None:
    now = datetime.utcnow()
    for key, value in values.items():
        record = db.query(AppSetting).filter(AppSetting.key == key).first()
        if value is None:
            if record:
                db.delete(record)
            continue
        if record:
            record.value = value
            record.updated_at = now
        else:
            db.add(
                AppSetting(
                    key=key,
                    value=value,
                    created_at=now,
                    updated_at=now,
                )
            )
    db.commit()


def _parse_setting_bool(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_setting_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError:
        return None
    if parsed <= 0:
        return None
    return parsed


def _field_is_set(payload: Any, name: str) -> bool:
    if hasattr(payload, "model_fields_set"):
        return name in payload.model_fields_set
    if hasattr(payload, "__fields_set__"):
        return name in payload.__fields_set__
    return False


def _get_sendgrid_log_settings(db: Session) -> SendgridWebhookLogSettings:
    log_path_raw = (os.getenv("SENDGRID_WEBHOOK_LOG_PATH") or "").strip()
    log_path = log_path_raw or None
    enabled_raw = _get_setting_value(db, SENDGRID_LOG_ENABLED_KEY)
    enabled = _parse_setting_bool(enabled_raw)
    if enabled is None:
        enabled = bool(log_path)
    max_lines = _parse_setting_int(_get_setting_value(db, SENDGRID_LOG_MAX_LINES_KEY))
    auto_close_raw = _get_setting_value(db, SENDGRID_LOG_AUTO_CLOSE_KEY)
    auto_close = _parse_setting_bool(auto_close_raw)
    if auto_close is None:
        auto_close = False
    return SendgridWebhookLogSettings(
        enabled=enabled,
        max_lines=max_lines,
        auto_close=auto_close,
        path=log_path,
    )


def _trim_log_file(log_path: Path, max_lines: int) -> int:
    try:
        content = log_path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return 0
    lines = content.splitlines()
    if len(lines) <= max_lines:
        return len(lines)
    lines = lines[-max_lines:]
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(lines)


def _append_sendgrid_webhook_log(
    db: Session, payload: bytes, signature: str, timestamp: str
) -> None:
    try:
        log_settings = _get_sendgrid_log_settings(db)
        if not log_settings.enabled or not log_settings.path:
            return
        log_path = Path(log_settings.path)
        entry = {
            "received_at": f"{datetime.utcnow().isoformat()}Z",
            "signature": signature,
            "timestamp": timestamp,
            "payload": payload.decode("utf-8", errors="replace"),
        }
        with _sendgrid_webhook_log_lock:
            log_path.parent.mkdir(parents=True, exist_ok=True)
            with log_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(entry, ensure_ascii=True) + "\n")
            if log_settings.max_lines:
                line_count = _trim_log_file(log_path, log_settings.max_lines)
                if log_settings.auto_close and line_count >= log_settings.max_lines:
                    _set_setting_values(db, {SENDGRID_LOG_ENABLED_KEY: "false"})
    except Exception:
        return


def _normalize_sms_phone(value: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="phone is required")
    cleaned = cleaned.replace("whatsapp:", "").strip()
    if cleaned.startswith("+"):
        digits = re.sub(r"\D", "", cleaned)
        if not digits:
            raise HTTPException(status_code=400, detail="phone is invalid")
        return f"+{digits}"
    digits = re.sub(r"\D", "", cleaned)
    if not digits:
        raise HTTPException(status_code=400, detail="phone is invalid")
    default_cc = (settings.sms_default_country_code or "").lstrip("+")
    if default_cc:
        if digits.startswith(default_cc):
            return f"+{digits}"
        return f"+{default_cc}{digits}"
    return f"+{digits}"


def _normalize_sms_phones(values: List[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        normalized = _normalize_sms_phone(value)
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def _serialize_json_list(values: Optional[List[Any]]) -> Optional[str]:
    if not values:
        return None
    cleaned = [value for value in values if value not in (None, "")]
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=True)


def _serialize_json_dict(values: Optional[Dict[str, Any]]) -> Optional[str]:
    if not values:
        return None
    cleaned = {str(k): v for k, v in values.items() if k not in (None, "")}
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=True)


def _deserialize_json_list(value: Optional[str]) -> List[Any]:
    if not value:
        return []
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return data
    return []


def _deserialize_json_dict(value: Optional[str]) -> Dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
    except json.JSONDecodeError:
        return {}
    if isinstance(data, dict):
        return data
    return {}


def _serialize_tags(tags: Optional[List[str]]) -> Optional[str]:
    if not tags:
        return None
    cleaned = sorted({tag.strip() for tag in tags if tag and tag.strip()})
    if not cleaned:
        return None
    return json.dumps(cleaned, ensure_ascii=True)


def _deserialize_tags(value: Optional[str]) -> List[str]:
    if not value:
        return []
    items = _deserialize_json_list(value)
    if items:
        return [str(item).strip() for item in items if str(item).strip()]
    return [part.strip() for part in value.split(",") if part.strip()]


class _SafeFormatDict(dict):
    def __missing__(self, key: str) -> str:
        return f"{{{key}}}"


def _render_sms_body(template: str, variables: Optional[Dict[str, Any]]) -> str:
    if not variables:
        return template
    safe_vars = {str(key): str(value) for key, value in variables.items()}
    return template.format_map(_SafeFormatDict(safe_vars))


def _append_opt_out_text(body: str, append_opt_out: bool) -> str:
    if not append_opt_out:
        return body
    if not settings.sms_append_opt_out:
        return body
    suffix = (settings.sms_opt_out_text or "").strip()
    if not suffix:
        return body
    if suffix in body:
        return body
    return f"{body}\n{suffix}".strip()


def _build_sms_status_callback(message_id: int) -> Optional[str]:
    if not settings.public_base_url:
        return None
    base = settings.public_base_url.rstrip("/")
    return f"{base}/webhooks/twilio/sms/status?local_id={message_id}"


def _is_opted_out(db: Session, phone: str) -> Optional[str]:
    if db.query(SmsBlacklist).filter(SmsBlacklist.phone == phone).first():
        return "blacklist"
    if db.query(SmsOptOut).filter(SmsOptOut.phone == phone).first():
        return "opt_out"
    return None


def _match_keyword(rule: SmsKeywordRule, text: str) -> bool:
    keyword = (rule.keyword or "").strip()
    if not keyword:
        return False
    text_value = text.strip()
    match_type = (rule.match_type or "contains").lower()
    if match_type == "exact":
        return text_value.lower() == keyword.lower()
    if match_type == "regex":
        try:
            return re.search(keyword, text_value, re.IGNORECASE) is not None
        except re.error:
            return False
    return keyword.lower() in text_value.lower()


def _collect_sms_recipients(
    db: Session,
    recipients: Optional[List[str]] = None,
    group_ids: Optional[List[int]] = None,
    tags: Optional[List[str]] = None,
) -> Tuple[List[str], Dict[str, SmsContact]]:
    phones: List[str] = []
    contact_map: Dict[str, SmsContact] = {}
    if recipients:
        for phone in _normalize_sms_phones(recipients):
            phones.append(phone)
    if group_ids:
        members = (
            db.query(SmsContact)
            .join(SmsGroupMember, SmsGroupMember.contact_id == SmsContact.id)
            .filter(SmsGroupMember.group_id.in_(group_ids), SmsContact.disabled_at.is_(None))
            .all()
        )
        for contact in members:
            phones.append(contact.phone)
            contact_map[contact.phone] = contact
    if tags:
        tag_set = {tag.strip().lower() for tag in tags if tag and tag.strip()}
        if tag_set:
            contacts = db.query(SmsContact).filter(SmsContact.disabled_at.is_(None)).all()
            for contact in contacts:
                contact_tags = {tag.lower() for tag in _deserialize_tags(contact.tags)}
                if contact_tags.intersection(tag_set):
                    phones.append(contact.phone)
                    contact_map[contact.phone] = contact
    unique = []
    seen = set()
    for phone in phones:
        normalized = _normalize_sms_phone(phone)
        if normalized in seen:
            continue
        seen.add(normalized)
        unique.append(normalized)
    return unique, contact_map

def _get_form_value(form: Any, key: str) -> Optional[str]:
    value = form.get(key)
    if isinstance(value, str):
        return value
    return None


def _extract_first_email(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    addresses = getaddresses([value])
    for _, address in addresses:
        cleaned = address.strip()
        if cleaned:
            return cleaned.lower()
    cleaned = value.strip()
    return cleaned.lower() if cleaned else None


def _extract_sendgrid_message_id(headers: Optional[str]) -> Optional[str]:
    if not headers:
        return None
    for line in headers.splitlines():
        if line.lower().startswith("message-id:"):
            return line.split(":", 1)[1].strip().strip("<>")
    return None


def _extract_sendgrid_local_id(event: Any) -> Optional[str]:
    if not isinstance(event, dict):
        return None
    local_id = event.get("local_message_id")
    if isinstance(local_id, (int, str)):
        return str(local_id)
    custom_args = event.get("custom_args") or event.get("unique_args") or {}
    if isinstance(custom_args, dict):
        local_id = custom_args.get("local_message_id")
        if isinstance(local_id, (int, str)):
            return str(local_id)
    return None


def _list_email_senders(db: Session) -> List[EmailSenderItem]:
    senders = {}
    if settings.sendgrid_from_email:
        senders[_normalize_email_sender(settings.sendgrid_from_email)] = EmailSenderItem(
            from_email=_normalize_email_sender(settings.sendgrid_from_email),
            from_name=settings.sendgrid_from_name,
        )
    db_senders = db.query(EmailSender).all()
    for sender in db_senders:
        if sender.from_email:
            key = _normalize_email_sender(sender.from_email)
            senders[key] = EmailSenderItem(
                from_email=key,
                from_name=sender.from_name,
            )
    return [senders[key] for key in sorted(senders)]


def _resolve_email_sender(
    db: Session, from_email: Optional[str]
) -> Optional[EmailSenderItem]:
    if from_email:
        normalized = _normalize_email_sender(from_email)
        for sender in _list_email_senders(db):
            if sender.from_email == normalized:
                return sender
        return None
    if settings.sendgrid_from_email:
        normalized = _normalize_email_sender(settings.sendgrid_from_email)
        return EmailSenderItem(
            from_email=normalized,
            from_name=settings.sendgrid_from_name,
        )
    return None


def _list_whatsapp_senders(db: Session) -> List[str]:
    senders = set()
    if settings.twilio_whatsapp_from:
        senders.add(normalize_whatsapp(settings.twilio_whatsapp_from))
    db_senders = db.query(WhatsAppSender).all()
    for sender in db_senders:
        if sender.from_address:
            senders.add(normalize_whatsapp(sender.from_address))
    return sorted(senders)


def _resolve_sms_template(db: Session, template_id: Optional[int]) -> Optional[SmsTemplate]:
    if not template_id:
        return None
    template = db.query(SmsTemplate).filter(SmsTemplate.id == template_id).first()
    if not template or template.disabled_at:
        raise HTTPException(status_code=404, detail="sms template not found")
    return template


def _build_sms_variables(
    base_variables: Optional[Dict[str, str]], contact: Optional[SmsContact]
) -> Dict[str, str]:
    variables: Dict[str, str] = {}
    if base_variables:
        variables.update({str(k): str(v) for k, v in base_variables.items()})
    if contact:
        if contact.name:
            variables.setdefault("name", contact.name)
        variables.setdefault("phone", contact.phone)
    return variables


def _create_sms_message_record(
    db: Session,
    *,
    batch_id: str,
    to_address: str,
    from_address: str,
    body: str,
    status: str,
    campaign_id: Optional[int] = None,
    template_id: Optional[int] = None,
    variant: Optional[str] = None,
    direction: str = "outbound",
    provider_message_id: Optional[str] = None,
    error: Optional[str] = None,
) -> Message:
    now = datetime.utcnow()
    message = Message(
        batch_id=batch_id,
        channel="sms",
        to_address=to_address,
        from_address=from_address,
        subject=None,
        body=body,
        status=status,
        provider_message_id=provider_message_id,
        campaign_id=campaign_id,
        template_id=template_id,
        variant=variant,
        direction=direction,
        error=error,
        created_at=now,
        updated_at=now,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def _send_sms_outbound(
    db: Session,
    *,
    twilio: TwilioService,
    recipient: str,
    body: str,
    batch_id: str,
    from_number: Optional[str],
    messaging_service_sid: Optional[str],
    campaign_id: Optional[int],
    template_id: Optional[int],
    variant: Optional[str],
    append_opt_out: bool,
    use_proxy: Optional[bool],
) -> SendResult:
    opt_out_reason = _is_opted_out(db, recipient)
    if opt_out_reason:
        message = _create_sms_message_record(
            db,
            batch_id=batch_id,
            to_address=recipient,
            from_address=from_number or (messaging_service_sid or ""),
            body=body,
            status="blocked",
            campaign_id=campaign_id,
            template_id=template_id,
            variant=variant,
            error=opt_out_reason,
        )
        return SendResult(
            message_id=message.id,
            recipient=recipient,
            status=message.status,
            provider_message_id=message.provider_message_id,
            error=message.error,
        )

    body_value = _append_opt_out_text(body, append_opt_out)
    message = _create_sms_message_record(
        db,
        batch_id=batch_id,
        to_address=recipient,
        from_address=from_number or (messaging_service_sid or ""),
        body=body_value,
        status="queued",
        campaign_id=campaign_id,
        template_id=template_id,
        variant=variant,
    )

    status_callback = _build_sms_status_callback(message.id)
    try:
        sid = twilio.send_sms(
            to_number=recipient,
            body=body_value,
            status_callback=status_callback,
            from_number=from_number,
            messaging_service_sid=messaging_service_sid,
            use_proxy=use_proxy,
        )
        message.provider_message_id = sid
    except Exception as exc:  # pragma: no cover - external API
        message.status = "failed"
        message.error = str(exc)

    message.updated_at = datetime.utcnow()
    db.add(message)
    db.commit()

    return SendResult(
        message_id=message.id,
        recipient=recipient,
        status=message.status,
        provider_message_id=message.provider_message_id,
        error=message.error,
    )


def _sms_rate_delay(rate_per_minute: Optional[int]) -> float:
    if not rate_per_minute or rate_per_minute <= 0:
        return 0.0
    return max(0.0, 60.0 / float(rate_per_minute))


def _dispatch_sms_campaign(db: Session, campaign: SmsCampaign) -> None:
    if campaign.status not in {"scheduled", "running"}:
        return
    twilio = _ensure_twilio()
    rate_per_minute = campaign.rate_per_minute or settings.sms_default_rate_per_minute
    delay_seconds = _sms_rate_delay(rate_per_minute)
    batch_id = f"sms_campaign_{campaign.id}_{uuid4().hex}"

    recipients = _deserialize_json_list(campaign.target_recipients)
    group_ids = _deserialize_json_list(campaign.target_groups)
    tags = _deserialize_json_list(campaign.target_tags)
    phones, contact_map = _collect_sms_recipients(
        db,
        recipients=recipients,
        group_ids=[int(value) for value in group_ids if str(value).isdigit()],
        tags=[str(value) for value in tags],
    )

    template = _resolve_sms_template(db, campaign.template_id)
    if not template and not campaign.message and not campaign.variant_a and not campaign.variant_b:
        campaign.status = "failed"
        campaign.updated_at = datetime.utcnow()
        db.add(campaign)
        db.commit()
        return

    for index, recipient in enumerate(phones):
        db.refresh(campaign)
        if campaign.status in {"paused", "canceled"}:
            break

        contact = contact_map.get(recipient)
        variant = None
        body_source = campaign.message or (template.body if template else "")
        if campaign.variant_a and campaign.variant_b:
            split = max(0, min(100, campaign.ab_split or 50))
            variant = "A" if random.randint(1, 100) <= split else "B"
            body_source = campaign.variant_a if variant == "A" else campaign.variant_b

        variables = _build_sms_variables(
            _deserialize_json_dict(campaign.template_variables),
            contact,
        )
        body = _render_sms_body(body_source, variables)

        _send_sms_outbound(
            db,
            twilio=twilio,
            recipient=recipient,
            body=body,
            batch_id=batch_id,
            from_number=campaign.from_number,
            messaging_service_sid=campaign.messaging_service_sid,
            campaign_id=campaign.id,
            template_id=campaign.template_id,
            variant=variant,
            append_opt_out=campaign.append_opt_out,
            use_proxy=None,
        )

        if delay_seconds:
            time.sleep(delay_seconds)

    campaign.status = "completed"
    campaign.completed_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()


def _sms_stats_from_query(query) -> SmsStatsResponse:
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


def _sms_scheduler_loop() -> None:
    while settings.sms_scheduler_enabled:
        try:
            now = datetime.utcnow()
            with SessionLocal() as db:
                due_campaigns = (
                    db.query(SmsCampaign)
                    .filter(
                        SmsCampaign.status == "scheduled",
                        (SmsCampaign.schedule_at.is_(None))
                        | (SmsCampaign.schedule_at <= now),
                    )
                    .all()
                )
                for campaign in due_campaigns:
                    campaign.status = "running"
                    campaign.started_at = now
                    campaign.updated_at = now
                    db.add(campaign)
                    db.commit()
                    _dispatch_sms_campaign(db, campaign)
        except Exception:  # pragma: no cover - scheduler safety
            pass
        time.sleep(max(1, settings.sms_scheduler_interval_seconds))


def _start_sms_scheduler() -> None:
    global _sms_scheduler_started
    if _sms_scheduler_started:
        return
    if not settings.sms_scheduler_enabled:
        return
    _sms_scheduler_started = True
    thread = threading.Thread(target=_sms_scheduler_loop, daemon=True)
    thread.start()

def _user_address_expr() -> Any:
    return case(
        (Message.direction == "inbound", Message.from_address),
        else_=Message.to_address,
    )


def _extract_page_token(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parsed = urlparse(url)
    params = parse_qs(parsed.query or "")
    token = params.get("PageToken") or params.get("page_token")
    if token:
        return token[0]
    return None


def _extract_template_status(item: Dict[str, Any]) -> Optional[str]:
    status_value = (
        item.get("approval_status")
        or item.get("approval_statuses")
        or item.get("status")
        or item.get("state")
    )
    if isinstance(status_value, dict):
        for key, value in status_value.items():
            if "whatsapp" in str(key).lower():
                return str(value)
        for value in status_value.values():
            return str(value)
        return None
    if isinstance(status_value, list) and status_value:
        return str(status_value[0])
    if isinstance(status_value, str):
        return status_value
    return None


def _extract_template_variables(item: Dict[str, Any]) -> Optional[List[str]]:
    variables_value = (
        item.get("variables")
        or item.get("content_variables")
        or item.get("template_variables")
    )
    if isinstance(variables_value, dict):
        return sorted([str(key) for key in variables_value.keys()])
    if isinstance(variables_value, list):
        return [str(value) for value in variables_value]
    if isinstance(variables_value, str):
        return [variables_value]
    return None


def _extract_template_eligibility(item: Dict[str, Any]) -> Optional[List[str]]:
    value = item.get("whatsapp_eligibility") or item.get("whatsappEligibility")
    if value is None:
        channel_value = item.get("channel_eligibility") or item.get("channelEligibility")
        if isinstance(channel_value, dict):
            for key, sub_value in channel_value.items():
                if "whatsapp" in str(key).lower():
                    value = sub_value
                    break
    if value is None:
        return None

    def normalize(value_item: Any) -> str:
        return str(value_item).replace("_", " ").strip()

    if isinstance(value, dict):
        entries: List[str] = []
        for key, sub_value in value.items():
            label = normalize(key)
            if isinstance(sub_value, dict):
                for sub_key, sub_val in sub_value.items():
                    entries.append(f"{label} {normalize(sub_key)}:{normalize(sub_val)}")
            elif isinstance(sub_value, list):
                entries.append(f"{label}:{', '.join(normalize(item) for item in sub_value)}")
            elif sub_value is None:
                entries.append(label)
            else:
                entries.append(f"{label}:{normalize(sub_value)}")
        return entries or None
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return [normalize(value)]


@app.get("/api/email/senders", response_model=EmailSendersResponse)
def list_email_senders(
    db: Session = Depends(get_db), _: ApiKey = Depends(require_api_key("read"))
) -> EmailSendersResponse:
    return EmailSendersResponse(senders=_list_email_senders(db))


@app.post("/api/email/senders", response_model=EmailSenderUpsertResponse)
def add_email_sender(
    request: EmailSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> EmailSenderUpsertResponse:
    normalized = _normalize_email_sender(request.from_email)
    default_email = (
        _normalize_email_sender(settings.sendgrid_from_email)
        if settings.sendgrid_from_email
        else None
    )
    status = "exists"
    if normalized != default_email:
        existing = (
            db.query(EmailSender).filter(EmailSender.from_email == normalized).first()
        )
        if not existing:
            db.add(EmailSender(from_email=normalized, created_at=datetime.utcnow()))
            db.commit()
            status = "added"
    return EmailSenderUpsertResponse(
        from_email=normalized,
        status=status,
        senders=_list_email_senders(db),
    )


@app.delete("/api/email/senders", response_model=EmailSenderUpsertResponse)
def delete_email_sender(
    request: EmailSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> EmailSenderUpsertResponse:
    normalized = _normalize_email_sender(request.from_email)
    default_email = (
        _normalize_email_sender(settings.sendgrid_from_email)
        if settings.sendgrid_from_email
        else None
    )
    status = "not_found"
    if normalized == default_email:
        status = "protected"
    else:
        existing = (
            db.query(EmailSender).filter(EmailSender.from_email == normalized).first()
        )
        if existing:
            db.delete(existing)
            db.commit()
            status = "deleted"
    return EmailSenderUpsertResponse(
        from_email=normalized,
        status=status,
        senders=_list_email_senders(db),
    )


@app.post("/api/send/email", response_model=SendResponse)
def send_email(
    request: EmailSendRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SendResponse:
    if not request.text and not request.html:
        raise HTTPException(status_code=400, detail="text or html is required")

    sendgrid = _ensure_sendgrid()
    batch_id = uuid4().hex
    results: List[SendResult] = []
    sender = _resolve_email_sender(db, request.from_email)
    if request.from_email and not sender:
        raise HTTPException(status_code=400, detail="from_email is not in whitelist")
    if not sender:
        raise HTTPException(status_code=400, detail="SENDGRID_FROM_EMAIL is not configured")

    html_payload = request.html
    if not html_payload and request.text:
        html_payload = _text_to_html(request.text)

    for recipient in request.recipients:
        message = Message(
            batch_id=batch_id,
            channel="email",
            to_address=recipient,
            from_address=sender.from_email,
            subject=request.subject,
            body=request.html or request.text,
            status="queued",
            direction="outbound",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(message)
        db.commit()
        db.refresh(message)

        custom_args = {"local_message_id": str(message.id), "batch_id": batch_id}
        try:
            status_code, message_id = sendgrid.send_email(
                to_email=recipient,
                subject=request.subject,
                text=request.text,
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
        except Exception as exc:  # pragma: no cover - external API
            message.status = "failed"
            message.error = str(exc)

        message.updated_at = datetime.utcnow()
        db.add(message)
        db.commit()

        results.append(
            SendResult(
                message_id=message.id,
                recipient=recipient,
                status=message.status,
                provider_message_id=message.provider_message_id,
                error=message.error,
            )
        )

    return SendResponse(batch_id=batch_id, channel="email", results=results)


@app.get("/api/whatsapp/senders", response_model=WhatsAppSendersResponse)
def list_whatsapp_senders(
    db: Session = Depends(get_db), _: ApiKey = Depends(require_api_key("read"))
) -> WhatsAppSendersResponse:
    return WhatsAppSendersResponse(senders=_list_whatsapp_senders(db))


@app.get("/api/whatsapp/templates", response_model=WhatsAppTemplatesResponse)
def list_whatsapp_templates(
    limit: int = 50,
    page_token: Optional[str] = None,
    search: Optional[str] = None,
    use_proxy: Optional[bool] = None,
    _: ApiKey = Depends(require_api_key("read")),
) -> WhatsAppTemplatesResponse:
    twilio = _ensure_twilio()
    try:
        data = twilio.list_templates(
            page_size=limit, page_token=page_token, use_proxy=use_proxy
        )
    except Exception as exc:  # pragma: no cover - external API
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    raw_items = data.get("contents") or data.get("content") or data.get("results") or []
    meta = data.get("meta") or {}
    next_page_token = meta.get("next_page_token") or _extract_page_token(
        meta.get("next_page_url") or meta.get("next_page_uri")
    )
    previous_page_token = meta.get("previous_page_token") or _extract_page_token(
        meta.get("previous_page_url") or meta.get("previous_page_uri")
    )
    search_value = (search or "").strip().lower()

    templates: List[WhatsAppTemplateItem] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        sid = item.get("sid") or item.get("content_sid") or item.get("id")
        if not sid:
            continue
        friendly_name = item.get("friendly_name") or item.get("friendlyName") or item.get("name")
        language = item.get("language")
        types_value = item.get("types")
        types_list: Optional[List[str]] = None
        if isinstance(types_value, dict):
            types_list = list(types_value.keys())
        elif isinstance(types_value, list):
            types_list = [str(value) for value in types_value]
        elif isinstance(types_value, str):
            types_list = [types_value]
        if search_value:
            name_value = (friendly_name or "").lower()
            if search_value not in name_value and search_value not in sid.lower():
                continue
        templates.append(
            WhatsAppTemplateItem(
                sid=sid,
                friendly_name=friendly_name,
                language=language,
                types=types_list,
                status=_extract_template_status(item),
                variables=_extract_template_variables(item),
                whatsapp_eligibility=_extract_template_eligibility(item),
            )
        )

    return WhatsAppTemplatesResponse(
        templates=templates,
        next_page_token=next_page_token,
        previous_page_token=previous_page_token,
    )


@app.post("/api/whatsapp/senders", response_model=WhatsAppSenderUpsertResponse)
def add_whatsapp_sender(
    request: WhatsAppSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> WhatsAppSenderUpsertResponse:
    normalized = _normalize_whatsapp_sender(request.from_address)
    default_sender = (
        normalize_whatsapp(settings.twilio_whatsapp_from)
        if settings.twilio_whatsapp_from
        else None
    )
    status = "exists"
    if normalized != default_sender:
        existing = (
            db.query(WhatsAppSender)
            .filter(WhatsAppSender.from_address == normalized)
            .first()
        )
        if not existing:
            db.add(WhatsAppSender(from_address=normalized, created_at=datetime.utcnow()))
            db.commit()
            status = "added"
    return WhatsAppSenderUpsertResponse(
        from_address=normalized,
        status=status,
        senders=_list_whatsapp_senders(db),
    )


@app.delete("/api/whatsapp/senders", response_model=WhatsAppSenderUpsertResponse)
def delete_whatsapp_sender(
    request: WhatsAppSenderCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> WhatsAppSenderUpsertResponse:
    normalized = _normalize_whatsapp_sender(request.from_address)
    default_sender = (
        normalize_whatsapp(settings.twilio_whatsapp_from)
        if settings.twilio_whatsapp_from
        else None
    )
    status = "not_found"
    if normalized == default_sender:
        status = "protected"
    else:
        existing = (
            db.query(WhatsAppSender)
            .filter(WhatsAppSender.from_address == normalized)
            .first()
        )
        if existing:
            db.delete(existing)
            db.commit()
            status = "deleted"
    return WhatsAppSenderUpsertResponse(
        from_address=normalized,
        status=status,
        senders=_list_whatsapp_senders(db),
    )


@app.post("/api/send/whatsapp", response_model=SendResponse)
def send_whatsapp(
    request: WhatsAppSendRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SendResponse:
    twilio = _ensure_twilio()
    batch_id = uuid4().hex
    results: List[SendResult] = []

    selected_from = None
    if request.from_address:
        selected_from = _normalize_whatsapp_sender(request.from_address)
        if selected_from not in _list_whatsapp_senders(db):
            raise HTTPException(status_code=400, detail="from_address is not in whitelist")
    elif settings.twilio_whatsapp_from:
        selected_from = normalize_whatsapp(settings.twilio_whatsapp_from)
    if not selected_from:
        raise HTTPException(status_code=400, detail="TWILIO_WHATSAPP_FROM is not configured")
    if not request.body and not request.content_sid:
        raise HTTPException(status_code=400, detail="body or content_sid is required")
    if request.content_variables and not request.content_sid:
        raise HTTPException(
            status_code=400, detail="content_sid is required when content_variables is set"
        )

    for recipient in request.recipients:
        normalized_recipient = _normalize_whatsapp_address(recipient)
        stored_body = request.body
        if request.content_sid:
            stored_body = (
                f"template:{request.content_sid} "
                f"variables:{json.dumps(request.content_variables or {}, ensure_ascii=True)}"
            )
        message = Message(
            batch_id=batch_id,
            channel="whatsapp",
            to_address=normalized_recipient,
            from_address=selected_from,
            subject=None,
            body=stored_body,
            status="queued",
            direction="outbound",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(message)
        db.commit()
        db.refresh(message)

        status_callback = None
        if settings.public_base_url:
            status_callback = (
                f"{settings.public_base_url.rstrip('/')}/webhooks/twilio/whatsapp"
                f"?local_id={message.id}"
            )

        try:
            message_sid = twilio.send_whatsapp(
                to_number=normalized_recipient,
                body=request.body if not request.content_sid else None,
                media_urls=request.media_urls if not request.content_sid else None,
                status_callback=status_callback,
                from_number=selected_from,
                content_sid=request.content_sid,
                content_variables=request.content_variables,
                use_proxy=request.use_proxy,
            )
            message.provider_message_id = message_sid
        except Exception as exc:  # pragma: no cover - external API
            message.status = "failed"
            message.error = str(exc)

        message.updated_at = datetime.utcnow()
        db.add(message)
        db.commit()

        results.append(
            SendResult(
                message_id=message.id,
                recipient=recipient,
                status=message.status,
                provider_message_id=message.provider_message_id,
                error=message.error,
            )
        )

    return SendResponse(batch_id=batch_id, channel="whatsapp", results=results)


@app.get("/api/sms/templates", response_model=SmsTemplateListResponse)
def list_sms_templates(
    include_disabled: bool = False,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsTemplateListResponse:
    query = db.query(SmsTemplate)
    if not include_disabled:
        query = query.filter(SmsTemplate.disabled_at.is_(None))
    templates = query.order_by(SmsTemplate.created_at.desc()).all()
    return SmsTemplateListResponse(templates=[_sms_template_to_item(item) for item in templates])


@app.post("/api/sms/templates", response_model=SmsTemplateItem)
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
        variables=_serialize_json_list(payload.variables),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _sms_template_to_item(template)


@app.patch("/api/sms/templates/{template_id}", response_model=SmsTemplateItem)
def update_sms_template(
    template_id: int,
    payload: SmsTemplateUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsTemplateItem:
    template = db.query(SmsTemplate).filter(SmsTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="sms template not found")
    if payload.name is not None:
        name_value = payload.name.strip()
        if not name_value:
            raise HTTPException(status_code=400, detail="name is required")
        template.name = name_value
    if payload.body is not None:
        if not payload.body.strip():
            raise HTTPException(status_code=400, detail="body is required")
        template.body = payload.body
    if payload.variables is not None:
        template.variables = _serialize_json_list(payload.variables)
    if payload.disabled is not None:
        template.disabled_at = datetime.utcnow() if payload.disabled else None
    template.updated_at = datetime.utcnow()
    db.add(template)
    db.commit()
    db.refresh(template)
    return _sms_template_to_item(template)


@app.delete("/api/sms/templates/{template_id}", response_model=SmsTemplateItem)
def disable_sms_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsTemplateItem:
    template = db.query(SmsTemplate).filter(SmsTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="sms template not found")
    template.disabled_at = datetime.utcnow()
    template.updated_at = datetime.utcnow()
    db.add(template)
    db.commit()
    db.refresh(template)
    return _sms_template_to_item(template)


@app.get("/api/sms/contacts", response_model=SmsContactListResponse)
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
                contact
                for contact in contacts
                if tag_value in {item.lower() for item in _deserialize_tags(contact.tags)}
            ]
    total = len(contacts)
    paginated = contacts[offset : offset + limit]
    return SmsContactListResponse(
        contacts=[_sms_contact_to_item(item) for item in paginated],
        total=total,
    )


@app.post("/api/sms/contacts", response_model=SmsContactItem)
def create_sms_contact(
    payload: SmsContactCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsContactItem:
    phone = _normalize_sms_phone(payload.phone)
    existing = db.query(SmsContact).filter(SmsContact.phone == phone).first()
    if existing:
        if payload.name is not None:
            existing.name = payload.name.strip() or None
        if payload.tags is not None:
            existing.tags = _serialize_tags(payload.tags)
        existing.disabled_at = None
        existing.updated_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return _sms_contact_to_item(existing)
    contact = SmsContact(
        phone=phone,
        name=payload.name.strip() if payload.name else None,
        tags=_serialize_tags(payload.tags),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _sms_contact_to_item(contact)


@app.patch("/api/sms/contacts/{contact_id}", response_model=SmsContactItem)
def update_sms_contact(
    contact_id: int,
    payload: SmsContactUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsContactItem:
    contact = db.query(SmsContact).filter(SmsContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    if payload.name is not None:
        contact.name = payload.name.strip() or None
    if payload.tags is not None:
        contact.tags = _serialize_tags(payload.tags)
    if payload.disabled is not None:
        contact.disabled_at = datetime.utcnow() if payload.disabled else None
    contact.updated_at = datetime.utcnow()
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _sms_contact_to_item(contact)


@app.delete("/api/sms/contacts/{contact_id}", response_model=SmsContactItem)
def disable_sms_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsContactItem:
    contact = db.query(SmsContact).filter(SmsContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    contact.disabled_at = datetime.utcnow()
    contact.updated_at = datetime.utcnow()
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _sms_contact_to_item(contact)


@app.post("/api/sms/contacts/import")
async def import_sms_contacts(
    file: UploadFile = File(...),
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> JSONResponse:
    raw = await file.read()
    content = raw.decode("utf-8-sig", errors="replace")
    stream = io.StringIO(content)
    reader = csv.reader(stream)
    rows = list(reader)
    if not rows:
        return JSONResponse({"added": 0, "updated": 0, "skipped": 0})

    header = [cell.strip().lower() for cell in rows[0]]
    use_header = "phone" in header
    data_rows = rows[1:] if use_header else rows
    added = 0
    updated = 0
    skipped = 0

    def ensure_contact(phone_value: str, name_value: Optional[str], tags_value: Optional[str]) -> Optional[SmsContact]:
        nonlocal added, updated, skipped
        if not phone_value:
            skipped += 1
            return None
        try:
            normalized = _normalize_sms_phone(phone_value)
        except HTTPException:
            skipped += 1
            return None
        tags_list = (
            [tag.strip() for tag in tags_value.split(",") if tag.strip()]
            if tags_value
            else None
        )
        existing = db.query(SmsContact).filter(SmsContact.phone == normalized).first()
        if existing:
            if name_value:
                existing.name = name_value.strip() or None
            if tags_list is not None:
                existing.tags = _serialize_tags(tags_list)
            existing.disabled_at = None
            existing.updated_at = datetime.utcnow()
            db.add(existing)
            updated += 1
            return existing
        contact = SmsContact(
            phone=normalized,
            name=name_value.strip() if name_value else None,
            tags=_serialize_tags(tags_list),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(contact)
        db.flush()
        added += 1
        return contact

    for row in data_rows:
        if not row:
            continue
        phone_value = ""
        name_value = None
        tags_value = None
        if use_header:
            data = {header[idx]: (row[idx] if idx < len(row) else "") for idx in range(len(header))}
            phone_value = data.get("phone", "") or data.get("手机号", "")
            name_value = data.get("name", "") or data.get("姓名", "")
            tags_value = data.get("tags", "") or data.get("标签", "")
        else:
            phone_value = row[0] if len(row) > 0 else ""
            name_value = row[1] if len(row) > 1 else None
            tags_value = row[2] if len(row) > 2 else None
        contact = ensure_contact(phone_value, name_value, tags_value)
        if contact and group_id:
            existing = (
                db.query(SmsGroupMember)
                .filter(SmsGroupMember.group_id == group_id, SmsGroupMember.contact_id == contact.id)
                .first()
            )
            if not existing:
                db.add(
                    SmsGroupMember(
                        group_id=group_id,
                        contact_id=contact.id,
                        created_at=datetime.utcnow(),
                    )
                )

    db.commit()
    return JSONResponse({"added": added, "updated": updated, "skipped": skipped})


@app.get("/api/sms/contacts/export")
def export_sms_contacts(
    include_disabled: bool = False,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> StreamingResponse:
    query = db.query(SmsContact)
    if not include_disabled:
        query = query.filter(SmsContact.disabled_at.is_(None))
    contacts = query.order_by(SmsContact.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["phone", "name", "tags"])
    for contact in contacts:
        tags_text = ",".join(_deserialize_tags(contact.tags))
        writer.writerow([contact.phone, contact.name or "", tags_text])
    output.seek(0)
    headers = {"Content-Disposition": "attachment; filename=sms_contacts.csv"}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@app.get("/api/sms/groups", response_model=SmsGroupListResponse)
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
        groups=[_sms_group_to_item(group, counts.get(group.id, 0)) for group in groups]
    )


@app.post("/api/sms/groups", response_model=SmsGroupItem)
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


@app.patch("/api/sms/groups/{group_id}", response_model=SmsGroupItem)
def update_sms_group(
    group_id: int,
    payload: SmsGroupUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsGroupItem:
    group = db.query(SmsGroup).filter(SmsGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    if payload.name is not None:
        name_value = payload.name.strip()
        if not name_value:
            raise HTTPException(status_code=400, detail="name is required")
        group.name = name_value
    if payload.description is not None:
        group.description = payload.description
    group.updated_at = datetime.utcnow()
    db.add(group)
    db.commit()
    db.refresh(group)
    member_count = (
        db.query(SmsGroupMember).filter(SmsGroupMember.group_id == group_id).count()
    )
    return _sms_group_to_item(group, member_count)


@app.delete("/api/sms/groups/{group_id}", response_model=SmsGroupItem)
def delete_sms_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsGroupItem:
    group = db.query(SmsGroup).filter(SmsGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    member_count = (
        db.query(SmsGroupMember).filter(SmsGroupMember.group_id == group_id).count()
    )
    db.query(SmsGroupMember).filter(SmsGroupMember.group_id == group_id).delete()
    db.delete(group)
    db.commit()
    return _sms_group_to_item(group, member_count)


@app.get("/api/sms/groups/{group_id}/members", response_model=SmsGroupMembersResponse)
def list_sms_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsGroupMembersResponse:
    group = db.query(SmsGroup).filter(SmsGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    members = (
        db.query(SmsContact)
        .join(SmsGroupMember, SmsGroupMember.contact_id == SmsContact.id)
        .filter(SmsGroupMember.group_id == group_id, SmsContact.disabled_at.is_(None))
        .all()
    )
    return SmsGroupMembersResponse(
        group_id=group_id,
        members=[_sms_contact_to_item(item) for item in members],
    )


@app.post("/api/sms/groups/{group_id}/members", response_model=SmsGroupMembersResponse)
def add_sms_group_members(
    group_id: int,
    payload: SmsGroupMembersRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsGroupMembersResponse:
    group = db.query(SmsGroup).filter(SmsGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    contact_ids = payload.contact_ids or []
    phones = payload.phones or []
    contacts: List[SmsContact] = []

    if contact_ids:
        contacts.extend(
            db.query(SmsContact)
            .filter(SmsContact.id.in_(contact_ids))
            .all()
        )
    for phone_value in phones:
        normalized = _normalize_sms_phone(phone_value)
        contact = db.query(SmsContact).filter(SmsContact.phone == normalized).first()
        if not contact:
            contact = SmsContact(
                phone=normalized,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
        contacts.append(contact)

    for contact in contacts:
        existing = (
            db.query(SmsGroupMember)
            .filter(SmsGroupMember.group_id == group_id, SmsGroupMember.contact_id == contact.id)
            .first()
        )
        if not existing:
            db.add(
                SmsGroupMember(
                    group_id=group_id,
                    contact_id=contact.id,
                    created_at=datetime.utcnow(),
                )
            )
    db.commit()
    return list_sms_group_members(group_id, db)


@app.delete("/api/sms/groups/{group_id}/members", response_model=SmsGroupMembersResponse)
def remove_sms_group_members(
    group_id: int,
    payload: SmsGroupMembersRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsGroupMembersResponse:
    contact_ids = payload.contact_ids or []
    phones = payload.phones or []
    if phones:
        normalized = _normalize_sms_phones(phones)
        phone_contacts = (
            db.query(SmsContact.id)
            .filter(SmsContact.phone.in_(normalized))
            .all()
        )
        contact_ids.extend([item[0] for item in phone_contacts])
    if contact_ids:
        db.query(SmsGroupMember).filter(
            SmsGroupMember.group_id == group_id,
            SmsGroupMember.contact_id.in_(contact_ids),
        ).delete(synchronize_session=False)
        db.commit()
    return list_sms_group_members(group_id, db)


@app.post("/api/send/sms", response_model=SendResponse)
def send_sms(
    payload: SmsSendRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SendResponse:
    if not payload.message and not payload.template_id:
        raise HTTPException(status_code=400, detail="message or template_id is required")
    template = _resolve_sms_template(db, payload.template_id)
    body_source = payload.message or (template.body if template else "")
    if not body_source:
        raise HTTPException(status_code=400, detail="message body is required")
    from_number = payload.from_number or settings.twilio_sms_from
    messaging_service_sid = payload.messaging_service_sid or settings.twilio_sms_messaging_service_sid
    if not from_number and not messaging_service_sid:
        raise HTTPException(status_code=400, detail="TWILIO_SMS_FROM is not configured")

    append_opt_out = payload.append_opt_out if payload.append_opt_out is not None else True
    rate_per_minute = payload.rate_per_minute or settings.sms_default_rate_per_minute
    delay_seconds = _sms_rate_delay(rate_per_minute)

    twilio = _ensure_twilio()
    batch_id = uuid4().hex
    results: List[SendResult] = []
    variables = _build_sms_variables(payload.template_variables or {}, None)

    for recipient in _normalize_sms_phones(payload.recipients):
        body = _render_sms_body(body_source, variables)
        results.append(
            _send_sms_outbound(
                db,
                twilio=twilio,
                recipient=recipient,
                body=body,
                batch_id=batch_id,
                from_number=from_number,
                messaging_service_sid=messaging_service_sid,
                campaign_id=None,
                template_id=payload.template_id,
                variant=None,
                append_opt_out=append_opt_out,
                use_proxy=None,
            )
        )
        if delay_seconds:
            time.sleep(delay_seconds)

    return SendResponse(batch_id=batch_id, channel="sms", results=results)


@app.get("/api/sms/campaigns", response_model=SmsCampaignListResponse)
def list_sms_campaigns(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsCampaignListResponse:
    query = db.query(SmsCampaign)
    if status:
        query = query.filter(SmsCampaign.status == status)
    campaigns = query.order_by(SmsCampaign.created_at.desc()).all()
    return SmsCampaignListResponse(campaigns=[_sms_campaign_to_item(item) for item in campaigns])


@app.post("/api/sms/campaigns", response_model=SmsCampaignItem)
def create_sms_campaign(
    payload: SmsCampaignCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not payload.message and not payload.template_id and not (
        payload.variant_a and payload.variant_b
    ):
        raise HTTPException(status_code=400, detail="message, template, or variants are required")
    _resolve_sms_template(db, payload.template_id)
    campaign = SmsCampaign(
        name=name,
        message=payload.message,
        template_id=payload.template_id,
        template_variables=_serialize_json_dict(payload.template_variables),
        variant_a=payload.variant_a,
        variant_b=payload.variant_b,
        ab_split=payload.ab_split or 50,
        status="scheduled" if payload.schedule_at else "draft",
        schedule_at=payload.schedule_at,
        from_number=payload.from_number,
        messaging_service_sid=payload.messaging_service_sid,
        rate_per_minute=payload.rate_per_minute or settings.sms_default_rate_per_minute,
        batch_size=payload.batch_size or settings.sms_default_batch_size,
        append_opt_out=payload.append_opt_out if payload.append_opt_out is not None else True,
        target_groups=_serialize_json_list(payload.group_ids),
        target_tags=_serialize_json_list(payload.tags),
        target_recipients=_serialize_json_list(
            _normalize_sms_phones(payload.recipients) if payload.recipients else []
        ),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.patch("/api/sms/campaigns/{campaign_id}", response_model=SmsCampaignItem)
def update_sms_campaign(
    campaign_id: int,
    payload: SmsCampaignUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if campaign.status not in {"draft", "scheduled", "paused"}:
        raise HTTPException(status_code=400, detail="campaign cannot be modified")
    if payload.name is not None:
        campaign.name = payload.name.strip() or campaign.name
    if payload.message is not None:
        campaign.message = payload.message
    if payload.template_id is not None:
        _resolve_sms_template(db, payload.template_id)
        campaign.template_id = payload.template_id
    if payload.template_variables is not None:
        campaign.template_variables = _serialize_json_dict(payload.template_variables)
    if payload.variant_a is not None:
        campaign.variant_a = payload.variant_a
    if payload.variant_b is not None:
        campaign.variant_b = payload.variant_b
    if payload.ab_split is not None:
        campaign.ab_split = payload.ab_split
    if payload.schedule_at is not None:
        campaign.schedule_at = payload.schedule_at
    if payload.from_number is not None:
        campaign.from_number = payload.from_number
    if payload.messaging_service_sid is not None:
        campaign.messaging_service_sid = payload.messaging_service_sid
    if payload.rate_per_minute is not None:
        campaign.rate_per_minute = payload.rate_per_minute
    if payload.batch_size is not None:
        campaign.batch_size = payload.batch_size
    if payload.append_opt_out is not None:
        campaign.append_opt_out = payload.append_opt_out
    if payload.group_ids is not None:
        campaign.target_groups = _serialize_json_list(payload.group_ids)
    if payload.tags is not None:
        campaign.target_tags = _serialize_json_list(payload.tags)
    if payload.recipients is not None:
        campaign.target_recipients = _serialize_json_list(
            _normalize_sms_phones(payload.recipients)
        )
    if payload.status is not None:
        campaign.status = payload.status
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.post("/api/sms/campaigns/{campaign_id}/schedule", response_model=SmsCampaignItem)
def schedule_sms_campaign(
    campaign_id: int,
    payload: SmsCampaignUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    if not payload.schedule_at:
        raise HTTPException(status_code=400, detail="schedule_at is required")
    campaign.schedule_at = payload.schedule_at
    campaign.status = "scheduled"
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.post("/api/sms/campaigns/{campaign_id}/start", response_model=SmsCampaignItem)
def start_sms_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    campaign.status = "scheduled"
    campaign.schedule_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.post("/api/sms/campaigns/{campaign_id}/pause", response_model=SmsCampaignItem)
def pause_sms_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    campaign.status = "paused"
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.post("/api/sms/campaigns/{campaign_id}/resume", response_model=SmsCampaignItem)
def resume_sms_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    campaign.status = "scheduled"
    campaign.schedule_at = datetime.utcnow()
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.post("/api/sms/campaigns/{campaign_id}/cancel", response_model=SmsCampaignItem)
def cancel_sms_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("send")),
) -> SmsCampaignItem:
    campaign = db.query(SmsCampaign).filter(SmsCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign not found")
    campaign.status = "canceled"
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _sms_campaign_to_item(campaign)


@app.get("/api/sms/campaigns/{campaign_id}/stats", response_model=SmsCampaignStatsResponse)
def sms_campaign_stats(
    campaign_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsCampaignStatsResponse:
    query = db.query(Message).filter(
        Message.channel == "sms", Message.campaign_id == campaign_id
    )
    stats = _sms_stats_from_query(query)
    variants: Dict[str, Dict[str, int]] = {}
    for variant in ("A", "B"):
        variant_counts = dict(
            query.filter(Message.variant == variant)
            .with_entities(Message.status, func.count(Message.id))
            .group_by(Message.status)
            .all()
        )
        variants[variant] = {key: int(value) for key, value in variant_counts.items()}
    return SmsCampaignStatsResponse(
        campaign_id=campaign_id,
        total=stats.total,
        delivered=stats.delivered,
        failed=stats.failed,
        undelivered=stats.undelivered,
        queued=stats.queued,
        sent=stats.sent,
        received=stats.received,
        blocked=stats.blocked,
        cost=stats.cost,
        price_unit=stats.price_unit,
        variants=variants or None,
    )


@app.get("/api/sms/keywords", response_model=SmsKeywordRuleListResponse)
def list_sms_keyword_rules(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsKeywordRuleListResponse:
    rules = db.query(SmsKeywordRule).order_by(SmsKeywordRule.created_at.desc()).all()
    return SmsKeywordRuleListResponse(rules=[_sms_keyword_rule_to_item(rule) for rule in rules])


@app.post("/api/sms/keywords", response_model=SmsKeywordRuleItem)
def create_sms_keyword_rule(
    payload: SmsKeywordRuleCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsKeywordRuleItem:
    match_type = payload.match_type.lower()
    if match_type not in {"exact", "contains", "regex"}:
        raise HTTPException(status_code=400, detail="invalid match_type")
    rule = SmsKeywordRule(
        keyword=payload.keyword,
        match_type=match_type,
        response_text=payload.response_text,
        enabled=payload.enabled if payload.enabled is not None else True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _sms_keyword_rule_to_item(rule)


@app.patch("/api/sms/keywords/{rule_id}", response_model=SmsKeywordRuleItem)
def update_sms_keyword_rule(
    rule_id: int,
    payload: SmsKeywordRuleUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsKeywordRuleItem:
    rule = db.query(SmsKeywordRule).filter(SmsKeywordRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="rule not found")
    if payload.keyword is not None:
        rule.keyword = payload.keyword
    if payload.match_type is not None:
        match_type = payload.match_type.lower()
        if match_type not in {"exact", "contains", "regex"}:
            raise HTTPException(status_code=400, detail="invalid match_type")
        rule.match_type = match_type
    if payload.response_text is not None:
        rule.response_text = payload.response_text
    if payload.enabled is not None:
        rule.enabled = payload.enabled
    rule.updated_at = datetime.utcnow()
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _sms_keyword_rule_to_item(rule)


@app.delete("/api/sms/keywords/{rule_id}", response_model=SmsKeywordRuleItem)
def delete_sms_keyword_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsKeywordRuleItem:
    rule = db.query(SmsKeywordRule).filter(SmsKeywordRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="rule not found")
    item = _sms_keyword_rule_to_item(rule)
    db.delete(rule)
    db.commit()
    return item


@app.get("/api/sms/opt-outs", response_model=SmsOptOutListResponse)
def list_sms_opt_outs(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsOptOutListResponse:
    opt_outs = db.query(SmsOptOut).order_by(SmsOptOut.created_at.desc()).all()
    return SmsOptOutListResponse(
        opt_outs=[
            SmsOptOutItem(
                id=opt_out.id,
                phone=opt_out.phone,
                reason=opt_out.reason,
                source=opt_out.source,
                created_at=opt_out.created_at,
            )
            for opt_out in opt_outs
        ]
    )


@app.post("/api/sms/opt-outs", response_model=SmsOptOutItem)
def create_sms_opt_out(
    payload: SmsOptOutCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsOptOutItem:
    phone = _normalize_sms_phone(payload.phone)
    existing = db.query(SmsOptOut).filter(SmsOptOut.phone == phone).first()
    if existing:
        return SmsOptOutItem(
            id=existing.id,
            phone=existing.phone,
            reason=existing.reason,
            source=existing.source,
            created_at=existing.created_at,
        )
    record = SmsOptOut(
        phone=phone,
        reason=payload.reason,
        source=payload.source,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return SmsOptOutItem(
        id=record.id,
        phone=record.phone,
        reason=record.reason,
        source=record.source,
        created_at=record.created_at,
    )


@app.delete("/api/sms/opt-outs/{opt_out_id}", response_model=SmsOptOutItem)
def delete_sms_opt_out(
    opt_out_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsOptOutItem:
    record = db.query(SmsOptOut).filter(SmsOptOut.id == opt_out_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="opt-out not found")
    item = SmsOptOutItem(
        id=record.id,
        phone=record.phone,
        reason=record.reason,
        source=record.source,
        created_at=record.created_at,
    )
    db.delete(record)
    db.commit()
    return item


@app.get("/api/sms/blacklist", response_model=SmsBlacklistListResponse)
def list_sms_blacklist(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsBlacklistListResponse:
    records = db.query(SmsBlacklist).order_by(SmsBlacklist.created_at.desc()).all()
    return SmsBlacklistListResponse(
        blacklist=[
            SmsBlacklistItem(
                id=item.id,
                phone=item.phone,
                reason=item.reason,
                created_at=item.created_at,
            )
            for item in records
        ]
    )


@app.post("/api/sms/blacklist", response_model=SmsBlacklistItem)
def create_sms_blacklist(
    payload: SmsBlacklistCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsBlacklistItem:
    phone = _normalize_sms_phone(payload.phone)
    existing = db.query(SmsBlacklist).filter(SmsBlacklist.phone == phone).first()
    if existing:
        return SmsBlacklistItem(
            id=existing.id,
            phone=existing.phone,
            reason=existing.reason,
            created_at=existing.created_at,
        )
    record = SmsBlacklist(
        phone=phone,
        reason=payload.reason,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return SmsBlacklistItem(
        id=record.id,
        phone=record.phone,
        reason=record.reason,
        created_at=record.created_at,
    )


@app.delete("/api/sms/blacklist/{record_id}", response_model=SmsBlacklistItem)
def delete_sms_blacklist(
    record_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> SmsBlacklistItem:
    record = db.query(SmsBlacklist).filter(SmsBlacklist.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="blacklist record not found")
    item = SmsBlacklistItem(
        id=record.id,
        phone=record.phone,
        reason=record.reason,
        created_at=record.created_at,
    )
    db.delete(record)
    db.commit()
    return item


@app.get("/api/sms/stats", response_model=SmsStatsResponse)
def sms_stats(
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> SmsStatsResponse:
    query = db.query(Message).filter(Message.channel == "sms")
    if created_from:
        query = query.filter(Message.created_at >= created_from)
    if created_to:
        query = query.filter(Message.created_at <= created_to)
    return _sms_stats_from_query(query)


@app.get("/api/status/{message_id}", response_model=MessageStatus)
def get_status(
    message_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> MessageStatus:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="message not found")
    return _message_to_status(message)


@app.get("/api/status/twilio/{message_sid}", response_model=TwilioMessageStatus)
def get_twilio_status(
    message_sid: str,
    use_proxy: Optional[bool] = None,
    _: ApiKey = Depends(require_api_key("read")),
) -> TwilioMessageStatus:
    twilio = _ensure_twilio()
    try:
        message = twilio.fetch_message(message_sid, use_proxy=use_proxy)
    except Exception as exc:  # pragma: no cover - external API
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TwilioMessageStatus(
        sid=message.sid or message_sid,
        status=message.status,
        to=message.to,
        from_address=message.from_,
        direction=message.direction,
        error_code=message.error_code,
        error_message=message.error_message,
        price=message.price,
        price_unit=message.price_unit,
        num_segments=message.num_segments,
        num_media=message.num_media,
        messaging_service_sid=message.messaging_service_sid,
        date_created=message.date_created,
        date_updated=message.date_updated,
        date_sent=message.date_sent,
        body=message.body,
        account_sid=message.account_sid,
        api_version=message.api_version,
        uri=message.uri,
    )


@app.get("/api/batch/{batch_id}", response_model=List[MessageStatus])
def get_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> List[MessageStatus]:
    messages = db.query(Message).filter(Message.batch_id == batch_id).all()
    return [_message_to_status(message) for message in messages]


@app.post("/webhooks/twilio/whatsapp")
async def twilio_whatsapp_webhook(request: Request, db: Session = Depends(get_db)) -> PlainTextResponse:
    form = await request.form()
    params = dict(form)
    signature = request.headers.get("X-Twilio-Signature", "")

    if settings.twilio_validate_webhook_signature:
        twilio = _ensure_twilio()
        if not twilio.validate_webhook(_public_url(request), params, signature):
            raise HTTPException(status_code=403, detail="invalid signature")

    local_id = request.query_params.get("local_id")
    message_sid = params.get("MessageSid")
    status = params.get("MessageStatus")
    error_code = params.get("ErrorCode")
    error_message = params.get("ErrorMessage")

    message = None
    if local_id:
        try:
            message = db.query(Message).filter(Message.id == int(local_id)).first()
        except ValueError:
            message = None
    if not message and message_sid:
        message = db.query(Message).filter(Message.provider_message_id == message_sid).first()

    if message:
        if message_sid:
            message.provider_message_id = message_sid
        if not message.direction:
            message.direction = "outbound"
        if status:
            message.status = status
            # 当Twilio报告消息状态为"read"时，自动更新read_at字段
            if status.lower() == "read" and message.read_at is None:
                message.read_at = datetime.utcnow()
        if error_code or error_message:
            message.error = f"{error_code or ''} {error_message or ''}".strip()
        message.updated_at = datetime.utcnow()
        db.add(message)
        db.commit()

    return PlainTextResponse("ok")


@app.post("/webhooks/twilio/whatsapp/inbound")
async def twilio_whatsapp_inbound(
    request: Request, db: Session = Depends(get_db)
) -> PlainTextResponse:
    form = await request.form()
    params = dict(form)
    signature = request.headers.get("X-Twilio-Signature", "")

    if settings.twilio_validate_webhook_signature:
        twilio = _ensure_twilio()
        if not twilio.validate_webhook(_public_url(request), params, signature):
            raise HTTPException(status_code=403, detail="invalid signature")

    from_value = params.get("From")
    to_value = params.get("To")
    if not from_value or not to_value:
        raise HTTPException(status_code=400, detail="From and To are required")

    message_sid = (
        params.get("MessageSid")
        or params.get("SmsMessageSid")
        or params.get("SmsSid")
    )
    if message_sid:
        existing = (
            db.query(Message)
            .filter(Message.provider_message_id == message_sid)
            .first()
        )
        if existing:
            return PlainTextResponse("ok")

    body = params.get("Body") or ""
    try:
        media_count = int(params.get("NumMedia") or 0)
    except ValueError:
        media_count = 0
    if media_count > 0:
        media_urls: List[str] = []
        for i in range(media_count):
            url = params.get(f"MediaUrl{i}")
            if url:
                media_urls.append(url)
        if media_urls:
            if body:
                body = f"{body}\n" + "\n".join(media_urls)
            else:
                body = "Media:\n" + "\n".join(media_urls)

    now = datetime.utcnow()
    message = Message(
        batch_id=f"inbound_{uuid4().hex}",
        channel="whatsapp",
        to_address=normalize_whatsapp(to_value.strip()),
        from_address=normalize_whatsapp(from_value.strip()),
        subject=None,
        body=body or None,
        status="received",
        provider_message_id=message_sid,
        direction="inbound",
        created_at=now,
        updated_at=now,
    )
    db.add(message)
    db.commit()

    return PlainTextResponse("ok")


@app.post("/webhooks/twilio/sms/status")
async def twilio_sms_status(
    request: Request, db: Session = Depends(get_db)
) -> PlainTextResponse:
    form = await request.form()
    params = dict(form)
    signature = request.headers.get("X-Twilio-Signature", "")

    if settings.twilio_validate_webhook_signature:
        twilio = _ensure_twilio()
        if not twilio.validate_webhook(_public_url(request), params, signature):
            raise HTTPException(status_code=403, detail="invalid signature")

    local_id = request.query_params.get("local_id")
    message_sid = (
        params.get("MessageSid")
        or params.get("SmsMessageSid")
        or params.get("SmsSid")
    )
    status = params.get("MessageStatus") or params.get("SmsStatus")
    error_code = params.get("ErrorCode")
    error_message = params.get("ErrorMessage")
    price = params.get("Price")
    price_unit = params.get("PriceUnit")
    num_segments = params.get("NumSegments")

    message = None
    if local_id:
        try:
            message = db.query(Message).filter(Message.id == int(local_id)).first()
        except ValueError:
            message = None
    if not message and message_sid:
        message = db.query(Message).filter(Message.provider_message_id == message_sid).first()

    if message:
        if message_sid:
            message.provider_message_id = message_sid
        if not message.direction:
            message.direction = "outbound"
        if status:
            message.status = status
        if price is not None:
            try:
                message.price = float(price)
            except ValueError:
                pass
        if price_unit:
            message.price_unit = price_unit
        if num_segments:
            try:
                message.num_segments = int(num_segments)
            except ValueError:
                pass
        if error_code or error_message:
            message.error = f"{error_code or ''} {error_message or ''}".strip()
        message.updated_at = datetime.utcnow()
        db.add(message)
        db.commit()

    return PlainTextResponse("ok")


@app.post("/webhooks/twilio/sms/inbound")
async def twilio_sms_inbound(
    request: Request, db: Session = Depends(get_db)
) -> PlainTextResponse:
    form = await request.form()
    params = dict(form)
    signature = request.headers.get("X-Twilio-Signature", "")

    if settings.twilio_validate_webhook_signature:
        twilio = _ensure_twilio()
        if not twilio.validate_webhook(_public_url(request), params, signature):
            raise HTTPException(status_code=403, detail="invalid signature")

    from_value = params.get("From")
    to_value = params.get("To")
    if not from_value or not to_value:
        raise HTTPException(status_code=400, detail="From and To are required")

    message_sid = (
        params.get("MessageSid")
        or params.get("SmsMessageSid")
        or params.get("SmsSid")
    )
    if message_sid:
        existing = (
            db.query(Message)
            .filter(Message.provider_message_id == message_sid)
            .first()
        )
        if existing:
            return PlainTextResponse("ok")

    body = (params.get("Body") or "").strip()
    from_phone = _normalize_sms_phone(from_value)
    to_phone = _normalize_sms_phone(to_value)

    message = _create_sms_message_record(
        db,
        batch_id=f"inbound_{uuid4().hex}",
        to_address=to_phone,
        from_address=from_phone,
        body=body,
        status="received",
        direction="inbound",
        provider_message_id=message_sid,
    )

    lower_body = body.lower()
    opt_out_keywords = {"stop", "unsubscribe", "cancel", "end", "quit", "退订", "td", "t"}
    start_keywords = {"start", "yes", "resume", "恢复", "订阅", "开启"}
    help_keywords = {"help", "?", "帮助"}

    if any(keyword in lower_body for keyword in opt_out_keywords) or "退订" in body:
        existing = db.query(SmsOptOut).filter(SmsOptOut.phone == from_phone).first()
        if not existing:
            db.add(
                SmsOptOut(
                    phone=from_phone,
                    reason="keyword",
                    source="inbound",
                    created_at=datetime.utcnow(),
                )
            )
            db.commit()
        return PlainTextResponse("ok")

    if any(keyword in lower_body for keyword in start_keywords):
        db.query(SmsOptOut).filter(SmsOptOut.phone == from_phone).delete()
        db.commit()

    reply_text = None
    if settings.sms_auto_reply_enabled:
        if any(keyword in lower_body for keyword in help_keywords):
            reply_text = (settings.sms_help_text or "").strip() or None
        else:
            rules = (
                db.query(SmsKeywordRule)
                .filter(SmsKeywordRule.enabled.is_(True))
                .order_by(SmsKeywordRule.created_at.desc())
                .all()
            )
            for rule in rules:
                if _match_keyword(rule, body):
                    reply_text = rule.response_text
                    break

    if reply_text:
        twilio = _ensure_twilio()
        _send_sms_outbound(
            db,
            twilio=twilio,
            recipient=from_phone,
            body=reply_text,
            batch_id=f"reply_{uuid4().hex}",
            from_number=to_phone,
            messaging_service_sid=None,
            campaign_id=None,
            template_id=None,
            variant=None,
            append_opt_out=False,
            use_proxy=None,
        )

    return PlainTextResponse("ok")


@app.post("/webhooks/sendgrid")
async def sendgrid_webhook(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    payload = await request.body()
    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")
    timestamp = request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp", "")
    _append_sendgrid_webhook_log(db, payload, signature, timestamp)

    if settings.sendgrid_event_webhook_verify:
        if not settings.sendgrid_event_webhook_public_key:
            raise HTTPException(status_code=400, detail="SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY is required")
        sendgrid = _ensure_sendgrid()
        if not sendgrid.verify_webhook(
            payload=payload,
            signature=signature,
            timestamp=timestamp,
            public_key=settings.sendgrid_event_webhook_public_key,
        ):
            raise HTTPException(status_code=403, detail="invalid signature")

    try:
        events = json.loads(payload or b"[]")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="invalid payload")

    updated = 0
    for event in events:
        if not isinstance(event, dict):
            continue
        custom_args = event.get("custom_args") or event.get("unique_args") or {}
        local_id = _extract_sendgrid_local_id(event)
        status = event.get("event")
        sg_message_id = event.get("sg_message_id")
        reason = event.get("reason") or event.get("response")

        message = None
        if local_id:
            try:
                message = db.query(Message).filter(Message.id == int(local_id)).first()
            except ValueError:
                message = None
        if not message and sg_message_id:
            message = db.query(Message).filter(Message.provider_message_id == sg_message_id).first()

        if message:
            if sg_message_id:
                message.provider_message_id = sg_message_id
            if not message.direction:
                message.direction = "outbound"
            if status:
                message.status = status
                # SendGrid的"open"事件表示邮件被打开/已读
                if status.lower() == "open" and message.read_at is None:
                    message.read_at = datetime.utcnow()
            if reason:
                message.error = reason
            message.updated_at = datetime.utcnow()
            db.add(message)
            updated += 1

    if updated:
        db.commit()

    return JSONResponse({"updated": updated})


@app.post("/webhooks/sendgrid/inbound")
async def sendgrid_inbound(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    form = await request.form()

    from_raw = _get_form_value(form, "from")
    to_raw = _get_form_value(form, "to")
    subject = (_get_form_value(form, "subject") or "").strip()
    text = _get_form_value(form, "stripped-text") or _get_form_value(form, "text")
    html = _get_form_value(form, "stripped-html") or _get_form_value(form, "html")
    headers = _get_form_value(form, "headers")
    message_id = _get_form_value(form, "message-id") or _extract_sendgrid_message_id(headers)

    from_address = _extract_first_email(from_raw)
    to_address = _extract_first_email(to_raw)
    if not from_address or not to_address:
        raise HTTPException(status_code=400, detail="from and to are required")

    if message_id:
        existing = (
            db.query(Message)
            .filter(Message.provider_message_id == message_id)
            .first()
        )
        if existing:
            return JSONResponse({"status": "ok", "deduped": True})

    body = (text or html or "").strip()
    now = datetime.utcnow()
    message = Message(
        batch_id=f"inbound_{uuid4().hex}",
        channel="email",
        to_address=to_address,
        from_address=from_address,
        subject=subject or None,
        body=body or None,
        status="received",
        provider_message_id=message_id,
        direction="inbound",
        created_at=now,
        updated_at=now,
    )
    db.add(message)
    db.commit()

    return JSONResponse({"status": "ok"})


@app.get("/api/chat/{user_address}", response_model=ChatHistoryResponse)
def get_chat_history(
    user_address: str,
    channel: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> ChatHistoryResponse:
    """获取指定用户的聊天记录"""
    normalized_user = None
    cleaned_user = user_address.strip()
    if cleaned_user and "@" not in cleaned_user:
        normalized_user = normalize_whatsapp(cleaned_user)

    base_filter = (Message.to_address == cleaned_user) | (Message.from_address == cleaned_user)
    if normalized_user and normalized_user != cleaned_user:
        base_filter = base_filter | (
            (Message.channel == "whatsapp")
            & ((Message.to_address == normalized_user) | (Message.from_address == normalized_user))
        )

    query = db.query(Message).filter(base_filter)

    if channel:
        query = query.filter(Message.channel == channel)

    total = query.count()
    unread_count = query.filter(Message.read_at.is_(None)).count()

    messages = (
        query.order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return ChatHistoryResponse(
        messages=[_message_to_chat(msg) for msg in reversed(messages)],
        total=total,
        unread_count=unread_count,
    )


@app.get("/api/messages/whatsapp", response_model=ChatHistoryResponse)
def list_whatsapp_messages(
    status: Optional[str] = None,
    to_address: Optional[str] = None,
    user_address: Optional[str] = None,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> ChatHistoryResponse:
    """
    分页返回所有 WhatsApp 消息列表。

    - 默认返回所有 WhatsApp 消息（按创建时间倒序）
    - 可选按状态、收件人、时间范围过滤
    """
    query = db.query(Message).filter(Message.channel == "whatsapp")

    if status:
        query = query.filter(Message.status == status)
    if user_address:
        cleaned_user = user_address.strip()
        normalized_user = (
            normalize_whatsapp(cleaned_user) if cleaned_user and "@" not in cleaned_user else cleaned_user
        )
        query = query.filter(
            (Message.to_address == cleaned_user)
            | (Message.from_address == cleaned_user)
            | (
                (Message.to_address == normalized_user)
                | (Message.from_address == normalized_user)
            )
        )
    if to_address:
        cleaned_to = to_address.strip()
        normalized_to = (
            normalize_whatsapp(cleaned_to) if cleaned_to and "@" not in cleaned_to else cleaned_to
        )
        query = query.filter(Message.to_address == normalized_to)
    if created_from:
        query = query.filter(Message.created_at >= created_from)
    if created_to:
        query = query.filter(Message.created_at <= created_to)

    total = query.count()
    unread_count = query.filter(Message.read_at.is_(None)).count()

    messages = (
        query.order_by(Message.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return ChatHistoryResponse(
        messages=[_message_to_chat(msg) for msg in messages],
        total=total,
        unread_count=unread_count,
    )


@app.get("/api/users", response_model=UserListResponse)
def list_users_with_messages(
    channel: Optional[str] = None,
    created_from: Optional[str] = None,
    created_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> UserListResponse:
    """
    分页查询已发送消息的用户列表
    
    返回所有接收过消息的用户地址，以及每个用户的统计信息。
    """
    # 解析时间参数
    from_datetime = None
    to_datetime = None
    if created_from:
        try:
            from_datetime = datetime.fromisoformat(created_from.replace("Z", "+00:00"))
        except ValueError:
            pass
    if created_to:
        try:
            to_datetime = datetime.fromisoformat(created_to.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    # 构建基础查询
    user_address_expr = _user_address_expr().label("user_address")
    base_query = db.query(user_address_expr)

    if channel:
        base_query = base_query.filter(Message.channel == channel)
    if from_datetime:
        base_query = base_query.filter(Message.created_at >= from_datetime)
    if to_datetime:
        base_query = base_query.filter(Message.created_at <= to_datetime)
    base_query = base_query.filter(user_address_expr.isnot(None), user_address_expr != "")

    # 获取所有不同的用户地址
    distinct_users = base_query.distinct().all()
    total_users = len(distinct_users)

    # 分页
    paginated_users = distinct_users[offset:offset + limit]

    # 为每个用户统计信息
    user_stats_list = []
    for (user_address,) in paginated_users:
        user_filter = (Message.to_address == user_address) | (Message.from_address == user_address)
        user_query = db.query(Message).filter(user_filter)

        if channel:
            user_query = user_query.filter(Message.channel == channel)
        if from_datetime:
            user_query = user_query.filter(Message.created_at >= from_datetime)
        if to_datetime:
            user_query = user_query.filter(Message.created_at <= to_datetime)

        total_messages = user_query.count()
        unread_count = user_query.filter(Message.read_at.is_(None)).count()

        # 获取最后一条消息的时间
        last_message = user_query.order_by(Message.created_at.desc()).first()
        last_message_at = last_message.created_at if last_message else None

        # 获取使用的渠道列表
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
    
    # 按最后消息时间倒序排序
    user_stats_list.sort(key=lambda x: x.last_message_at or datetime.min, reverse=True)
    
    return UserListResponse(
        users=user_stats_list,
        total=total_users,
    )


@app.post("/api/chat/mark-read", response_model=MarkReadResponse)
def mark_messages_read(
    request: MarkReadRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> MarkReadResponse:
    """
    手动标记消息为已读（备用功能）
    
    注意：已读状态通常通过以下方式自动更新：
    - WhatsApp: Twilio webhook 在消息状态为 "read" 时自动更新
    - Email: SendGrid webhook 在邮件 "open" 事件时自动更新
    
    此API主要用于手动标记，适用于webhook未正确触发的情况。
    """
    now = datetime.utcnow()
    updated = (
        db.query(Message)
        .filter(Message.id.in_(request.message_ids), Message.read_at.is_(None))
        .update({"read_at": now}, synchronize_session=False)
    )
    db.commit()
    return MarkReadResponse(updated=updated)
