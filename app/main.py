from datetime import datetime, timedelta
import hashlib
import json
import posixpath
from pathlib import Path
import secrets
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text, func, distinct
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, engine, get_db
from app.models import AdminSession, AdminUser, ApiKey, Base, EmailSender, Message, WhatsAppSender
from app.schemas import (
    ApiKeyCreate,
    ApiKeyCreateResponse,
    ApiKeyItem,
    ApiKeyListResponse,
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
    SendResponse,
    SendResult,
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


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_schema()
    with SessionLocal() as db:
        _bootstrap_admin_user(db)


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
            {"read_at": "read_at DATETIME NULL"},
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
    auth_value = request.headers.get("Authorization", "")
    if auth_value.lower().startswith("bearer "):
        return auth_value[7:].strip()
    return None


def _get_admin_session(request: Request, db: Session) -> Optional[AdminSession]:
    token = request.cookies.get(ADMIN_COOKIE_NAME)
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


def _require_admin(
    request: Request, db: Session = Depends(get_db)
) -> AdminSession:
    session = _get_admin_session(request, db)
    if not session:
        raise HTTPException(status_code=401, detail="admin login required")
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
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.admin_session_ttl_minutes)
    session = AdminSession(
        token=token,
        admin_user_id=user.id,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    _set_admin_cookie(response, token, request)
    return LoginResponse(status="ok", token=token)


@app.post("/api/logout", response_model=LoginResponse)
def logout(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> LoginResponse:
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    if token:
        session = db.query(AdminSession).filter(AdminSession.token == token).first()
        if session:
            db.delete(session)
            db.commit()
    _clear_admin_cookie(response)
    return LoginResponse(status="ok")


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
    db: Session = Depends(get_db),
    session: AdminSession = Depends(_require_admin),
) -> ApiKeyListResponse:
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.admin_user_id == session.admin_user_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    items = [
        ApiKeyItem(
            id=key.id,
            name=key.name,
            prefix=key.prefix,
            scope=key.scope or "manage",
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
    session: AdminSession = Depends(_require_admin),
) -> ApiKeyCreateResponse:
    record, raw_key = _create_api_key_record(
        db,
        name=payload.name,
        scope=payload.scope,
        expires_in_days=payload.expires_in_days,
        admin_user_id=session.admin_user_id,
    )
    return ApiKeyCreateResponse(
        id=record.id,
        name=record.name,
        prefix=record.prefix,
        scope=record.scope or "manage",
        expires_at=record.expires_at,
        api_key=raw_key,
        created_at=record.created_at,
    )


@app.post("/api/keys/{key_id}/revoke", response_model=ApiKeyItem)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(_require_admin),
) -> ApiKeyItem:
    record = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.admin_user_id == session.admin_user_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="api key not found")
    if record.revoked_at is None:
        record.revoked_at = datetime.utcnow()
        db.add(record)
        db.commit()
        db.refresh(record)
    return ApiKeyItem(
        id=record.id,
        name=record.name,
        prefix=record.prefix,
        scope=record.scope or "manage",
        expires_at=record.expires_at,
        created_at=record.created_at,
        last_used_at=record.last_used_at,
        revoked_at=record.revoked_at,
    )


@app.get("/api/admin/users", response_model=AdminUserListResponse)
def list_admin_users(
    db: Session = Depends(get_db),
    _: AdminSession = Depends(_require_admin),
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
    _: AdminSession = Depends(_require_admin),
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
    session: AdminSession = Depends(_require_admin),
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
    _: AdminSession = Depends(_require_admin),
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


def _normalize_whatsapp_sender(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="from_address is required")
    return normalize_whatsapp(cleaned)


def _normalize_email_sender(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="from_email is required")
    return cleaned.lower()


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

    for recipient in request.recipients:
        message = Message(
            batch_id=batch_id,
            channel="email",
            to_address=recipient,
            from_address=sender.from_email,
            subject=request.subject,
            body=request.html or request.text,
            status="queued",
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
                html=request.html,
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
        stored_body = request.body
        if request.content_sid:
            stored_body = (
                f"template:{request.content_sid} "
                f"variables:{json.dumps(request.content_variables or {}, ensure_ascii=True)}"
            )
        message = Message(
            batch_id=batch_id,
            channel="whatsapp",
            to_address=recipient,
            from_address=selected_from,
            subject=None,
            body=stored_body,
            status="queued",
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
                to_number=recipient,
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


@app.post("/webhooks/sendgrid")
async def sendgrid_webhook(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    payload = await request.body()
    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")
    timestamp = request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp", "")

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
        custom_args = event.get("custom_args") or {}
        local_id = custom_args.get("local_message_id")
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
    query = db.query(Message).filter(
        (Message.to_address == user_address) | (Message.from_address == user_address)
    )

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
    if to_address:
        query = query.filter(Message.to_address == to_address)
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
    base_query = db.query(Message.to_address)
    
    if channel:
        base_query = base_query.filter(Message.channel == channel)
    if from_datetime:
        base_query = base_query.filter(Message.created_at >= from_datetime)
    if to_datetime:
        base_query = base_query.filter(Message.created_at <= to_datetime)
    
    # 获取所有不同的用户地址
    distinct_users = base_query.distinct().all()
    total_users = len(distinct_users)
    
    # 分页
    paginated_users = distinct_users[offset:offset + limit]
    
    # 为每个用户统计信息
    user_stats_list = []
    for (user_address,) in paginated_users:
        user_query = db.query(Message).filter(Message.to_address == user_address)
        
        if channel:
            user_query = user_query.filter(Message.channel == channel)
        if from_datetime:
            user_query = user_query.filter(Message.created_at >= from_datetime)
        if to_datetime:
            user_query = user_query.filter(Message.created_at <= to_datetime)
        
        total_messages = user_query.count()
        unread_count = user_query.filter(Message.read_at.is_(None)).count()
        
        # 获取最后一条消息的时间
        last_message = (
            user_query.order_by(Message.created_at.desc()).first()
        )
        last_message_at = last_message.created_at if last_message else None
        
        # 获取使用的渠道列表
        channels_query = (
            db.query(Message.channel)
            .filter(Message.to_address == user_address)
            .distinct()
        )
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
