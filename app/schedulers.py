"""Background schedulers for email, SMS and marketing campaigns."""
import threading
import time
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal


_sms_scheduler_started = False
_email_scheduler_started = False
_marketing_scheduler_started = False


def _email_scheduler_loop() -> None:
    """Email campaign scheduler background loop."""
    from app.routes.email import dispatch_email_campaign, dispatch_email_followups

    while True:
        try:
            time.sleep(settings.email_scheduler_interval_seconds)
            with SessionLocal() as db:
                from app.models import EmailCampaign
                now = datetime.utcnow()
                # Process scheduled campaigns
                scheduled = (
                    db.query(EmailCampaign)
                    .filter(
                        EmailCampaign.status == "scheduled",
                        EmailCampaign.schedule_at <= now,
                    )
                    .all()
                )
                for campaign in scheduled:
                    campaign.status = "running"
                    campaign.started_at = now
                    db.add(campaign)
                    db.commit()
                    dispatch_email_campaign(db, campaign)
                # Process running campaigns
                running = db.query(EmailCampaign).filter(EmailCampaign.status == "running").all()
                for campaign in running:
                    dispatch_email_campaign(db, campaign)
                # Process followups
                dispatch_email_followups(db, now)
        except Exception:  # pragma: no cover - scheduler safety
            pass


def _sms_scheduler_loop() -> None:
    """SMS campaign scheduler background loop."""
    from app.routes.sms import dispatch_sms_campaign

    while True:
        try:
            time.sleep(settings.sms_scheduler_interval_seconds)
            with SessionLocal() as db:
                from app.models import SmsCampaign
                now = datetime.utcnow()
                scheduled = (
                    db.query(SmsCampaign)
                    .filter(
                        SmsCampaign.status == "scheduled",
                        SmsCampaign.schedule_at <= now,
                    )
                    .all()
                )
                for campaign in scheduled:
                    campaign.status = "running"
                    campaign.started_at = now
                    db.add(campaign)
                    db.commit()
                    dispatch_sms_campaign(db, campaign)
                running = db.query(SmsCampaign).filter(SmsCampaign.status == "running").all()
                for campaign in running:
                    dispatch_sms_campaign(db, campaign)
        except Exception:  # pragma: no cover - scheduler safety
            pass


def _marketing_scheduler_loop() -> None:
    """Marketing campaign scheduler background loop."""
    from app.routes.marketing import dispatch_marketing_campaign

    while True:
        try:
            time.sleep(settings.marketing_scheduler_interval_seconds)
            with SessionLocal() as db:
                from app.models import MarketingCampaign
                now = datetime.utcnow()
                scheduled = (
                    db.query(MarketingCampaign)
                    .filter(
                        MarketingCampaign.status == "SCHEDULED",
                        MarketingCampaign.schedule_time <= now,
                    )
                    .all()
                )
                for campaign in scheduled:
                    campaign.status = "RUNNING"
                    campaign.started_at = now
                    db.add(campaign)
                    db.commit()
                    dispatch_marketing_campaign(db, campaign, now)
                running = db.query(MarketingCampaign).filter(
                    MarketingCampaign.status == "RUNNING"
                ).all()
                for campaign in running:
                    dispatch_marketing_campaign(db, campaign, now)
        except Exception:  # pragma: no cover - scheduler safety
            pass


def start_sms_scheduler() -> None:
    """Start the SMS campaign scheduler thread."""
    global _sms_scheduler_started
    if _sms_scheduler_started:
        return
    if not settings.sms_scheduler_enabled:
        return
    _sms_scheduler_started = True
    thread = threading.Thread(target=_sms_scheduler_loop, daemon=True)
    thread.start()


def start_email_scheduler() -> None:
    """Start the email campaign scheduler thread."""
    global _email_scheduler_started
    if _email_scheduler_started:
        return
    if not settings.email_scheduler_enabled:
        return
    _email_scheduler_started = True
    thread = threading.Thread(target=_email_scheduler_loop, daemon=True)
    thread.start()


def start_marketing_scheduler() -> None:
    """Start the marketing campaign scheduler thread."""
    global _marketing_scheduler_started
    if _marketing_scheduler_started:
        return
    if not settings.marketing_scheduler_enabled:
        return
    _marketing_scheduler_started = True
    thread = threading.Thread(target=_marketing_scheduler_loop, daemon=True)
    thread.start()
