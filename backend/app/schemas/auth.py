from pydantic import BaseModel, Field, field_validator
import re


# === Request Schemas ===


class CheckNameRequest(BaseModel):
    """Request to check garage name availability."""

    name: str = Field(min_length=3, max_length=30)

    @field_validator("name")
    @classmethod
    def validate_name_format(cls, v: str) -> str:
        v = v.lower().strip()
        # Allow single char for very short names during typing
        if len(v) < 3:
            return v
        if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", v):
            raise ValueError(
                "Name must be URL-safe: lowercase letters, numbers, hyphens only"
            )
        if "--" in v:
            raise ValueError("Consecutive hyphens not allowed")
        return v


class RegisterRequest(BaseModel):
    """Request to register a new garage chain."""

    chain_name: str = Field(min_length=3, max_length=30)
    display_name: str = Field(min_length=2, max_length=100)
    owner_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    email: str = Field(max_length=255, pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")

    @field_validator("chain_name")
    @classmethod
    def validate_chain_name(cls, v: str) -> str:
        v = v.lower().strip()
        if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", v):
            raise ValueError(
                "Chain name must be URL-safe: lowercase letters, numbers, hyphens only"
            )
        if "--" in v:
            raise ValueError("Consecutive hyphens not allowed")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.lower().strip()


class RegisterSellerRequest(BaseModel):
    """Request to register as an external marketplace seller."""

    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")
    email: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    whatsapp: str | None = Field(None, max_length=20)


class LoginRequest(BaseModel):
    """Request to log in with phone and PIN."""

    phone: str
    pin: str = Field(min_length=4, max_length=6)


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""

    refresh_token: str


# === Response Schemas ===


class CheckNameResponse(BaseModel):
    """Response for name availability check."""

    available: bool
    suggestion: str | None = None


class TokenResponse(BaseModel):
    """Response containing JWT tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    """Response containing user information."""

    id: int
    name: str
    phone: str
    role: str
    chain_id: int | None = None  # Null for external sellers
    chain_name: str | None = None
    chain_display_name: str | None = None
    chain_currency: str = "KES"
    branch_id: int | None = None
    is_external_seller: bool = False


class ProfileUpdate(BaseModel):
    """Request to update profile."""

    name: str | None = Field(None, min_length=2, max_length=100)


class ChangePinRequest(BaseModel):
    """Request to change PIN."""

    current_pin: str = Field(min_length=4, max_length=6)
    new_pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")


class ChainSettingsUpdate(BaseModel):
    """Request to update chain settings (including public profile)."""

    # Basic info
    display_name: str | None = Field(None, min_length=2, max_length=100)
    currency: str | None = Field(None, max_length=10)
    branding: dict | None = None  # {logo_url, primary_color, accent_color}

    # Public profile - Hero
    tagline: str | None = Field(None, max_length=150)
    cover_image_url: str | None = Field(None, max_length=500)

    # Public profile - About
    description: str | None = Field(None, max_length=5000)
    year_established: int | None = None
    specialties: list[str] | None = None

    # Public profile - Contact
    phone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=200)

    # Public profile - Location
    address: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=100)

    # Public profile - Online presence
    website: str | None = Field(None, max_length=200)
    social_links: dict | None = None  # {facebook, instagram, twitter, etc.}

    # Public profile - Gallery & Hours
    gallery_images: list[str] | None = None
    operating_hours: dict | None = None  # {mon: "8:00-18:00", ...}

    # Visibility
    is_public: bool | None = None


class ChainSettingsResponse(BaseModel):
    """Response containing chain settings (including public profile)."""

    id: int
    name: str
    display_name: str
    currency: str
    branding: dict | None = None

    # Public profile fields
    tagline: str | None = None
    cover_image_url: str | None = None
    description: str | None = None
    year_established: int | None = None
    specialties: list[str] | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    website: str | None = None
    social_links: dict | None = None
    gallery_images: list[str] | None = None
    operating_hours: dict | None = None
    is_public: bool = False
    is_featured: bool = False


class LogoUploadRequest(BaseModel):
    """Request to get presigned URL for logo upload."""

    content_type: str = "image/png"


class LogoUploadResponse(BaseModel):
    """Response with presigned upload URL."""

    upload_url: str
    object_key: str


class LogoConfirmRequest(BaseModel):
    """Request to confirm logo upload."""

    object_key: str


class RegisterResponse(BaseModel):
    """Response after registration (before email verification)."""

    message: str
    email: str


class VerifyEmailRequest(BaseModel):
    """Request to verify email with token."""

    token: str


class VerifyEmailResponse(BaseModel):
    """Response after email verification."""

    message: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class ResendVerificationRequest(BaseModel):
    """Request to resend verification email."""

    email: str = Field(pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


class ForgotPasswordRequest(BaseModel):
    """Request to send password reset email."""

    email: str = Field(pattern=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.lower().strip()


class ForgotPasswordResponse(BaseModel):
    """Response after requesting password reset."""

    message: str


class ResetPasswordRequest(BaseModel):
    """Request to reset password with token."""

    token: str
    new_pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")


class ResetPasswordResponse(BaseModel):
    """Response after password reset."""

    message: str
