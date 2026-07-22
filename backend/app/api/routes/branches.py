"""Branch management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse
from app.models.branch import Branch
from app.models.employee import Employee

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", response_model=List[BranchResponse])
async def list_branches(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List all branches for current chain."""
    # Get branches
    branches = db.exec(
        select(Branch).where(Branch.chain_id == current_user.chain_id)
    ).all()

    # Get employee counts
    result = []
    for branch in branches:
        emp_count = db.exec(
            select(func.count(Employee.id)).where(
                Employee.branch_id == branch.id,
                Employee.is_active == True,
            )
        ).one()

        result.append(
            BranchResponse(
                id=branch.id,
                name=branch.name,
                bays=branch.bays,
                geo_lat=branch.geo_lat,
                geo_lng=branch.geo_lng,
                employee_count=emp_count,
                created_at=branch.created_at,
            )
        )

    return result


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new branch (HQ/Manager only)."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can create branches",
        )

    branch = Branch(
        chain_id=current_user.chain_id,
        name=data.name,
        bays=data.bays,
        geo_lat=data.geo_lat,
        geo_lng=data.geo_lng,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)

    return BranchResponse(
        id=branch.id,
        name=branch.name,
        bays=branch.bays,
        geo_lat=branch.geo_lat,
        geo_lng=branch.geo_lng,
        employee_count=0,
        created_at=branch.created_at,
    )


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get branch details."""
    branch = db.get(Branch, branch_id)
    if not branch or branch.chain_id != current_user.chain_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    emp_count = db.exec(
        select(func.count(Employee.id)).where(
            Employee.branch_id == branch.id,
            Employee.is_active == True,
        )
    ).one()

    return BranchResponse(
        id=branch.id,
        name=branch.name,
        bays=branch.bays,
        geo_lat=branch.geo_lat,
        geo_lng=branch.geo_lng,
        employee_count=emp_count,
        created_at=branch.created_at,
    )


@router.patch("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update branch (HQ/Manager only)."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can update branches",
        )

    branch = db.get(Branch, branch_id)
    if not branch or branch.chain_id != current_user.chain_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    if data.name is not None:
        branch.name = data.name
    if data.bays is not None:
        branch.bays = data.bays
    if data.geo_lat is not None:
        branch.geo_lat = data.geo_lat
    if data.geo_lng is not None:
        branch.geo_lng = data.geo_lng

    db.add(branch)
    db.commit()
    db.refresh(branch)

    emp_count = db.exec(
        select(func.count(Employee.id)).where(
            Employee.branch_id == branch.id,
            Employee.is_active == True,
        )
    ).one()

    return BranchResponse(
        id=branch.id,
        name=branch.name,
        bays=branch.bays,
        geo_lat=branch.geo_lat,
        geo_lng=branch.geo_lng,
        employee_count=emp_count,
        created_at=branch.created_at,
    )


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete branch (HQ only). Cannot delete if employees are assigned."""
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can delete branches",
        )

    branch = db.get(Branch, branch_id)
    if not branch or branch.chain_id != current_user.chain_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    # Check if employees are assigned
    emp_count = db.exec(
        select(func.count(Employee.id)).where(Employee.branch_id == branch_id)
    ).one()

    if emp_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete branch with {emp_count} employees assigned. Reassign or remove employees first.",
        )

    db.delete(branch)
    db.commit()
