"""Routes package initialization."""
from fastapi import APIRouter

from .pages import router as pages_router
from .auth import router as auth_router
from .admin import router as admin_router
from .email import router as email_router
from .whatsapp import router as whatsapp_router
from .sms import router as sms_router
from .marketing import router as marketing_router
from .customers import router as customers_router
from .templates import router as templates_router
from .webhooks import router as webhooks_router
from .messages import router as messages_router


def register_routes(app):
    """Register all route modules with the FastAPI app."""
    app.include_router(pages_router)
    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(email_router)
    app.include_router(whatsapp_router)
    app.include_router(sms_router)
    app.include_router(marketing_router)
    app.include_router(customers_router)
    app.include_router(templates_router)
    app.include_router(webhooks_router)
    app.include_router(messages_router)
