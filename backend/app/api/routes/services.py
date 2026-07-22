"""Service endpoints - list services for a chain."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.service import (
    ServiceResponse, ServiceStageResponse, ServiceCreate, ServiceUpdate,
    QuotationItemResponse, QuotationItemCreate, QuotationItemUpdate
)
from app.schemas.auth import UserResponse
from app.services.service_service import ServiceService
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/services", tags=["services"])


def build_service_response(svc_service: ServiceService, svc) -> ServiceResponse:
    """Build a ServiceResponse with stages and quotation items."""
    stages = svc_service.get_stages(svc.id)
    quotation_items = svc_service.get_quotation_items(svc.id)

    return ServiceResponse(
        id=svc.id,
        name=svc.name,
        description=svc.description,
        is_active=svc.is_active,
        stages=[
            ServiceStageResponse(id=s.id, name=s.name, order=s.order) for s in stages
        ],
        quotation_items=[
            QuotationItemResponse(
                id=q.id,
                name=q.name,
                description=q.description,
                price=q.price,
                is_labor=q.is_labor,
                is_active=q.is_active,
            )
            for q in quotation_items
        ],
    )


@router.post("/seed-defaults", response_model=List[ServiceResponse])
async def seed_default_services(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Seed default services for chain if none exist."""
    service = ServiceService(db)
    existing = service.list_by_chain(current_user.chain_id)

    if existing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Services already exist for this chain"
        )

    services = service.seed_defaults_for_chain(current_user.chain_id)

    return [build_service_response(service, svc) for svc in services]


@router.post("/seed-templates")
async def seed_default_templates(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Add default template items to existing services that don't have any."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can seed templates",
        )

    service = ServiceService(db)

    # First fix any items with incorrect active status
    fixed = service.fix_quotation_items_active_status(current_user.chain_id)

    # Then seed new items
    items_added = service.seed_default_templates(current_user.chain_id)

    return {
        "message": f"Added {items_added} template items, fixed {fixed} existing items",
        "items_added": items_added,
        "items_fixed": fixed
    }


@router.get("/", response_model=List[ServiceResponse])
async def list_services(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all services for the current user's chain."""
    service = ServiceService(db)
    services = service.list_by_chain(current_user.chain_id)
    return [build_service_response(service, svc) for svc in services]


@router.get("/{id}", response_model=ServiceResponse)
async def get_service(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a single service with its stages and quotation items."""
    svc_service = ServiceService(db)

    try:
        svc = svc_service.get_by_id(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    if svc.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")

    return build_service_response(svc_service, svc)


@router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new service for the chain."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can create services",
        )

    svc_service = ServiceService(db)
    svc = svc_service.create(current_user.chain_id, data)
    return build_service_response(svc_service, svc)


@router.patch("/{id}", response_model=ServiceResponse)
async def update_service(
    id: int,
    data: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a service."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can update services",
        )

    svc_service = ServiceService(db)

    try:
        svc = svc_service.get_by_id(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    if svc.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")

    svc = svc_service.update(id, data)
    return build_service_response(svc_service, svc)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a service (soft delete)."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can delete services",
        )

    svc_service = ServiceService(db)

    try:
        svc = svc_service.get_by_id(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    if svc.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")

    svc_service.delete(id)
    return None


# Quotation Item CRUD
@router.post("/{id}/quotation-items", response_model=QuotationItemResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation_item(
    id: int,
    data: QuotationItemCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Add a quotation item to a service."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can manage quotation items",
        )

    svc_service = ServiceService(db)

    try:
        svc = svc_service.get_by_id(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    if svc.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")

    item = svc_service.create_quotation_item(id, data)
    return QuotationItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        price=item.price,
        is_labor=item.is_labor,
        is_active=item.is_active,
    )


@router.patch("/quotation-items/{item_id}", response_model=QuotationItemResponse)
async def update_quotation_item(
    item_id: int,
    data: QuotationItemUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update a quotation item."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can manage quotation items",
        )

    svc_service = ServiceService(db)

    try:
        item = svc_service.get_quotation_item(item_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    # Verify chain ownership via service
    svc = svc_service.get_by_id(item.service_id)
    if svc.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")

    item = svc_service.update_quotation_item(item_id, data)
    return QuotationItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        price=item.price,
        is_labor=item.is_labor,
        is_active=item.is_active,
    )


@router.delete("/quotation-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a quotation item (soft delete)."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can manage quotation items",
        )

    svc_service = ServiceService(db)

    try:
        item = svc_service.get_quotation_item(item_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    # Verify chain ownership via service
    svc = svc_service.get_by_id(item.service_id)
    if svc.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")

    svc_service.delete_quotation_item(item_id)
    return None
