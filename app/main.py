"""Twilio Broadcast Console - Main FastAPI Application.

This is the entry point for the application. All route handlers have been
modularized into separate files under the routes/ directory.
"""
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import settings
from app.db import SessionLocal, engine, get_db
from app.models import AdminUser, Base
from app.dependencies import (
    hash_password,
    get_admin_session,
)
from app.utils import login_redirect_path


app = FastAPI(title="Twilio Broadcast Console")

static_dir = Path(__file__).resolve().parent / "static"

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "time": f"{datetime.utcnow().isoformat()}Z"}

if settings.cors_allow_origins:
    allow_credentials = "*" not in settings.cors_allow_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )


class AuthStaticFiles(StaticFiles):
    """Static files handler that requires admin authentication."""

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await super().__call__(scope, receive, send)
            return
        request = Request(scope, receive=receive)
        db = SessionLocal()
        try:
            session = get_admin_session(request, db)
        finally:
            db.close()
        if not session:
            response = RedirectResponse(url=login_redirect_path(request))
            await response(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


app.mount("/static", AuthStaticFiles(directory=static_dir), name="static")


def _column_names(inspector, table_name: str) -> set:
    return {column["name"] for column in inspector.get_columns(table_name)}


def _ensure_table_columns(conn, inspector, table_name: str, columns: dict) -> None:
    if not inspector.has_table(table_name):
        return
    existing = _column_names(inspector, table_name)
    for column_name, ddl in columns.items():
        if column_name in existing:
            continue
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _ensure_schema() -> None:
    """Ensure database schema is up to date with migrations."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        # Handle admin_sessions table
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

        # Ensure api_keys columns
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

        # Ensure admin_users columns
        _ensure_table_columns(
            conn,
            inspector,
            "admin_users",
            {"disabled_at": "disabled_at DATETIME NULL"},
        )

        # Ensure email_senders columns
        _ensure_table_columns(
            conn,
            inspector,
            "email_senders",
            {"from_name": "from_name VARCHAR(255) NULL"},
        )

        # Ensure broadcast_messages columns
        _ensure_table_columns(
            conn,
            inspector,
            "broadcast_messages",
            {
                "read_at": "read_at DATETIME NULL",
                "direction": "direction VARCHAR(16) NULL",
                "campaign_id": "campaign_id INT NULL",
                "marketing_campaign_id": "marketing_campaign_id INT NULL",
                "campaign_step_id": "campaign_step_id INT NULL",
                "message_template_id": "message_template_id INT NULL",
                "customer_id": "customer_id INT NULL",
                "parent_message_id": "parent_message_id INT NULL",
                "followup_step": "followup_step INT NULL",
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


def _bootstrap_admin_user(db) -> None:
    """Create or update the bootstrap admin user from environment variables."""
    if not settings.admin_username or not settings.admin_password:
        return
    user = db.query(AdminUser).filter(AdminUser.username == settings.admin_username).first()
    password_hash = hash_password(settings.admin_password)
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


# Register all routes at module load time (not in startup event)
from app.routes import register_routes
register_routes(app)


@app.on_event("startup")
def startup() -> None:
    """Application startup: create tables, ensure schema, start schedulers."""
    # Create database tables
    Base.metadata.create_all(bind=engine)
    _ensure_schema()

    # Bootstrap admin user
    with SessionLocal() as db:
        _bootstrap_admin_user(db)

    # Start background schedulers
    from app.schedulers import (
        start_sms_scheduler,
        start_email_scheduler,
        start_marketing_scheduler,
    )
    start_sms_scheduler()
    start_email_scheduler()
    start_marketing_scheduler()
