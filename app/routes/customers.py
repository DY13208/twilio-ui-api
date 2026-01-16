"""Customer management routes."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ApiKey, Customer
from app.schemas import (
    CustomerCreate,
    CustomerItem,
    CustomerListResponse,
    CustomerUpdate,
)
from app.dependencies import require_api_key
from app.utils import (
    serialize_tags,
    deserialize_tags,
    normalize_customer_email,
    normalize_customer_whatsapp,
    normalize_customer_mobile,
    require_customer_contact,
)


router = APIRouter(tags=["customers"])


def _customer_to_item(customer: Customer) -> CustomerItem:
    return CustomerItem(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        whatsapp=customer.whatsapp,
        mobile=customer.mobile,
        country=customer.country,
        country_code=customer.country_code,
        tags=deserialize_tags(customer.tags),
        has_marketed=bool(customer.has_marketed),
        last_campaign_id=customer.last_campaign_id,
        last_marketed_at=customer.last_marketed_at,
        email_sent_count=customer.email_sent_count or 0,
        whatsapp_sent_count=customer.whatsapp_sent_count or 0,
        sms_sent_count=customer.sms_sent_count or 0,
        last_email_status=customer.last_email_status,
        last_whatsapp_status=customer.last_whatsapp_status,
        last_sms_status=customer.last_sms_status,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )


@router.get("/api/customers", response_model=CustomerListResponse)
def list_customers(
    customer_id: Optional[int] = Query(None, alias="id"),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    has_marketed: Optional[bool] = None,
    country: Optional[str] = None,
    country_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CustomerListResponse:
    query = db.query(Customer)
    if customer_id is not None:
        query = query.filter(Customer.id == customer_id)
    if search:
        search_value = f"%{search.strip()}%"
        query = query.filter(
            (Customer.name.like(search_value))
            | (Customer.email.like(search_value))
            | (Customer.whatsapp.like(search_value))
            | (Customer.mobile.like(search_value))
        )
    if has_marketed is not None:
        query = query.filter(Customer.has_marketed == has_marketed)
    if country:
        query = query.filter(Customer.country == country.strip())
    if country_code:
        query = query.filter(Customer.country_code == country_code.strip())

    customers = query.order_by(Customer.created_at.desc()).all()

    if tag:
        tag_value = tag.strip().lower()
        if tag_value:
            customers = [
                c for c in customers
                if tag_value in {t.lower() for t in deserialize_tags(c.tags)}
            ]

    total = len(customers)
    paginated = customers[offset:offset + limit]
    return CustomerListResponse(
        customers=[_customer_to_item(c) for c in paginated],
        total=total,
    )


@router.get("/api/customers/{customer_id}", response_model=CustomerItem)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CustomerItem:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="customer not found")
    return _customer_to_item(customer)


@router.post("/api/customers", response_model=CustomerItem)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerItem:
    email = normalize_customer_email(payload.email)
    whatsapp = normalize_customer_whatsapp(payload.whatsapp)
    mobile = normalize_customer_mobile(payload.mobile)
    require_customer_contact(email, whatsapp, mobile)

    now = datetime.utcnow()
    customer = Customer(
        name=payload.name.strip() if payload.name else None,
        email=email,
        whatsapp=whatsapp,
        mobile=mobile,
        country=payload.country.strip() if payload.country else None,
        country_code=payload.country_code.strip() if payload.country_code else None,
        tags=serialize_tags(payload.tags),
        created_at=now,
        updated_at=now,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _customer_to_item(customer)


@router.patch("/api/customers/{customer_id}", response_model=CustomerItem)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerItem:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="customer not found")
    if payload.name is not None:
        customer.name = payload.name.strip() or None
    if payload.email is not None:
        customer.email = normalize_customer_email(payload.email)
    if payload.whatsapp is not None:
        customer.whatsapp = normalize_customer_whatsapp(payload.whatsapp)
    if payload.mobile is not None:
        customer.mobile = normalize_customer_mobile(payload.mobile)
    if payload.country is not None:
        customer.country = payload.country.strip() or None
    if payload.country_code is not None:
        customer.country_code = payload.country_code.strip() or None
    if payload.tags is not None:
        customer.tags = serialize_tags(payload.tags)
    customer.updated_at = datetime.utcnow()
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _customer_to_item(customer)


@router.delete("/api/customers/{customer_id}", response_model=CustomerItem)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerItem:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="customer not found")
    item = _customer_to_item(customer)
    db.delete(customer)
    db.commit()
    return item
