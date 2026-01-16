"""Admin and API Key management routes."""
from datetime import datetime
from pathlib import Path
import threading
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AdminSession, AdminUser, ApiKey, AppSetting
from app.schemas import (
    ApiKeyCreate,
    ApiKeyCreateResponse,
    ApiKeyItem,
    ApiKeyListResponse,
    ApiKeyUpdate,
    AdminUserCreate,
    AdminUserItem,
    AdminUserListResponse,
    SendgridWebhookLogSettings,
    SendgridWebhookLogSettingsUpdate,
)
from app.dependencies import (
    require_admin_api,
    create_api_key_record,
    normalize_scope,
    hash_password,
)
from app.utils import field_is_set


router = APIRouter(tags=["admin"])

SENDGRID_LOG_ENABLED_KEY = "sendgrid_webhook_log_enabled"
SENDGRID_LOG_MAX_LINES_KEY = "sendgrid_webhook_log_max_lines"
SENDGRID_LOG_AUTO_CLOSE_KEY = "sendgrid_webhook_log_auto_close"


def _get_setting_value(db: Session, key: str) -> Optional[str]:
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    return setting.value if setting else None


def _set_setting_values(db: Session, values: Dict[str, Optional[str]]) -> None:
    for key, value in values.items():
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if value is None:
            if setting:
                db.delete(setting)
        else:
            if setting:
                setting.value = value
                setting.updated_at = datetime.utcnow()
                db.add(setting)
            else:
                db.add(
                    AppSetting(
                        key=key,
                        value=value,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                )
    db.commit()


def _parse_setting_bool(value: Optional[str]) -> bool:
    if not value:
        return False
    return value.lower() in {"true", "1", "yes", "on"}


def _parse_setting_int(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        result = int(value)
        return result if result > 0 else None
    except ValueError:
        return None


def _get_sendgrid_log_settings(db: Session) -> SendgridWebhookLogSettings:
    enabled = _parse_setting_bool(_get_setting_value(db, SENDGRID_LOG_ENABLED_KEY))
    max_lines = _parse_setting_int(_get_setting_value(db, SENDGRID_LOG_MAX_LINES_KEY))
    auto_close = _parse_setting_bool(_get_setting_value(db, SENDGRID_LOG_AUTO_CLOSE_KEY))
    return SendgridWebhookLogSettings(
        enabled=enabled,
        max_lines=max_lines,
        auto_close=auto_close,
        path=settings.sendgrid_webhook_log_path,
    )


@router.get("/api/keys", response_model=ApiKeyListResponse)
def list_api_keys(
    admin_user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
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


@router.post("/api/keys", response_model=ApiKeyCreateResponse)
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(require_admin_api),
) -> ApiKeyCreateResponse:
    owner_id = payload.admin_user_id
    if owner_id is None:
        owner_id = session.admin_user_id
    owner = db.query(AdminUser).filter(AdminUser.id == owner_id).first()
    if not owner or owner.disabled_at:
        raise HTTPException(status_code=400, detail="admin user is invalid")
    record, raw_key = create_api_key_record(
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


@router.post("/api/keys/{key_id}/revoke", response_model=ApiKeyItem)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
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


@router.patch("/api/keys/{key_id}", response_model=ApiKeyItem)
def update_api_key(
    key_id: int,
    payload: ApiKeyUpdate,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
) -> ApiKeyItem:
    record = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="api key not found")
    if payload.scope is not None:
        record.scope = normalize_scope(payload.scope)
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


@router.get("/api/admin/users", response_model=AdminUserListResponse)
def list_admin_users(
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
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


@router.post("/api/admin/users", response_model=AdminUserItem)
def upsert_admin_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
) -> AdminUserItem:
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="username is required")
    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="password is required")
    from app.models import AdminSession as AdminSessionModel
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    password_hash = hash_password(payload.password)
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
    db.query(AdminSessionModel).filter(AdminSessionModel.admin_user_id == user.id).delete()
    db.commit()
    return AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )


@router.post("/api/admin/users/{user_id}/disable", response_model=AdminUserItem)
def disable_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(require_admin_api),
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
    from app.models import AdminSession as AdminSessionModel
    db.query(AdminSessionModel).filter(AdminSessionModel.admin_user_id == user.id).delete()
    db.commit()
    return AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )


@router.post("/api/admin/users/{user_id}/enable", response_model=AdminUserItem)
def enable_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
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


@router.delete("/api/admin/users/{user_id}", response_model=AdminUserItem)
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    session: AdminSession = Depends(require_admin_api),
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
    from app.models import AdminSession as AdminSessionModel
    db.query(AdminSessionModel).filter(AdminSessionModel.admin_user_id == user.id).delete()
    item = AdminUserItem(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        disabled_at=user.disabled_at,
    )
    db.delete(user)
    db.commit()
    return item


@router.get(
    "/api/admin/settings/sendgrid-webhook-log",
    response_model=SendgridWebhookLogSettings,
)
def get_sendgrid_webhook_log_settings(
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
) -> SendgridWebhookLogSettings:
    return _get_sendgrid_log_settings(db)


@router.patch(
    "/api/admin/settings/sendgrid-webhook-log",
    response_model=SendgridWebhookLogSettings,
)
def update_sendgrid_webhook_log_settings(
    payload: SendgridWebhookLogSettingsUpdate,
    db: Session = Depends(get_db),
    _: AdminSession = Depends(require_admin_api),
) -> SendgridWebhookLogSettings:
    updates: Dict[str, Optional[str]] = {}
    if payload.enabled is not None:
        updates[SENDGRID_LOG_ENABLED_KEY] = "true" if payload.enabled else "false"
    if field_is_set(payload, "max_lines"):
        updates[SENDGRID_LOG_MAX_LINES_KEY] = (
            str(payload.max_lines) if payload.max_lines and payload.max_lines > 0 else None
        )
    if payload.auto_close is not None:
        updates[SENDGRID_LOG_AUTO_CLOSE_KEY] = "true" if payload.auto_close else "false"
    if updates:
        _set_setting_values(db, updates)
    return _get_sendgrid_log_settings(db)
