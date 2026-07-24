from datetime import datetime, timezone, timedelta
import secrets
from sqlmodel import Session, select
from app.models.chain import Chain
from app.models.branch import Branch
from app.models.employee import Employee, EmployeeRole
from app.schemas.auth import (
    RegisterRequest,
    RegisterSellerRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    UserResponse,
    ProfileUpdate,
    ChangePinRequest,
    ChainSettingsUpdate,
    ChainSettingsResponse,
    VerifyEmailResponse,
)
from app.models.marketplace.seller import MarketplaceSeller
from app.core.security import hash_pin, verify_pin, create_access_token, create_refresh_token
from app.core.exceptions import ConflictError, UnauthorizedError, NotFoundError
from app.config import settings
from app.services.service_service import ServiceService
from app.services.email_service import EmailService


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

    def _generate_verification_token(self) -> str:
        """Generate a secure verification token."""
        return secrets.token_urlsafe(32)

    def register(self, data: RegisterRequest) -> RegisterResponse:
        """
        Register a new chain with owner account.

        Creates:
        1. Chain record
        2. Default "Headquarters" branch
        3. Owner as Employee with role=hq (unverified)
        4. Sends verification email

        Returns a message to check email, NOT tokens.
        User must verify email before logging in.
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

        # Check email uniqueness
        existing_email = self.db.exec(
            select(Employee).where(Employee.email == data.email.lower())
        ).first()
        if existing_email:
            raise ConflictError("Email address already registered")

        # Generate verification token
        verification_token = self._generate_verification_token()

        # Create chain
        chain = Chain(name=data.chain_name.lower(), display_name=data.display_name)
        self.db.add(chain)
        self.db.flush()  # Get chain.id

        # Create default HQ branch
        hq_branch = Branch(chain_id=chain.id, name="Headquarters", bays=1)
        self.db.add(hq_branch)
        self.db.flush()

        # Create owner as HQ employee (unverified)
        owner = Employee(
            chain_id=chain.id,
            branch_id=hq_branch.id,
            role=EmployeeRole.HQ,
            name=data.owner_name,
            phone=data.phone,
            email=data.email.lower(),
            pin_hash=hash_pin(data.pin),
            email_verified=False,
            email_verification_token=verification_token,
            email_verification_sent_at=datetime.now(timezone.utc),
        )
        self.db.add(owner)
        self.db.commit()
        self.db.refresh(owner)

        # Seed default services for the chain
        service_service = ServiceService(self.db)
        service_service.seed_defaults_for_chain(chain.id)

        # Send verification email
        email_service = EmailService()
        email_service.send_verification_email(
            to_email=owner.email,
            user_name=owner.name,
            verification_token=verification_token,
        )

        return RegisterResponse(
            message="Registration successful. Please check your email to verify your account.",
            email=owner.email,
        )

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

    def verify_email(self, token: str) -> VerifyEmailResponse:
        """
        Verify email address using the verification token.

        Returns tokens on success so user is logged in immediately.
        """
        # Find employee by token
        employee = self.db.exec(
            select(Employee).where(Employee.email_verification_token == token)
        ).first()

        if not employee:
            raise NotFoundError("Invalid or expired verification token")

        # Check token expiry (24 hours)
        if employee.email_verification_sent_at:
            expiry = employee.email_verification_sent_at + timedelta(
                hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
            )
            if datetime.now(timezone.utc) > expiry:
                raise UnauthorizedError("Verification token has expired. Please request a new one.")

        # Mark as verified
        employee.email_verified = True
        employee.email_verification_token = None  # Clear token
        employee.last_login_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(employee)

        # Send welcome email
        email_service = EmailService()
        email_service.send_welcome_email(
            to_email=employee.email,
            user_name=employee.name,
        )

        # Generate tokens
        if employee.is_external_seller:
            tokens = self._create_tokens_for_seller(employee)
        else:
            chain = self.db.get(Chain, employee.chain_id)
            if not chain:
                raise NotFoundError("Chain not found")
            tokens = self._create_tokens(employee, chain)

        return VerifyEmailResponse(
            message="Email verified successfully",
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            expires_in=tokens.expires_in,
        )

    def resend_verification_email(self, email: str) -> RegisterResponse:
        """
        Resend verification email to a user who hasn't verified yet.
        """
        employee = self.db.exec(
            select(Employee).where(Employee.email == email.lower())
        ).first()

        if not employee:
            # Don't reveal if email exists
            return RegisterResponse(
                message="If an account exists with this email, a verification link has been sent.",
                email=email,
            )

        if employee.email_verified:
            raise ConflictError("This email is already verified. Please login.")

        # Generate new token
        verification_token = self._generate_verification_token()
        employee.email_verification_token = verification_token
        employee.email_verification_sent_at = datetime.now(timezone.utc)
        self.db.commit()

        # Send verification email
        email_service = EmailService()
        email_service.send_verification_email(
            to_email=employee.email,
            user_name=employee.name,
            verification_token=verification_token,
        )

        return RegisterResponse(
            message="If an account exists with this email, a verification link has been sent.",
            email=email,
        )

    def login(self, data: LoginRequest) -> TokenResponse:
        """Authenticate user by phone and PIN."""
        employee = self.db.exec(
            select(Employee).where(
                Employee.phone == data.phone, Employee.is_active == True
            )
        ).first()

        if not employee or not verify_pin(data.pin, employee.pin_hash):
            raise UnauthorizedError("Invalid phone or PIN")

        # Check if email is verified (skip for external sellers who might not have email)
        if employee.email and not employee.email_verified:
            raise UnauthorizedError("Please verify your email address before logging in. Check your inbox for the verification link.")

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
        """Get chain settings including public profile."""
        chain = self.db.get(Chain, chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        return ChainSettingsResponse(
            id=chain.id,
            name=chain.name,
            display_name=chain.display_name,
            currency=chain.currency,
            branding=chain.branding,
            # Public profile fields
            tagline=chain.tagline,
            cover_image_url=chain.cover_image_url,
            description=chain.description,
            year_established=chain.year_established,
            specialties=chain.specialties,
            phone=chain.phone,
            whatsapp=chain.whatsapp,
            email=chain.email,
            address=chain.address,
            city=chain.city,
            website=chain.website,
            social_links=chain.social_links,
            gallery_images=chain.gallery_images,
            operating_hours=chain.operating_hours,
            is_public=chain.is_public,
            is_featured=chain.is_featured,
        )

    def update_chain_settings(
        self, chain_id: int, data: ChainSettingsUpdate
    ) -> ChainSettingsResponse:
        """Update chain settings including public profile (HQ only)."""
        chain = self.db.get(Chain, chain_id)
        if not chain:
            raise NotFoundError("Chain not found")

        # Basic settings
        if data.display_name is not None:
            chain.display_name = data.display_name
        if data.currency is not None:
            chain.currency = data.currency
        if data.branding is not None:
            chain.branding = data.branding

        # Public profile - Hero
        if data.tagline is not None:
            chain.tagline = data.tagline
        if data.cover_image_url is not None:
            chain.cover_image_url = data.cover_image_url

        # Public profile - About
        if data.description is not None:
            chain.description = data.description
        if data.year_established is not None:
            chain.year_established = data.year_established
        if data.specialties is not None:
            chain.specialties = data.specialties

        # Public profile - Contact
        if data.phone is not None:
            chain.phone = data.phone
        if data.whatsapp is not None:
            chain.whatsapp = data.whatsapp
        if data.email is not None:
            chain.email = data.email

        # Public profile - Location
        if data.address is not None:
            chain.address = data.address
        if data.city is not None:
            chain.city = data.city

        # Public profile - Online presence
        if data.website is not None:
            chain.website = data.website
        if data.social_links is not None:
            chain.social_links = data.social_links

        # Public profile - Gallery & Hours
        if data.gallery_images is not None:
            chain.gallery_images = data.gallery_images
        if data.operating_hours is not None:
            chain.operating_hours = data.operating_hours

        # Visibility
        if data.is_public is not None:
            chain.is_public = data.is_public

        self.db.add(chain)
        self.db.commit()
        self.db.refresh(chain)

        return self.get_chain_settings(chain_id)
