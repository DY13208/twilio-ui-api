"""Authentication routes for login/logout."""
from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AdminSession, AdminUser
from app.schemas import LoginRequest, LoginResponse
from app.dependencies import (
    ADMIN_COOKIE_NAME,
    verify_password,
    issue_admin_jwt,
    get_admin_session,
    set_admin_cookie,
    clear_admin_cookie,
)


router = APIRouter(tags=["auth"])


@router.post("/api/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if not user or user.disabled_at:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        from fastapi import HTTPException
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
    jwt_token = issue_admin_jwt(session, user)
    set_admin_cookie(response, session_token, request)
    return LoginResponse(
        status="ok",
        token=jwt_token,
        admin_user_id=user.id,
        username=user.username,
        expires_at=expires_at,
    )


@router.post("/api/logout", response_model=LoginResponse)
def logout(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> LoginResponse:
    session = get_admin_session(request, db)
    if session:
        db.delete(session)
        db.commit()
    clear_admin_cookie(response)
    return LoginResponse(status="ok")


@router.get("/api/admin/token", response_model=LoginResponse)
def admin_token(
    request: Request, db: Session = Depends(get_db)
) -> LoginResponse:
    session = get_admin_session(request, db)
    if not session:
        return LoginResponse(status="anonymous")
    user = db.query(AdminUser).filter(AdminUser.id == session.admin_user_id).first()
    if not user:
        return LoginResponse(status="anonymous")
    jwt_token = issue_admin_jwt(session, user)
    return LoginResponse(
        status="ok",
        token=jwt_token,
        admin_user_id=user.id,
        username=user.username,
        expires_at=session.expires_at,
    )


@router.get("/logout")
def logout_page(request: Request, db: Session = Depends(get_db)) -> RedirectResponse:
    session = get_admin_session(request, db)
    if session:
        db.delete(session)
        db.commit()
    response = RedirectResponse(url="/login", status_code=302)
    clear_admin_cookie(response)
    return response
