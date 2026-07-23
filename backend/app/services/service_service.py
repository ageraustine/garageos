"""Service management - CRUD and default seeding."""

from sqlmodel import Session, select, or_
from typing import List, Optional
from app.models.service import Service, ServiceStage, JobService, ServiceQuotationItem
from app.schemas.service import ServiceCreate, ServiceUpdate, StageCreate, QuotationItemCreate, QuotationItemUpdate
from app.core.exceptions import NotFoundError


# Default services with their stages and template items
DEFAULT_SERVICES = [
    {
        "name": "General Service",
        "description": "Routine maintenance and inspection",
        "stages": ["Inspection", "Oil/Filter Change", "Fluid Top-up", "Test Drive"],
        "items": [
            {"name": "Engine Oil (5L)", "price": 4500, "is_labor": False},
            {"name": "Oil Filter", "price": 800, "is_labor": False},
            {"name": "Air Filter", "price": 1200, "is_labor": False},
            {"name": "Service Labor", "price": 2500, "is_labor": True},
            {"name": "Brake Fluid Top-up", "price": 500, "is_labor": False},
            {"name": "Coolant Top-up", "price": 600, "is_labor": False},
        ],
    },
    {
        "name": "Body Work / Panel Beating",
        "description": "Dent removal and body repairs",
        "stages": ["Assessment", "Dent Removal", "Filler/Sanding", "Priming"],
        "items": [
            {"name": "Dent Removal (Minor)", "price": 3000, "is_labor": True},
            {"name": "Dent Removal (Major)", "price": 8000, "is_labor": True},
            {"name": "Panel Replacement", "price": 15000, "is_labor": True},
            {"name": "Body Filler", "price": 1500, "is_labor": False},
            {"name": "Sanding & Prep", "price": 2500, "is_labor": True},
            {"name": "Primer", "price": 1200, "is_labor": False},
        ],
    },
    {
        "name": "Painting",
        "description": "Full or partial vehicle painting",
        "stages": ["Masking", "Priming", "Base Coat", "Clear Coat", "Buffing"],
        "items": [
            {"name": "Single Panel Paint", "price": 8000, "is_labor": True},
            {"name": "Full Body Paint", "price": 85000, "is_labor": True},
            {"name": "Base Coat Paint", "price": 12000, "is_labor": False},
            {"name": "Clear Coat", "price": 8000, "is_labor": False},
            {"name": "Primer Coat", "price": 3500, "is_labor": False},
            {"name": "Color Matching", "price": 2500, "is_labor": True},
            {"name": "Buffing & Polish", "price": 4000, "is_labor": True},
        ],
    },
    {
        "name": "Mechanical Repair",
        "description": "Engine and mechanical component repairs",
        "stages": ["Diagnosis", "Parts Ordering", "Repair", "Testing"],
        "items": [
            {"name": "Diagnostic Fee", "price": 2000, "is_labor": True},
            {"name": "Engine Mount", "price": 4500, "is_labor": False},
            {"name": "Timing Belt Kit", "price": 8500, "is_labor": False},
            {"name": "Water Pump", "price": 5500, "is_labor": False},
            {"name": "Alternator", "price": 12000, "is_labor": False},
            {"name": "Starter Motor", "price": 9500, "is_labor": False},
            {"name": "Labor (per hour)", "price": 1500, "is_labor": True},
        ],
    },
    {
        "name": "Brake Service",
        "description": "Brake system inspection and repair",
        "stages": ["Inspection", "Disassembly", "Parts Replacement", "Bleeding", "Testing"],
        "items": [
            {"name": "Front Brake Pads", "price": 3500, "is_labor": False},
            {"name": "Rear Brake Pads", "price": 3000, "is_labor": False},
            {"name": "Front Brake Discs (pair)", "price": 8500, "is_labor": False},
            {"name": "Rear Brake Discs (pair)", "price": 7500, "is_labor": False},
            {"name": "Brake Fluid", "price": 800, "is_labor": False},
            {"name": "Brake Service Labor", "price": 3500, "is_labor": True},
            {"name": "Brake Bleeding", "price": 1500, "is_labor": True},
        ],
    },
    {
        "name": "Suspension / Steering",
        "description": "Suspension and steering repairs",
        "stages": ["Inspection", "Parts Replacement", "Wheel Alignment", "Test Drive"],
        "items": [
            {"name": "Front Shock Absorber (each)", "price": 6500, "is_labor": False},
            {"name": "Rear Shock Absorber (each)", "price": 5500, "is_labor": False},
            {"name": "Ball Joint (each)", "price": 2500, "is_labor": False},
            {"name": "Tie Rod End (each)", "price": 2000, "is_labor": False},
            {"name": "Control Arm Bush", "price": 1800, "is_labor": False},
            {"name": "Wheel Alignment", "price": 3500, "is_labor": True},
            {"name": "Suspension Labor", "price": 4000, "is_labor": True},
        ],
    },
    {
        "name": "Electrical / Wiring",
        "description": "Electrical system diagnosis and repair",
        "stages": ["Diagnosis", "Wiring Repair", "Component Replace", "Testing"],
        "items": [
            {"name": "Electrical Diagnosis", "price": 2500, "is_labor": True},
            {"name": "Battery", "price": 15000, "is_labor": False},
            {"name": "Wiring Repair", "price": 3500, "is_labor": True},
            {"name": "Fuse Box Repair", "price": 2500, "is_labor": True},
            {"name": "Headlight Bulb", "price": 800, "is_labor": False},
            {"name": "Sensor Replacement", "price": 4500, "is_labor": False},
        ],
    },
    {
        "name": "AC / Cooling System",
        "description": "Air conditioning and cooling repairs",
        "stages": ["Diagnosis", "Leak Repair", "Regas", "Testing"],
        "items": [
            {"name": "AC Diagnosis", "price": 1500, "is_labor": True},
            {"name": "AC Regas (R134a)", "price": 4500, "is_labor": True},
            {"name": "AC Compressor", "price": 25000, "is_labor": False},
            {"name": "Condenser", "price": 12000, "is_labor": False},
            {"name": "Radiator", "price": 15000, "is_labor": False},
            {"name": "Thermostat", "price": 2500, "is_labor": False},
            {"name": "Coolant (5L)", "price": 2000, "is_labor": False},
            {"name": "Cooling System Labor", "price": 3500, "is_labor": True},
        ],
    },
    {
        "name": "Tire Service",
        "description": "Tire repair, replacement, and balancing",
        "stages": ["Inspection", "Tire Change/Repair", "Balancing", "Alignment"],
        "items": [
            {"name": "Puncture Repair", "price": 500, "is_labor": True},
            {"name": "Tire Rotation", "price": 1000, "is_labor": True},
            {"name": "Wheel Balancing (4 wheels)", "price": 2000, "is_labor": True},
            {"name": "Wheel Alignment", "price": 3500, "is_labor": True},
            {"name": "Valve Stem", "price": 200, "is_labor": False},
            {"name": "Tire Mounting (each)", "price": 400, "is_labor": True},
        ],
    },
    {
        "name": "Transmission",
        "description": "Transmission service and repair",
        "stages": ["Diagnosis", "Fluid Change", "Repair/Rebuild", "Testing"],
        "items": [
            {"name": "Transmission Fluid (ATF)", "price": 3500, "is_labor": False},
            {"name": "Transmission Filter", "price": 2500, "is_labor": False},
            {"name": "Clutch Kit", "price": 18000, "is_labor": False},
            {"name": "Clutch Replacement Labor", "price": 12000, "is_labor": True},
            {"name": "Gearbox Mount", "price": 3500, "is_labor": False},
            {"name": "Transmission Service", "price": 5000, "is_labor": True},
        ],
    },
    {
        "name": "Engine Overhaul",
        "description": "Major engine repairs and rebuilds",
        "stages": ["Diagnosis", "Teardown", "Machining/Parts", "Reassembly", "Tuning"],
        "items": [
            {"name": "Engine Overhaul Labor", "price": 45000, "is_labor": True},
            {"name": "Piston Rings Set", "price": 8500, "is_labor": False},
            {"name": "Gasket Set (Full)", "price": 12000, "is_labor": False},
            {"name": "Crankshaft Bearings", "price": 6500, "is_labor": False},
            {"name": "Cylinder Head Machining", "price": 15000, "is_labor": True},
            {"name": "Valve Stem Seals", "price": 3500, "is_labor": False},
            {"name": "Engine Tuning", "price": 5000, "is_labor": True},
        ],
    },
    {
        "name": "Detailing / Wash",
        "description": "Interior and exterior cleaning",
        "stages": ["Exterior Wash", "Interior Clean", "Polish", "Wax"],
        "items": [
            {"name": "Basic Wash", "price": 500, "is_labor": True},
            {"name": "Full Wash & Interior", "price": 1500, "is_labor": True},
            {"name": "Full Detailing", "price": 8000, "is_labor": True},
            {"name": "Engine Bay Cleaning", "price": 2000, "is_labor": True},
            {"name": "Upholstery Cleaning", "price": 3500, "is_labor": True},
            {"name": "Paint Correction", "price": 12000, "is_labor": True},
            {"name": "Ceramic Coating", "price": 25000, "is_labor": True},
        ],
    },
    {
        "name": "Window Tinting",
        "description": "Professional window film installation",
        "stages": ["Surface Prep", "Film Cutting", "Application", "Curing"],
        "items": [
            {"name": "Front Windscreen Tint", "price": 8000, "is_labor": True},
            {"name": "Rear Windscreen Tint", "price": 6000, "is_labor": True},
            {"name": "Side Windows (4 pcs)", "price": 12000, "is_labor": True},
            {"name": "Full Car Tint", "price": 25000, "is_labor": True},
            {"name": "Tint Film - Standard", "price": 5000, "is_labor": False},
            {"name": "Tint Film - Premium Ceramic", "price": 15000, "is_labor": False},
            {"name": "Tint Removal", "price": 3000, "is_labor": True},
            {"name": "Sunroof Tint", "price": 4000, "is_labor": True},
        ],
    },
    {
        "name": "Paint Protection Film (PPF)",
        "description": "Clear protective film for paint protection",
        "stages": ["Surface Prep", "Template/Cut", "Application", "Edge Sealing", "Inspection"],
        "items": [
            {"name": "Full Hood PPF", "price": 45000, "is_labor": True},
            {"name": "Full Front (Hood, Fenders, Bumper)", "price": 85000, "is_labor": True},
            {"name": "Full Body PPF", "price": 250000, "is_labor": True},
            {"name": "Door Edge Guards", "price": 8000, "is_labor": True},
            {"name": "Door Cup Protection", "price": 6000, "is_labor": True},
            {"name": "Side Mirrors PPF", "price": 8000, "is_labor": True},
            {"name": "Headlight PPF (pair)", "price": 12000, "is_labor": True},
            {"name": "PPF Film - Standard (per sqm)", "price": 15000, "is_labor": False},
            {"name": "PPF Film - Premium Self-Heal (per sqm)", "price": 25000, "is_labor": False},
            {"name": "PPF Removal", "price": 20000, "is_labor": True},
        ],
    },
    {
        "name": "Vehicle Wrap",
        "description": "Full or partial vinyl wrap for color change or graphics",
        "stages": ["Design/Planning", "Surface Prep", "Disassembly", "Wrap Application", "Reassembly", "Finishing"],
        "items": [
            {"name": "Full Body Wrap - Sedan", "price": 150000, "is_labor": True},
            {"name": "Full Body Wrap - SUV", "price": 180000, "is_labor": True},
            {"name": "Partial Wrap (Hood, Roof)", "price": 45000, "is_labor": True},
            {"name": "Roof Wrap", "price": 25000, "is_labor": True},
            {"name": "Chrome Delete", "price": 35000, "is_labor": True},
            {"name": "Side Mirrors Wrap", "price": 5000, "is_labor": True},
            {"name": "Interior Trim Wrap", "price": 20000, "is_labor": True},
            {"name": "Vinyl Film - Gloss (per roll)", "price": 25000, "is_labor": False},
            {"name": "Vinyl Film - Matte (per roll)", "price": 28000, "is_labor": False},
            {"name": "Vinyl Film - Satin (per roll)", "price": 30000, "is_labor": False},
            {"name": "Vinyl Film - Carbon Fiber (per roll)", "price": 35000, "is_labor": False},
            {"name": "Wrap Removal", "price": 30000, "is_labor": True},
        ],
    },
]


class ServiceService:
    """Service CRUD and management."""

    def __init__(self, db: Session):
        self.db = db

    def seed_defaults_for_chain(self, chain_id: int) -> List[Service]:
        """Seed default services for a newly created chain."""
        services = []

        for svc_data in DEFAULT_SERVICES:
            service = Service(
                chain_id=chain_id,
                name=svc_data["name"],
                description=svc_data["description"],
            )
            self.db.add(service)
            self.db.flush()  # Get service.id

            # Add stages
            for order, stage_name in enumerate(svc_data["stages"]):
                stage = ServiceStage(
                    service_id=service.id,
                    name=stage_name,
                    order=order,
                )
                self.db.add(stage)

            # Add quotation template items
            for item_data in svc_data.get("items", []):
                item = ServiceQuotationItem(
                    service_id=service.id,
                    name=item_data["name"],
                    price=item_data["price"],
                    is_labor=item_data.get("is_labor", False),
                    is_active=True,
                )
                self.db.add(item)

            services.append(service)

        self.db.commit()
        return services

    def list_by_chain(self, chain_id: int, active_only: bool = True) -> List[Service]:
        """List all services for a chain."""
        query = select(Service).where(Service.chain_id == chain_id)
        if active_only:
            query = query.where(Service.is_active == True)
        return list(self.db.exec(query).all())

    def get_by_id(self, id: int) -> Service:
        service = self.db.get(Service, id)
        if not service:
            raise NotFoundError(f"Service {id} not found")
        return service

    def get_stages(self, service_id: int) -> List[ServiceStage]:
        """Get stages for a service, ordered."""
        return list(
            self.db.exec(
                select(ServiceStage)
                .where(ServiceStage.service_id == service_id)
                .order_by(ServiceStage.order)
            ).all()
        )

    def add_service_to_job(self, job_id: int, service_id: int) -> JobService:
        """Add a service to a job."""
        # Get first stage
        stages = self.get_stages(service_id)
        first_stage_id = stages[0].id if stages else None

        job_service = JobService(
            job_id=job_id,
            service_id=service_id,
            current_stage_id=first_stage_id,
        )
        self.db.add(job_service)
        self.db.commit()
        self.db.refresh(job_service)
        return job_service

    def get_job_services(self, job_id: int) -> List[JobService]:
        """Get all services attached to a job."""
        return list(
            self.db.exec(select(JobService).where(JobService.job_id == job_id)).all()
        )

    def create(self, chain_id: int, data: ServiceCreate) -> Service:
        """Create a new service with stages."""
        service = Service(
            chain_id=chain_id,
            name=data.name,
            description=data.description,
        )
        self.db.add(service)
        self.db.flush()

        for stage_data in data.stages:
            stage = ServiceStage(
                service_id=service.id,
                name=stage_data.name,
                order=stage_data.order,
            )
            self.db.add(stage)

        self.db.commit()
        self.db.refresh(service)
        return service

    def update(self, service_id: int, data: ServiceUpdate) -> Service:
        """Update a service and optionally replace its stages."""
        service = self.get_by_id(service_id)

        if data.name is not None:
            service.name = data.name
        if data.description is not None:
            service.description = data.description
        if data.is_active is not None:
            service.is_active = data.is_active

        # If stages provided, replace all stages
        if data.stages is not None:
            # Delete existing stages
            existing_stages = self.get_stages(service_id)
            for stage in existing_stages:
                self.db.delete(stage)

            # Add new stages
            for stage_data in data.stages:
                stage = ServiceStage(
                    service_id=service_id,
                    name=stage_data.name,
                    order=stage_data.order,
                )
                self.db.add(stage)

        self.db.add(service)
        self.db.commit()
        self.db.refresh(service)
        return service

    def delete(self, service_id: int) -> None:
        """Delete a service (soft delete by setting is_active=False)."""
        service = self.get_by_id(service_id)
        service.is_active = False
        self.db.add(service)
        self.db.commit()

    # Quotation Item CRUD
    def get_quotation_items(self, service_id: int, active_only: bool = True) -> List[ServiceQuotationItem]:
        """Get all quotation items for a service."""
        query = select(ServiceQuotationItem).where(ServiceQuotationItem.service_id == service_id)
        if active_only:
            # Include items where is_active is True OR NULL (treats NULL as active)
            query = query.where(
                or_(
                    ServiceQuotationItem.is_active == True,
                    ServiceQuotationItem.is_active == None
                )
            )
        return list(self.db.exec(query).all())

    def get_quotation_item(self, item_id: int) -> ServiceQuotationItem:
        """Get a quotation item by ID."""
        item = self.db.get(ServiceQuotationItem, item_id)
        if not item:
            raise NotFoundError(f"Quotation item {item_id} not found")
        return item

    def create_quotation_item(self, service_id: int, data: QuotationItemCreate) -> ServiceQuotationItem:
        """Create a new quotation item for a service."""
        # Verify service exists
        self.get_by_id(service_id)

        item = ServiceQuotationItem(
            service_id=service_id,
            name=data.name,
            description=data.description,
            price=data.price,
            is_labor=data.is_labor,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_quotation_item(self, item_id: int, data: QuotationItemUpdate) -> ServiceQuotationItem:
        """Update a quotation item."""
        item = self.get_quotation_item(item_id)

        if data.name is not None:
            item.name = data.name
        if data.description is not None:
            item.description = data.description
        if data.price is not None:
            item.price = data.price
        if data.is_labor is not None:
            item.is_labor = data.is_labor
        if data.is_active is not None:
            item.is_active = data.is_active

        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_quotation_item(self, item_id: int) -> None:
        """Delete a quotation item (soft delete)."""
        item = self.get_quotation_item(item_id)
        item.is_active = False
        self.db.add(item)
        self.db.commit()

    def seed_default_templates(self, chain_id: int) -> int:
        """Add default template items to existing services that don't have any."""
        services = self.list_by_chain(chain_id, active_only=False)
        items_added = 0

        # Create a map of default service names to their items
        default_items_map = {svc["name"]: svc.get("items", []) for svc in DEFAULT_SERVICES}

        for service in services:
            # Check if service already has quotation items
            existing_items = self.get_quotation_items(service.id, active_only=False)
            if len(existing_items) > 0:
                continue  # Skip services that already have items

            # Find matching default items
            default_items = default_items_map.get(service.name, [])
            if not default_items:
                continue

            # Add default items
            for item_data in default_items:
                item = ServiceQuotationItem(
                    service_id=service.id,
                    name=item_data["name"],
                    price=item_data["price"],
                    is_labor=item_data.get("is_labor", False),
                    is_active=True,
                )
                self.db.add(item)
                items_added += 1

        self.db.commit()
        return items_added

    def fix_quotation_items_active_status(self, chain_id: int) -> int:
        """Fix any quotation items that have is_active=NULL or False."""
        services = self.list_by_chain(chain_id, active_only=False)
        fixed = 0

        for service in services:
            # Get ALL items including inactive
            items = self.db.exec(
                select(ServiceQuotationItem).where(
                    ServiceQuotationItem.service_id == service.id
                )
            ).all()

            for item in items:
                if not item.is_active:
                    item.is_active = True
                    self.db.add(item)
                    fixed += 1

        self.db.commit()
        return fixed
