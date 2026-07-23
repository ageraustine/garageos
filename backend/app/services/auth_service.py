from datetime import datetime, timezone
from sqlmodel import Session, select
from app.models.chain import Chain
from app.models.branch import Branch
from app.models.employee import Employee, EmployeeRole
from app.schemas.auth import (
    RegisterRequest,
    RegisterSellerRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    ProfileUpdate,
    ChangePinRequest,
    ChainSettingsUpdate,
    ChainSettingsResponse,
)
from app.models.marketplace.seller import MarketplaceSeller
from app.core.security import hash_pin, verify_pin, create_access_token, create_refresh_token
from app.core.exceptions import ConflictError, UnauthorizedError, NotFoundError
from app.config import settings
from app.services.service_service import ServiceService


class AuthService:
    """
    Authentication service handling registration and login.

    Single Responsibility: auth flows only.
    Depends on abstractions (Session) not concretions.
    """

    def __init__(self, db: Session):
        self.db = db

    def check_name_availability(self, name: str) -> tuple[bool, str | None]:
        """
        Check if chain name is available.
        Returns (available, suggestion) - suggestion is offered if name is taken.
        """
        name = name.lower().strip()
        existing = self.db.exec(select(Chain).where(Chain.name == name)).first()

        if not existing:
            return True, None

        # Generate suggestion by appending numbers
        for i in range(1, 100):
            suggestion = f"{name}{i}"
            if not self.db.exec(select(Chain).where(Chain.name == suggestion)).first():
                return False, suggestion

        return False, None

    def register(self, data: RegisterRequest) -> TokenResponse:
        """
        Register a new chain with owner account.

        Creates:
        1. Chain record
        2. Default "Headquarters" branch
        3. Owner as Employee with role=hq
        """
        # Check name availability
        available, _ = self.check_name_availability(data.chain_name)
        if not available:
            raise ConflictError(f"Chain name '{data.chain_name}' is already taken")

        # Check phone uniqueness
        existing_phone = self.db.exec(
            select(Employee).where(Employee.phone == data.phone)
        ).first()
        if existing_phone:
            raise ConflictError("Phone number already registered")

        # Create chain
        chain = Chain(name=data.chain_name.lower(), display_name=data.display_name)
        self.db.add(chain)
        self.db.flush()  # Get chain.id

        # Create default HQ branch
        hq_branch = Branch(chain_id=chain.id, name="Headquarters", bays=1)
        self.db.add(hq_branch)
        self.db.flush()

        # Create owner as HQ employee
        owner = Employee(
            chain_id=chain.id,
            branch_id=hq_branch.id,
            role=EmployeeRole.HQ,
            name=data.owner_name,
            phone=data.phone,
            pin_hash=hash_pin(data.pin),
        )
        self.db.add(owner)
        self.db.commit()
        self.db.refresh(owner)

        # Seed default services for the chain
        service_service = ServiceService(self.db)
        service_service.seed_defaults_for_chain(chain.id)

        # Generate tokens
        return self._create_tokens(owner, chain)

    def register_seller(self, data: RegisterSellerRequest) -> TokenResponse:
        """
        Register an external marketplace seller.

        Creates:
        1. Employee record with is_external_seller=True, chain_id=None
        2. MarketplaceSeller record
        """
        # Check phone uniqueness
        existing_phone = self.db.exec(
            select(Employee).where(Employee.phone == data.phone)
        ).first()
        if existing_phone:
            raise ConflictError("Phone number already registered")

        # Create external seller employee (no chain)
        seller_user = Employee(
            chain_id=None,
            branch_id=None,
            role=EmployeeRole.ADVISOR,  # Default role (doesn't matter for external sellers)
            name=data.name,
            phone=data.phone,
            pin_hash=hash_pin(data.pin),
            email=data.email,
            is_external_seller=True,
        )
        self.db.add(seller_user)
        self.db.flush()  # Get seller_user.id

        # Create marketplace seller profile
        marketplace_seller = MarketplaceSeller(
            seller_type="external",
            chain_id=None,
            name=data.name,
            phone=data.phone,
            email=data.email,
            whatsapp=data.whatsapp,
            city=data.city,
            is_verified=False,  # External sellers need verification
        )
        self.db.add(marketplace_seller)
        self.db.commit()
        self.db.refresh(seller_user)

        # Generate tokens
        return self._create_tokens_for_seller(seller_user)

    def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate user by phone and PIN."""
        employee = self.db.exec(
            select(Employee).where(
                Employee.phone == data.phone, Employee.is_active == True
            )
        ).first()

        if not employee or not verify_pin(data.pin, employee.pin_hash):
            raise UnauthorizedError("Invalid phone or PIN")

        # Update last login
        employee.last_login_at = datetime.now(timezone.utc)
        self.db.commit()

        # Handle external sellers (no chain)
        if employee.is_external_seller:
            return self._create_tokens_for_seller(employee)

        # Get chain info for regular employees
        chain = self.db.get(Chain, employee.chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        return self._create_tokens(employee, chain)

    def refresh_tokens(self, employee_id: int) -> TokenResponse:
        """Generate new tokens for an existing user."""
        employee = self.db.get(Employee, employee_id)
        if not employee or not employee.is_active:
            raise UnauthorizedError("Invalid user")

        # Handle external sellers
        if employee.is_external_seller:
            return self._create_tokens_for_seller(employee)

        chain = self.db.get(Chain, employee.chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        return self._create_tokens(employee, chain)

    def get_current_user(self, employee_id: int) -> UserResponse:
        """Get current user details from token payload."""
        employee = self.db.get(Employee, employee_id)
        if not employee:
            raise NotFoundError("User not found")

        # Handle external sellers
        if employee.is_external_seller:
            return UserResponse(
                id=employee.id,
                name=employee.name,
                phone=employee.phone,
                role="seller",  # External sellers have a "seller" role
                chain_id=None,
                chain_name=None,
                chain_display_name=None,
                chain_currency="KES",
                branch_id=None,
                is_external_seller=True,
            )

        chain = self.db.get(Chain, employee.chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        return UserResponse(
            id=employee.id,
            name=employee.name,
            phone=employee.phone,
            role=employee.role.value,
            chain_id=employee.chain_id,
            chain_name=chain.name,
            chain_display_name=chain.display_name,
            chain_currency=chain.currency,
            branch_id=employee.branch_id,
            is_external_seller=False,
        )

    def update_profile(self, employee_id: int, data: ProfileUpdate) -> UserResponse:
        """Update employee profile."""
        employee = self.db.get(Employee, employee_id)
        if not employee:
            raise NotFoundError("User not found")

        if data.name is not None:
            employee.name = data.name

        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)

        return self.get_current_user(employee_id)

    def change_pin(self, employee_id: int, data: ChangePinRequest) -> None:
        """Change employee PIN."""
        employee = self.db.get(Employee, employee_id)
        if not employee:
            raise NotFoundError("User not found")

        if not verify_pin(data.current_pin, employee.pin_hash):
            raise UnauthorizedError("Current PIN is incorrect")

        employee.pin_hash = hash_pin(data.new_pin)
        self.db.add(employee)
        self.db.commit()

    def _create_tokens(self, employee: Employee, chain: Chain) -> TokenResponse:
        """Create access and refresh tokens for an employee."""
        token_data = {
            "sub": str(employee.id),
            "chain_id": employee.chain_id,
            "role": employee.role.value,
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def _create_tokens_for_seller(self, employee: Employee) -> TokenResponse:
        """Create access and refresh tokens for an external seller."""
        token_data = {
            "sub": str(employee.id),
            "chain_id": None,
            "role": "seller",
            "is_external_seller": True,
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def get_chain_settings(self, chain_id: int) -> ChainSettingsResponse:
        """Get chain settings."""
        chain = self.db.get(Chain, chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        return ChainSettingsResponse(
            id=chain.id,
            name=chain.name,
            display_name=chain.display_name,
            currency=chain.currency,
            branding=chain.branding,
        )

    def update_chain_settings(
        self, chain_id: int, data: ChainSettingsUpdate
    ) -> ChainSettingsResponse:
        """Update chain settings (HQ only)."""
        chain = self.db.get(Chain, chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        if data.display_name is not None:
            chain.display_name = data.display_name
        if data.currency is not None:
            chain.currency = data.currency
        if data.branding is not None:
            chain.branding = data.branding

        self.db.add(chain)
        self.db.commit()
        self.db.refresh(chain)

        return ChainSettingsResponse(
            id=chain.id,
            name=chain.name,
            display_name=chain.display_name,
            currency=chain.currency,
            branding=chain.branding,
        )
