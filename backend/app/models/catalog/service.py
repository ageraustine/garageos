"""Service and ServiceStage models - configurable per chain."""

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List


class ServiceStage(SQLModel, table=True):
    """
    A stage within a service (e.g., Priming -> Painting -> Buffing).
    Ordered by `order` field.
    """

    __tablename__ = "service_stages"

    id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="services.id", index=True)
    name: str = Field(max_length=100)
    order: int = Field(default=0)  # Sort order within service
    created_at: datetime = Field(default_factory=datetime.utcnow)

    service: Optional["Service"] = Relationship(back_populates="stages")


class ServiceQuotationItem(SQLModel, table=True):
    """
    Predefined pricing items for a service.
    Used to quickly build estimates with standard prices.
    """

    __tablename__ = "service_quotation_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    service_id: int = Field(foreign_key="services.id", index=True)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    price: float = Field(ge=0)
    is_labor: bool = Field(default=False)  # Labor vs parts
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    service: Optional["Service"] = Relationship(back_populates="quotation_items")


class Service(SQLModel, table=True):
    """
    A service offered by a chain (e.g., Painting, Mechanical Repair).
    Each chain can customize their service menu.
    """

    __tablename__ = "services"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    stages: List[ServiceStage] = Relationship(back_populates="service")
    quotation_items: List["ServiceQuotationItem"] = Relationship(back_populates="service")


class JobService(SQLModel, table=True):
    """
    Links a job to selected services.
    Tracks which stage the service is currently at.
    """

    __tablename__ = "job_services"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    service_id: int = Field(foreign_key="services.id", index=True)
    current_stage_id: Optional[int] = Field(
        default=None, foreign_key="service_stages.id"
    )
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    stage_completions: List["JobStageCompletion"] = Relationship(
        back_populates="job_service"
    )


class JobStageCompletion(SQLModel, table=True):
    """
    Tracks individual stage completions for a job service.
    Allows checkbox-style stage tracking instead of linear progression.
    """

    __tablename__ = "job_stage_completions"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_service_id: int = Field(foreign_key="job_services.id", index=True)
    stage_id: int = Field(foreign_key="service_stages.id")
    completed_at: datetime = Field(default_factory=datetime.utcnow)
    completed_by_id: Optional[int] = Field(default=None, foreign_key="employees.id")

    job_service: Optional[JobService] = Relationship(back_populates="stage_completions")
