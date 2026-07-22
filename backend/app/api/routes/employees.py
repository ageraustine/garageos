from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListItem
from app.schemas.auth import UserResponse
from app.models.employee import Employee, EmployeeRole
from app.models.branch import Branch
from app.core.security import hash_pin

router = APIRouter(prefix="/employees", tags=["employees"])

ROLE_LABELS = {
    "advisor": "Service Advisor",
    "mechanic": "Mechanic",
    "manager": "Branch Manager",
    "hq": "Headquarters",
}


@router.get("/", response_model=List[EmployeeListItem])
async def list_employees(
    role: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List employees for current user's chain."""
    query = select(Employee).where(Employee.chain_id == current_user.chain_id)

    if role:
        query = query.where(Employee.role == role)

    if branch_id:
        query = query.where(Employee.branch_id == branch_id)

    if not include_inactive:
        query = query.where(Employee.is_active == True)

    query = query.order_by(Employee.name)
    employees = db.exec(query).all()

    result = []
    for emp in employees:
        branch_name = None
        if emp.branch_id:
            branch = db.get(Branch, emp.branch_id)
            branch_name = branch.name if branch else None

        result.append(
            EmployeeListItem(
                id=emp.id,
                name=emp.name,
                phone=emp.phone,
                role=emp.role.value,
                role_label=ROLE_LABELS.get(emp.role.value, emp.role.value),
                branch_id=emp.branch_id,
                branch_name=branch_name,
                is_active=emp.is_active,
                created_at=emp.created_at,
            )
        )

    return result


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new employee in the chain. Only HQ or managers can do this."""
    # Check permission
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can create employees",
        )

    # Check phone uniqueness
    existing = db.exec(
        select(Employee).where(Employee.phone == data.phone)
    ).first()
    if existing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    # Validate branch
    branch_name = None
    if data.branch_id:
        branch = db.get(Branch, data.branch_id)
        if not branch or branch.chain_id != current_user.chain_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Invalid branch",
            )
        branch_name = branch.name
    elif data.role != EmployeeRole.HQ:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Non-HQ employees must be assigned to a branch",
        )

    employee = Employee(
        chain_id=current_user.chain_id,
        branch_id=data.branch_id,
        role=data.role,
        name=data.name,
        phone=data.phone,
        pin_hash=hash_pin(data.pin),
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    return EmployeeResponse(
        id=employee.id,
        name=employee.name,
        phone=employee.phone,
        role=employee.role.value,
        branch_id=employee.branch_id,
        branch_name=branch_name,
        is_active=employee.is_active,
        created_at=employee.created_at,
        last_login_at=employee.last_login_at,
    )


@router.get("/{id}", response_model=EmployeeResponse)
async def get_employee(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get employee by ID."""
    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    branch_name = None
    if employee.branch_id:
        branch = db.get(Branch, employee.branch_id)
        branch_name = branch.name if branch else None

    return EmployeeResponse(
        id=employee.id,
        name=employee.name,
        phone=employee.phone,
        role=employee.role.value,
        branch_id=employee.branch_id,
        branch_name=branch_name,
        is_active=employee.is_active,
        created_at=employee.created_at,
        last_login_at=employee.last_login_at,
    )


@router.patch("/{id}", response_model=EmployeeResponse)
async def update_employee(
    id: int,
    data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update employee. Only HQ or managers can do this."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can update employees",
        )

    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Can't modify yourself
    if employee.id == current_user.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own account here",
        )

    # Update fields
    if data.name is not None:
        employee.name = data.name
    if data.role is not None:
        employee.role = data.role
    if data.branch_id is not None:
        branch = db.get(Branch, data.branch_id)
        if not branch or branch.chain_id != current_user.chain_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Invalid branch",
            )
        employee.branch_id = data.branch_id
    if data.is_active is not None:
        employee.is_active = data.is_active

    db.add(employee)
    db.commit()
    db.refresh(employee)

    branch_name = None
    if employee.branch_id:
        branch = db.get(Branch, employee.branch_id)
        branch_name = branch.name if branch else None

    return EmployeeResponse(
        id=employee.id,
        name=employee.name,
        phone=employee.phone,
        role=employee.role.value,
        branch_id=employee.branch_id,
        branch_name=branch_name,
        is_active=employee.is_active,
        created_at=employee.created_at,
        last_login_at=employee.last_login_at,
    )


@router.get("/branches/list", response_model=List[dict])
async def list_branches(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List branches for current chain (for dropdown)."""
    branches = db.exec(
        select(Branch).where(Branch.chain_id == current_user.chain_id)
    ).all()
    return [{"id": b.id, "name": b.name} for b in branches]
