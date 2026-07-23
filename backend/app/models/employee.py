from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class EmployeeRole(str, Enum):
    """Staff roles within a garage chain."""

    ADVISOR = "advisor"  # Service advisor at branch
    MECHANIC = "mechanic"  # Technician at branch
    MANAGER = "manager"  # Branch manager
    HQ = "hq"  # Chain owner/admin (headquarters)


class DocumentType(str, Enum):
    """Types of employee documents."""

    NATIONAL_ID = "national_id"
    PASSPORT = "passport"
    POLICE_CLEARANCE = "police_clearance"
    DRIVING_LICENSE = "driving_license"
    CERTIFICATE = "certificate"
    OTHER = "other"


class Employee(SQLModel, table=True):
    """
    Staff member who can log into the system.

    For auth: phone (unique identifier) + pin_hash (bcrypt).
    HQ role users may have branch_id=None (they oversee all branches).
    """

    __tablename__ = "employees"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)
    branch_id: Optional[int] = Field(
        default=None,
        foreign_key="branches.id",
        index=True,
        description="Null for HQ users who oversee all branches",
    )
    role: EmployeeRole = Field(index=True)
    name: str = Field(max_length=100)
    phone: str = Field(
        unique=True,
        index=True,
        description="Phone number for login (E.164 format preferred)",
    )
    pin_hash: str = Field(description="bcrypt hash of 4-6 digit PIN")
    email: Optional[str] = Field(default=None, max_length=255)
    id_number: Optional[str] = Field(
        default=None,
        max_length=50,
        description="National ID or passport number",
    )
    profile_picture_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="URL to profile picture in storage",
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)


class EmployeeDocument(SQLModel, table=True):
    """
    Documents uploaded for employees (ID, police clearance, etc).
    Uses presigned URLs for secure upload/download via MinIO.
    """

    __tablename__ = "employee_documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    document_type: DocumentType = Field(index=True)
    name: str = Field(max_length=255, description="Display name for the document")
    url: str = Field(max_length=500, description="S3/MinIO object URL")
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    content_type: Optional[str] = Field(default=None, max_length=100)
    uploaded_by_id: int = Field(foreign_key="employees.id")
    expires_at: Optional[datetime] = Field(
        default=None, description="Document expiry date (e.g., for police clearance)"
    )
    is_verified: bool = Field(default=False, description="Verified by manager/HQ")
    verified_by_id: Optional[int] = Field(default=None, foreign_key="employees.id")
    verified_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
