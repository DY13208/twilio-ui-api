"""Customer management routes."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ApiKey, Customer, CustomerGroup, CustomerGroupMember
from app.schemas import (
    CustomerCreate,
    CustomerItem,
    CustomerListResponse,
    CustomerTagItem,
    CustomerTagListResponse,
    CustomerTagRenameRequest,
    CustomerTagMutationResponse,
    CustomerUpdate,
    CustomerGroupCreate,
    CustomerGroupItem,
    CustomerGroupListResponse,
    CustomerGroupMembersRequest,
    CustomerGroupMembersResponse,
    CustomerGroupUpdate,
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


def _customer_group_to_item(group: CustomerGroup, member_count: int = 0) -> CustomerGroupItem:
    return CustomerGroupItem(
        id=group.id,
        name=group.name,
        description=group.description,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.get("/api/customers", response_model=CustomerListResponse)
def list_customers(
    customer_id: Optional[int] = Query(None, alias="id"),
    search: Optional[str] = None,
    tag: Optional[str] = None,
    has_marketed: Optional[bool] = None,
    country: Optional[str] = None,
    country_code: Optional[str] = None,
    group_id: Optional[int] = None,
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
    if group_id is not None:
        query = query.join(
            CustomerGroupMember, CustomerGroupMember.customer_id == Customer.id
        ).filter(CustomerGroupMember.group_id == group_id)

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


@router.get("/api/customers/tags", response_model=CustomerTagListResponse)
def list_customer_tags(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CustomerTagListResponse:
    counts = {}
    for customer in db.query(Customer).all():
        for tag in deserialize_tags(customer.tags):
            cleaned = tag.strip()
            if not cleaned:
                continue
            counts[cleaned] = counts.get(cleaned, 0) + 1
    items = [CustomerTagItem(tag=tag, count=count) for tag, count in counts.items()]
    items.sort(key=lambda item: (-item.count, item.tag.lower()))
    return CustomerTagListResponse(tags=items)


@router.post("/api/customers/tags/rename", response_model=CustomerTagMutationResponse)
def rename_customer_tag(
    payload: CustomerTagRenameRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerTagMutationResponse:
    from_tag = payload.from_tag.strip()
    to_tag = payload.to_tag.strip()
    if not from_tag or not to_tag:
        raise HTTPException(status_code=400, detail="from_tag and to_tag are required")
    if from_tag.lower() == to_tag.lower():
        return CustomerTagMutationResponse(status="ok", updated=0)
    now = datetime.utcnow()
    updated = 0
    for customer in db.query(Customer).all():
        tags = deserialize_tags(customer.tags)
        if not tags:
            continue
        new_tags = [to_tag if t.lower() == from_tag.lower() else t for t in tags]
        if new_tags == tags:
            continue
        customer.tags = serialize_tags(new_tags)
        customer.updated_at = now
        db.add(customer)
        updated += 1
    db.commit()
    return CustomerTagMutationResponse(status="ok", updated=updated)


@router.delete("/api/customers/tags/{tag}", response_model=CustomerTagMutationResponse)
def delete_customer_tag(
    tag: str,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerTagMutationResponse:
    tag_value = tag.strip()
    if not tag_value:
        raise HTTPException(status_code=400, detail="tag is required")
    now = datetime.utcnow()
    updated = 0
    for customer in db.query(Customer).all():
        tags = deserialize_tags(customer.tags)
        if not tags:
            continue
        new_tags = [t for t in tags if t.lower() != tag_value.lower()]
        if new_tags == tags:
            continue
        customer.tags = serialize_tags(new_tags)
        customer.updated_at = now
        db.add(customer)
        updated += 1
    db.commit()
    return CustomerTagMutationResponse(status="ok", updated=updated)


@router.get("/api/customers/groups", response_model=CustomerGroupListResponse)
def list_customer_groups(
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CustomerGroupListResponse:
    groups = db.query(CustomerGroup).order_by(CustomerGroup.created_at.desc()).all()
    counts = dict(
        db.query(CustomerGroupMember.group_id, func.count(CustomerGroupMember.id))
        .group_by(CustomerGroupMember.group_id)
        .all()
    )
    return CustomerGroupListResponse(
        groups=[_customer_group_to_item(group, counts.get(group.id, 0)) for group in groups]
    )


@router.post("/api/customers/groups", response_model=CustomerGroupItem)
def create_customer_group(
    payload: CustomerGroupCreate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerGroupItem:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    existing = db.query(CustomerGroup).filter(CustomerGroup.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="group name already exists")
    now = datetime.utcnow()
    group = CustomerGroup(
        name=name,
        description=payload.description,
        created_at=now,
        updated_at=now,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return _customer_group_to_item(group, 0)


@router.patch("/api/customers/groups/{group_id}", response_model=CustomerGroupItem)
def update_customer_group(
    group_id: int,
    payload: CustomerGroupUpdate,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerGroupItem:
    group = db.query(CustomerGroup).filter(CustomerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        existing = db.query(CustomerGroup).filter(CustomerGroup.name == name).first()
        if existing and existing.id != group.id:
            raise HTTPException(status_code=400, detail="group name already exists")
        group.name = name
    if payload.description is not None:
        group.description = payload.description
    group.updated_at = datetime.utcnow()
    db.add(group)
    db.commit()
    count = (
        db.query(func.count(CustomerGroupMember.id))
        .filter(CustomerGroupMember.group_id == group.id)
        .scalar()
        or 0
    )
    return _customer_group_to_item(group, count)


@router.delete("/api/customers/groups/{group_id}", response_model=CustomerGroupItem)
def delete_customer_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerGroupItem:
    group = db.query(CustomerGroup).filter(CustomerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    count = (
        db.query(func.count(CustomerGroupMember.id))
        .filter(CustomerGroupMember.group_id == group.id)
        .scalar()
        or 0
    )
    item = _customer_group_to_item(group, count)
    db.query(CustomerGroupMember).filter(
        CustomerGroupMember.group_id == group.id
    ).delete(synchronize_session=False)
    db.delete(group)
    db.commit()
    return item


@router.get("/api/customers/groups/{group_id}/members", response_model=CustomerGroupMembersResponse)
def list_customer_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("read")),
) -> CustomerGroupMembersResponse:
    group = db.query(CustomerGroup).filter(CustomerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    members = (
        db.query(Customer)
        .join(CustomerGroupMember, CustomerGroupMember.customer_id == Customer.id)
        .filter(CustomerGroupMember.group_id == group_id)
        .order_by(Customer.created_at.desc())
        .all()
    )
    return CustomerGroupMembersResponse(
        group_id=group_id,
        members=[_customer_to_item(member) for member in members],
    )


@router.post("/api/customers/groups/{group_id}/members", response_model=CustomerGroupMembersResponse)
def add_customer_group_members(
    group_id: int,
    payload: CustomerGroupMembersRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerGroupMembersResponse:
    group = db.query(CustomerGroup).filter(CustomerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    customer_ids = [int(v) for v in (payload.customer_ids or []) if isinstance(v, int) or str(v).isdigit()]
    if customer_ids:
        existing_ids = {
            row[0]
            for row in db.query(CustomerGroupMember.customer_id)
            .filter(
                CustomerGroupMember.group_id == group_id,
                CustomerGroupMember.customer_id.in_(customer_ids),
            )
            .all()
        }
        valid_ids = {
            customer.id
            for customer in db.query(Customer).filter(Customer.id.in_(customer_ids)).all()
        }
        now = datetime.utcnow()
        for customer_id in valid_ids:
            if customer_id in existing_ids:
                continue
            db.add(
                CustomerGroupMember(
                    group_id=group_id,
                    customer_id=customer_id,
                    created_at=now,
                )
            )
        db.commit()
    return list_customer_group_members(group_id, db, _)


@router.delete("/api/customers/groups/{group_id}/members", response_model=CustomerGroupMembersResponse)
def remove_customer_group_members(
    group_id: int,
    payload: CustomerGroupMembersRequest,
    db: Session = Depends(get_db),
    _: ApiKey = Depends(require_api_key("manage")),
) -> CustomerGroupMembersResponse:
    group = db.query(CustomerGroup).filter(CustomerGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    customer_ids = [int(v) for v in (payload.customer_ids or []) if isinstance(v, int) or str(v).isdigit()]
    if customer_ids:
        db.query(CustomerGroupMember).filter(
            CustomerGroupMember.group_id == group_id,
            CustomerGroupMember.customer_id.in_(customer_ids),
        ).delete(synchronize_session=False)
        db.commit()
    return list_customer_group_members(group_id, db, _)


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
    db.query(CustomerGroupMember).filter(
        CustomerGroupMember.customer_id == customer_id
    ).delete(synchronize_session=False)
    db.delete(customer)
    db.commit()
    return item
