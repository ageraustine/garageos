from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
import jwt

from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import (
    CheckNameRequest,
    CheckNameResponse,
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
    ProfileUpdate,
    ChangePinRequest,
    ChainSettingsUpdate,
    ChainSettingsResponse,
)
from app.services.auth_service import AuthService
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
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new chain and owner account.
    Creates: Chain + default Branch + Owner Employee (HQ role).
    """
    service = AuthService(db)
    try:
        return service.register(data)
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
