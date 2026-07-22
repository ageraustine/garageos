"""
Customer CRM endpoints.
List, search, view profiles with full history.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from typing import Optional, List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.employee import Employee
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListItem,
    CustomerDetail,
    CustomerNoteCreate,
    CustomerNoteResponse,
)
from app.services.customer_service import CustomerService
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=List[CustomerListItem])
async def list_customers(
    search: Optional[str] = Query(None, description="Search by name, phone, or plate"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    List customers with search and stats.
    Search matches name, phone, or associated vehicle plate.
    """
    service = CustomerService(db)
    return service.list(
        chain_id=current_user.chain_id,
        search=search,
        tag=tag,
        limit=limit,
        offset=offset,
    )


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Create a new customer."""
    service = CustomerService(db)
    try:
        return service.create(data, chain_id=current_user.chain_id)
    except ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=e.message)


@router.get("/{id}", response_model=CustomerDetail)
async def get_customer_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get full customer detail with vehicles, jobs, and notes.
    """
    service = CustomerService(db)
    try:
        customer = service.get_detail(id)
        # Verify customer belongs to user's chain
        raw_customer = service.get_by_id(id)
        if raw_customer.chain_id != current_user.chain_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return customer
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch("/{id}", response_model=CustomerResponse)
async def update_customer(
    id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update customer."""
    service = CustomerService(db)
    try:
        # Verify customer belongs to user's chain
        customer = service.get_by_id(id)
        if customer.chain_id != current_user.chain_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return service.update(id, data)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


# Notes endpoints
@router.post("/{id}/notes", response_model=CustomerNoteResponse, status_code=status.HTTP_201_CREATED)
async def add_customer_note(
    id: int,
    data: CustomerNoteCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Add a note to a customer."""
    service = CustomerService(db)
    try:
        # Verify customer belongs to user's chain
        customer = service.get_by_id(id)
        if customer.chain_id != current_user.chain_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return service.create_note(id, data, created_by_id=current_user.id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch("/notes/{note_id}", response_model=CustomerNoteResponse)
async def update_note(
    note_id: int,
    is_pinned: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Update a note (toggle pinned status)."""
    service = CustomerService(db)
    try:
        return service.update_note(note_id, is_pinned)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Delete a note."""
    service = CustomerService(db)
    try:
        service.delete_note(note_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


# Lookup by phone (for job creation)
@router.get("/lookup/phone/{phone}", response_model=Optional[CustomerResponse])
async def lookup_by_phone(
    phone: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Lookup customer by phone number. Returns null if not found."""
    service = CustomerService(db)
    customer = service.get_by_phone(phone, chain_id=current_user.chain_id)
    return customer
