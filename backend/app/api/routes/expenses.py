"""Expense management routes."""

from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from app.database import get_db
from app.api.deps import get_current_user, get_storage_service
from app.services.expense_service import ExpenseService
from app.services.storage_service import StorageService
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseAnalytics,
    ReceiptUploadResponse,
)
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new expense. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can create expenses",
        )

    service = ExpenseService(db)
    return service.create(
        chain_id=current_user.chain_id,
        data=data,
        created_by_id=current_user.id,
    )


@router.get("/", response_model=List[ExpenseResponse])
async def list_expenses(
    branch_id: Optional[int] = Query(default=None),
    category: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List expenses with filters. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can view expenses",
        )

    # Managers can only see their branch
    if current_user.role == "manager" and branch_id is None:
        branch_id = current_user.branch_id

    service = ExpenseService(db)
    return service.list(
        chain_id=current_user.chain_id,
        branch_id=branch_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/analytics", response_model=ExpenseAnalytics)
async def get_expense_analytics(
    start_date: date = Query(...),
    end_date: date = Query(...),
    branch_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get expense analytics. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can view expense analytics",
        )

    # Managers can only see their branch
    if current_user.role == "manager":
        branch_id = current_user.branch_id

    service = ExpenseService(db)
    return service.get_analytics(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=branch_id,
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get expense by ID. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can view expenses",
        )

    service = ExpenseService(db)
    try:
        return service.get_by_id(expense_id, current_user.chain_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update expense. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can update expenses",
        )

    service = ExpenseService(db)
    try:
        return service.update(expense_id, current_user.chain_id, data)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete expense. HQ only."""
    if current_user.role != "hq":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ can delete expenses",
        )

    service = ExpenseService(db)
    try:
        service.delete(expense_id, current_user.chain_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/{expense_id}/receipt/upload-url", response_model=ReceiptUploadResponse)
async def get_receipt_upload_url(
    expense_id: int,
    content_type: str = Query(default="image/jpeg"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Get presigned URL for receipt upload. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can upload receipts",
        )

    # Verify expense exists
    service = ExpenseService(db)
    try:
        service.get_by_id(expense_id, current_user.chain_id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    url, object_key = storage.generate_expense_receipt_url(
        chain_id=current_user.chain_id,
        expense_id=expense_id,
        content_type=content_type,
    )

    return ReceiptUploadResponse(upload_url=url, object_key=object_key)


@router.post("/{expense_id}/receipt", response_model=ExpenseResponse)
async def confirm_receipt_upload(
    expense_id: int,
    object_key: str = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Confirm receipt upload and set URL. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can upload receipts",
        )

    service = ExpenseService(db)
    try:
        receipt_url = storage.get_object_url(object_key)
        return service.set_receipt_url(expense_id, current_user.chain_id, receipt_url)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
