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
    chain_id: int
    chain_name: str
    chain_display_name: str
    chain_currency: str = "KES"
    branch_id: int | None = None


class ProfileUpdate(BaseModel):
    """Request to update profile."""

    name: str | None = Field(None, min_length=2, max_length=100)


class ChangePinRequest(BaseModel):
    """Request to change PIN."""

    current_pin: str = Field(min_length=4, max_length=6)
    new_pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")


class ChainSettingsUpdate(BaseModel):
    """Request to update chain settings."""

    display_name: str | None = Field(None, min_length=2, max_length=100)
    currency: str | None = Field(None, max_length=10)
    branding: dict | None = None  # {logo_url, primary_color, accent_color}


class ChainSettingsResponse(BaseModel):
    """Response containing chain settings."""

    id: int
    name: str
    display_name: str
    currency: str
    branding: dict | None = None


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
