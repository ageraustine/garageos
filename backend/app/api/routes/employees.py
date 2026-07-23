from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user, get_storage_service
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListItem,
    DocumentUploadRequest, DocumentUploadResponse, DocumentConfirmRequest,
    EmployeeDocumentResponse, ProfilePictureUploadRequest, ProfilePictureUploadResponse,
    ProfilePictureConfirmRequest,
)
from app.schemas.auth import UserResponse
from app.models.employee import Employee, EmployeeRole, EmployeeDocument, DocumentType
from app.models.branch import Branch
from app.core.security import hash_pin
from app.services.storage_service import StorageService

router = APIRouter(prefix="/employees", tags=["employees"])

DOCUMENT_TYPE_LABELS = {
    "national_id": "National ID",
    "passport": "Passport",
    "police_clearance": "Police Clearance",
    "driving_license": "Driving License",
    "certificate": "Certificate",
    "other": "Other Document",
}

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
                email=emp.email,
                profile_picture_url=emp.profile_picture_url,
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
        email=data.email,
        id_number=data.id_number,
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
        email=employee.email,
        id_number=employee.id_number,
        profile_picture_url=employee.profile_picture_url,
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
        email=employee.email,
        id_number=employee.id_number,
        profile_picture_url=employee.profile_picture_url,
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
    if data.email is not None:
        employee.email = data.email
    if data.id_number is not None:
        employee.id_number = data.id_number

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
        email=employee.email,
        id_number=employee.id_number,
        profile_picture_url=employee.profile_picture_url,
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


# ============== Profile Picture Routes ==============

@router.post("/{id}/profile-picture/upload-url", response_model=ProfilePictureUploadResponse)
async def request_profile_picture_upload(
    id: int,
    data: ProfilePictureUploadRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Request presigned URL for profile picture upload."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permission denied")

    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    upload_url, object_key = storage.generate_profile_picture_url(
        employee_id=id,
        content_type=data.content_type,
    )

    return ProfilePictureUploadResponse(upload_url=upload_url, object_key=object_key)


@router.post("/{id}/profile-picture", response_model=EmployeeResponse)
async def confirm_profile_picture(
    id: int,
    data: ProfilePictureConfirmRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Confirm profile picture upload and update employee."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permission denied")

    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    # Update profile picture URL
    employee.profile_picture_url = storage.get_object_url(data.object_key)
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
        email=employee.email,
        id_number=employee.id_number,
        profile_picture_url=employee.profile_picture_url,
        is_active=employee.is_active,
        created_at=employee.created_at,
        last_login_at=employee.last_login_at,
    )


# ============== Document Routes ==============

@router.get("/{id}/documents", response_model=List[EmployeeDocumentResponse])
async def list_employee_documents(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """List all documents for an employee."""
    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    documents = db.exec(
        select(EmployeeDocument)
        .where(EmployeeDocument.employee_id == id)
        .order_by(EmployeeDocument.created_at.desc())
    ).all()

    result = []
    for doc in documents:
        # Get verified by name
        verified_by_name = None
        if doc.verified_by_id:
            verifier = db.get(Employee, doc.verified_by_id)
            verified_by_name = verifier.name if verifier else None

        # Generate presigned view URL
        view_url = doc.url
        url_parts = doc.url.split(f"/{storage.bucket}/")
        if len(url_parts) == 2:
            object_key = url_parts[1]
            view_url = storage.generate_presigned_download_url(object_key)

        result.append(
            EmployeeDocumentResponse(
                id=doc.id,
                employee_id=doc.employee_id,
                document_type=doc.document_type.value,
                document_type_label=DOCUMENT_TYPE_LABELS.get(doc.document_type.value, doc.document_type.value),
                name=doc.name,
                url=doc.url,
                view_url=view_url,
                file_size=doc.file_size,
                content_type=doc.content_type,
                expires_at=doc.expires_at,
                is_verified=doc.is_verified,
                verified_by_name=verified_by_name,
                verified_at=doc.verified_at,
                created_at=doc.created_at,
            )
        )

    return result


@router.post("/{id}/documents/upload-url", response_model=DocumentUploadResponse)
async def request_document_upload(
    id: int,
    data: DocumentUploadRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Request presigned URL for document upload."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permission denied")

    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    upload_url, object_key = storage.generate_employee_upload_url(
        employee_id=id,
        doc_type=data.document_type.value,
        content_type=data.content_type,
    )

    return DocumentUploadResponse(
        upload_url=upload_url,
        object_key=object_key,
        document_type=data.document_type,
    )


@router.post("/{id}/documents", response_model=EmployeeDocumentResponse)
async def confirm_document_upload(
    id: int,
    data: DocumentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Confirm document upload and create record."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permission denied")

    employee = db.get(Employee, id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    url = storage.get_object_url(data.object_key)

    # Determine content type from object key
    content_type = None
    if data.object_key.endswith(".pdf"):
        content_type = "application/pdf"
    elif data.object_key.endswith(".jpg") or data.object_key.endswith(".jpeg"):
        content_type = "image/jpeg"
    elif data.object_key.endswith(".png"):
        content_type = "image/png"

    document = EmployeeDocument(
        employee_id=id,
        document_type=DocumentType(data.document_type),
        name=data.name,
        url=url,
        file_size=data.file_size,
        content_type=content_type,
        uploaded_by_id=current_user.id,
        expires_at=data.expires_at,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Generate presigned view URL
    view_url = storage.generate_presigned_download_url(data.object_key)

    return EmployeeDocumentResponse(
        id=document.id,
        employee_id=document.employee_id,
        document_type=document.document_type.value,
        document_type_label=DOCUMENT_TYPE_LABELS.get(document.document_type.value, document.document_type.value),
        name=document.name,
        url=document.url,
        view_url=view_url,
        file_size=document.file_size,
        content_type=document.content_type,
        expires_at=document.expires_at,
        is_verified=document.is_verified,
        verified_by_name=None,
        verified_at=document.verified_at,
        created_at=document.created_at,
    )


@router.post("/{employee_id}/documents/{doc_id}/verify", response_model=EmployeeDocumentResponse)
async def verify_document(
    employee_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """Mark a document as verified. Only HQ/managers can verify."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permission denied")

    employee = db.get(Employee, employee_id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    document = db.get(EmployeeDocument, doc_id)
    if not document or document.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Document not found")

    from datetime import datetime
    document.is_verified = True
    document.verified_by_id = current_user.id
    document.verified_at = datetime.utcnow()
    db.add(document)
    db.commit()
    db.refresh(document)

    # Get verifier name
    verifier = db.get(Employee, document.verified_by_id)
    verified_by_name = verifier.name if verifier else None

    # Generate presigned view URL
    view_url = document.url
    url_parts = document.url.split(f"/{storage.bucket}/")
    if len(url_parts) == 2:
        object_key = url_parts[1]
        view_url = storage.generate_presigned_download_url(object_key)

    return EmployeeDocumentResponse(
        id=document.id,
        employee_id=document.employee_id,
        document_type=document.document_type.value,
        document_type_label=DOCUMENT_TYPE_LABELS.get(document.document_type.value, document.document_type.value),
        name=document.name,
        url=document.url,
        view_url=view_url,
        file_size=document.file_size,
        content_type=document.content_type,
        expires_at=document.expires_at,
        is_verified=document.is_verified,
        verified_by_name=verified_by_name,
        verified_at=document.verified_at,
        created_at=document.created_at,
    )


@router.delete("/{employee_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    employee_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a document. Only HQ/managers can delete."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Permission denied")

    employee = db.get(Employee, employee_id)
    if not employee or employee.chain_id != current_user.chain_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Employee not found")

    document = db.get(EmployeeDocument, doc_id)
    if not document or document.employee_id != employee_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Document not found")

    db.delete(document)
    db.commit()
    return None
