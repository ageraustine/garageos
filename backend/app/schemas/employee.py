from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List
from app.models.employee import EmployeeRole, DocumentType


class EmployeeCreate(BaseModel):
    """Create a new employee in the chain."""

    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")
    role: EmployeeRole
    branch_id: Optional[int] = None  # None for HQ role
    email: Optional[str] = Field(None, max_length=255)
    id_number: Optional[str] = Field(None, max_length=50)


class EmployeeUpdate(BaseModel):
    """Update employee details."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[EmployeeRole] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None
    email: Optional[str] = Field(None, max_length=255)
    id_number: Optional[str] = Field(None, max_length=50)


class EmployeeResponse(BaseModel):
    """Employee info for API responses."""

    id: int
    name: str
    phone: str
    role: str
    branch_id: Optional[int]
    branch_name: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]


class EmployeeListItem(BaseModel):
    """Employee item for list view."""

    id: int
    name: str
    phone: str
    role: str
    role_label: str
    branch_id: Optional[int]
    branch_name: Optional[str]
    email: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: bool
    created_at: datetime


# Document schemas

class DocumentUploadRequest(BaseModel):
    """Request presigned URL for document upload."""

    document_type: DocumentType
    name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(pattern=r"^(image|application)/.+$")
    expires_at: Optional[datetime] = None


class DocumentUploadResponse(BaseModel):
    """Response with presigned upload URL."""

    upload_url: str
    object_key: str
    document_type: DocumentType


class DocumentConfirmRequest(BaseModel):
    """Confirm document upload completed."""

    object_key: str
    document_type: DocumentType
    name: str
    file_size: Optional[int] = None
    expires_at: Optional[datetime] = None


class EmployeeDocumentResponse(BaseModel):
    """Employee document response."""

    id: int
    employee_id: int
    document_type: str
    document_type_label: str
    name: str
    url: str
    view_url: str  # Presigned URL for viewing
    file_size: Optional[int]
    content_type: Optional[str]
    expires_at: Optional[datetime]
    is_verified: bool
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime]
    created_at: datetime


class ProfilePictureUploadRequest(BaseModel):
    """Request presigned URL for profile picture upload."""

    content_type: str = Field(pattern=r"^image/.+$")


class ProfilePictureUploadResponse(BaseModel):
    """Response with presigned upload URL for profile picture."""

    upload_url: str
    object_key: str


class ProfilePictureConfirmRequest(BaseModel):
    """Confirm profile picture upload completed."""

    object_key: str
