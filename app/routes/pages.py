"""Static page routes."""
from pathlib import Path

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_admin_session
from app.utils import login_redirect_path


router = APIRouter(tags=["pages"])
static_dir = Path(__file__).resolve().parent.parent / "static"


@router.get("/", response_class=FileResponse)
def index(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "index.html", media_type="text/html; charset=utf-8")


@router.get("/login", response_class=FileResponse)
def login_page() -> FileResponse:
    return FileResponse(static_dir / "login.html", media_type="text/html; charset=utf-8")


@router.get("/keys", response_class=FileResponse)
def keys_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "keys.html", media_type="text/html; charset=utf-8")


@router.get("/users", response_class=FileResponse)
def users_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "users.html", media_type="text/html; charset=utf-8")


@router.get("/settings", response_class=FileResponse)
def settings_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "settings.html", media_type="text/html; charset=utf-8")


@router.get("/api-docs", response_class=FileResponse)
def api_docs(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "api.html", media_type="text/html; charset=utf-8")


@router.get("/marketing-guide", response_class=FileResponse)
def marketing_guide(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(
        static_dir / "marketing-guide.html", media_type="text/html; charset=utf-8"
    )


@router.get("/marketing", response_class=FileResponse)
def marketing_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "marketing.html", media_type="text/html; charset=utf-8")


@router.get("/chat", response_class=FileResponse)
def chat_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "chat.html", media_type="text/html; charset=utf-8")


@router.get("/sms", response_class=FileResponse)
def sms_page(request: Request, db: Session = Depends(get_db)) -> FileResponse:
    if not get_admin_session(request, db):
        return RedirectResponse(url=login_redirect_path(request))
    return FileResponse(static_dir / "sms.html", media_type="text/html; charset=utf-8")
