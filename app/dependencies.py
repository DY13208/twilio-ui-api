"""Authentication and dependency injection utilities."""
from datetime import datetime, timedelta
import base64
import hashlib
import hmac
import json
import secrets
from typing import Any, Dict, Optional, Tuple

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AdminSession, AdminUser, ApiKey


# Constants
ADMIN_COOKIE_NAME = "admin_session"
API_KEY_HEADER = "X-API-Key"
ADMIN_TOKEN_HEADER = "Authorization"
ADMIN_TOKEN_PREFIX = "Bearer "


# Password utilities
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 200_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
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


# JWT utilities
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


def encode_admin_jwt(payload: Dict[str, Any], secret: str) -> str:
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


def decode_admin_jwt(token: str, secret: str) -> Dict[str, Any]:
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


def issue_admin_jwt(session: AdminSession, user: AdminUser) -> str:
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
    return encode_admin_jwt(payload, secret)


# API Key utilities
def normalize_scope(value: Optional[str]) -> str:
    scope = (value or "manage").strip().lower()
    if scope not in {"read", "send", "manage"}:
        raise HTTPException(status_code=400, detail="invalid api key scope")
    return scope


def hash_api_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def create_api_key_record(
    db: Session,
    *,
    name: Optional[str],
    scope: Optional[str],
    expires_in_days: Optional[int],
    admin_user_id: Optional[int],
) -> Tuple[ApiKey, str]:
    scope_value = normalize_scope(scope)
    expires_at = None
    if expires_in_days is not None:
        if expires_in_days <= 0:
            raise HTTPException(status_code=400, detail="expires_in_days must be positive")
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
    for _ in range(5):
        raw_key = f"sk_{secrets.token_urlsafe(32)}"
        key_hash = hash_api_key(raw_key)
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


# Token extraction utilities
def extract_api_key(request: Request) -> Optional[str]:
    header_value = request.headers.get(API_KEY_HEADER)
    if header_value:
        return header_value.strip()
    auth_value = request.headers.get(ADMIN_TOKEN_HEADER, "")
    if auth_value.lower().startswith("bearer "):
        return auth_value[7:].strip()
    return None


def extract_admin_token(request: Request) -> Optional[str]:
    auth_value = request.headers.get(ADMIN_TOKEN_HEADER, "")
    if auth_value.lower().startswith(ADMIN_TOKEN_PREFIX.lower()):
        return auth_value[len(ADMIN_TOKEN_PREFIX):].strip()
    return None


# Session management
def get_admin_session_by_token(token: str, db: Session) -> Optional[AdminSession]:
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


def get_admin_session(request: Request, db: Session) -> Optional[AdminSession]:
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    if not token:
        return None
    return get_admin_session_by_token(token, db)


def get_admin_session_from_jwt(token: str, db: Session) -> Optional[AdminSession]:
    secret = _get_admin_jwt_secret()
    payload = decode_admin_jwt(token, secret)
    session_token = payload.get("sid")
    user_id = payload.get("sub")
    if not session_token or user_id is None:
        return None
    session = get_admin_session_by_token(str(session_token), db)
    if not session:
        return None
    try:
        user_id_value = int(user_id)
    except (TypeError, ValueError):
        return None
    if session.admin_user_id != user_id_value:
        return None
    return session


# Admin dependencies
def require_admin(request: Request, db: Session = Depends(get_db)) -> AdminSession:
    session = get_admin_session(request, db)
    if not session:
        raise HTTPException(status_code=401, detail="admin login required")
    return session


def require_admin_api(request: Request, db: Session = Depends(get_db)) -> AdminSession:
    token = extract_admin_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="admin token required")
    session = get_admin_session_from_jwt(token, db)
    if not session:
        raise HTTPException(status_code=401, detail="admin token is invalid")
    return session


# API Key dependency
def _require_api_key(request: Request, db: Session, required_scope: str) -> ApiKey:
    api_key = extract_api_key(request)
    if not api_key:
        raise HTTPException(status_code=401, detail="api_key is required")
    key_hash = hash_api_key(api_key)
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


# Cookie utilities
def is_secure_request(request: Request) -> bool:
    if settings.admin_cookie_secure is not None:
        return settings.admin_cookie_secure
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto:
        return forwarded_proto.split(",")[0].strip().lower() == "https"
    return request.url.scheme == "https"


def set_admin_cookie(response: Response, token: str, request: Request) -> None:
    max_age = settings.admin_session_ttl_minutes * 60
    response.set_cookie(
        ADMIN_COOKIE_NAME,
        token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=is_secure_request(request),
    )


def clear_admin_cookie(response: Response) -> None:
    response.delete_cookie(ADMIN_COOKIE_NAME)


# Service instantiation
from app.services.sendgrid_client import SendGridService
from app.services.twilio_client import TwilioService


def ensure_sendgrid() -> SendGridService:
    try:
        return SendGridService()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def ensure_twilio() -> TwilioService:
    try:
        return TwilioService()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
