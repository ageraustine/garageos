from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
import jwt

from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import (
    CheckNameRequest,
    CheckNameResponse,
    RegisterRequest,
    RegisterSellerRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    ProfileUpdate,
    ChangePinRequest,
    ChainSettingsUpdate,
    ChainSettingsResponse,
    LogoUploadRequest,
    LogoUploadResponse,
    LogoConfirmRequest,
    VerifyEmailRequest,
    VerifyEmailResponse,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.auth_service import AuthService
from app.api.deps import get_storage_service
from app.services.storage_service import StorageService
from app.core.security import decode_token
from app.core.exceptions import ConflictError, UnauthorizedError, NotFoundError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/check-name", response_model=CheckNameResponse)
async def check_name_availability(
    data: CheckNameRequest, db: Session = Depends(get_db)
):
    """
    Real-time check if a garage name is available.
    Returns availability and a suggestion if taken.
    """
    service = AuthService(db)
    available, suggestion = service.check_name_availability(data.name)
    return CheckNameResponse(available=available, suggestion=suggestion)


@router.post(
    "/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED
)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new chain and owner account.
    Creates: Chain + default Branch + Owner Employee (HQ role).
    Sends verification email - user must verify before logging in.
    """
    service = AuthService(db)
    try:
        return service.register(data)
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Verify email address using the token sent via email.
    Returns JWT tokens on success so user is logged in immediately.
    """
    service = AuthService(db)
    try:
        return service.verify_email(data.token)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)


@router.post("/resend-verification", response_model=RegisterResponse)
async def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    """
    Resend verification email to a user who hasn't verified yet.
    """
    service = AuthService(db)
    try:
        return service.resend_verification_email(data.email)
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request a password reset email.
    Always returns success to prevent email enumeration.
    """
    service = AuthService(db)
    return service.forgot_password(data.email)


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset password using the token sent via email.
    """
    service = AuthService(db)
    try:
        return service.reset_password(data.token, data.new_pin)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)


@router.post(
    "/register-seller", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register_seller(data: RegisterSellerRequest, db: Session = Depends(get_db)):
    """
    Register as an external marketplace seller.
    Creates: Employee (external seller) + MarketplaceSeller profile.
    External sellers can only access marketplace features.
    """
    service = AuthService(db)
    try:
        return service.register_seller(data)
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with phone number and PIN.
    Returns JWT access and refresh tokens.
    """
    service = AuthService(db)
    try:
        return service.login(data)
    except UnauthorizedError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or PIN"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh an expired access token using a valid refresh token.
    """
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
            )

        employee_id = int(payload["sub"])
        service = AuthService(db)
        return service.refresh_tokens(employee_id)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    except (UnauthorizedError, NotFoundError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """
    Get current authenticated user details.
    Requires valid access token.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Update current user's profile.
    """
    service = AuthService(db)
    try:
        return service.update_profile(current_user.id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/me/change-pin")
async def change_pin(
    data: ChangePinRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Change current user's PIN.
    """
    service = AuthService(db)
    try:
        service.change_pin(current_user.id, data)
        return {"message": "PIN changed successfully"}
    except UnauthorizedError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Current PIN is incorrect"
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get("/chain/settings", response_model=ChainSettingsResponse)
async def get_chain_settings(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Get current chain settings (HQ/Manager only).
    """
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view chain settings",
        )

    service = AuthService(db)
    return service.get_chain_settings(current_user.chain_id)


@router.patch("/chain/settings", response_model=ChainSettingsResponse)
async def update_chain_settings(
    data: ChainSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Update chain settings (HQ only).
    """
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can update chain settings",
        )

    service = AuthService(db)
    try:
        return service.update_chain_settings(current_user.chain_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/chain/logo/upload-url", response_model=LogoUploadResponse)
async def get_logo_upload_url(
    data: LogoUploadRequest,
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get presigned URL for chain logo upload (HQ only).
    """
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can upload chain logo",
        )

    upload_url, object_key = storage.generate_chain_logo_url(
        current_user.chain_id, data.content_type
    )

    return LogoUploadResponse(upload_url=upload_url, object_key=object_key)


@router.post("/chain/logo", response_model=ChainSettingsResponse)
async def confirm_logo_upload(
    data: LogoConfirmRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Confirm logo upload and update chain branding (HQ only).
    """
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can upload chain logo",
        )

    # Get the permanent URL for the uploaded file
    logo_url = storage.get_object_url(data.object_key)

    # Update chain branding with logo URL
    service = AuthService(db)
    chain_settings = service.get_chain_settings(current_user.chain_id)

    # Merge with existing branding or create new
    branding = chain_settings.branding or {}
    branding["logo_url"] = logo_url

    return service.update_chain_settings(
        current_user.chain_id,
        ChainSettingsUpdate(branding=branding),
    )
