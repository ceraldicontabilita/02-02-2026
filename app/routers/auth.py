"""
Authentication router.
Handles user registration, login, and profile management.
"""
from fastapi import APIRouter, Depends, status
from typing import Dict, Any
import logging

from app.database import Database, Collections
from app.repositories import UserRepository
from app.services import AuthService
from app.models import UserRegister, UserLogin, TokenResponse, PasswordChange
from app.utils.dependencies import get_current_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()


# Dependency to get auth service
async def get_auth_service() -> AuthService:
    """Get auth service with injected dependencies."""
    db = Database.get_db()
    user_repo = UserRepository(db[Collections.USERS])
    return AuthService(user_repo)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account and return JWT token"
)
async def register(
    user_data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Register a new user.
    
    - **email**: Valid email address
    - **password**: Password (min 8 characters)
    - **name**: Optional user name
    
    Returns JWT access token upon successful registration.
    """
    logger.info(f"Registration request: {user_data.email}")
    return await auth_service.register(user_data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login",
    description="Authenticate user and return JWT token"
)
async def login(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Authenticate user with email and password.
    
    - **email**: User email
    - **password**: User password
    
    Returns JWT access token upon successful authentication.
    """
    logger.info(f"Login request: {credentials.email}")
    return await auth_service.login(credentials)


@router.get(
    "/profile",
    response_model=Dict[str, Any],
    summary="Get user profile",
    description="Get current user profile information"
)
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Dict[str, Any]:
    """
    Get authenticated user's profile.
    
    Requires valid JWT token in Authorization header:
    ```
    Authorization: Bearer <token>
    ```
    """
    user_id = current_user["user_id"]
    return await auth_service.get_user_profile(user_id)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change password",
    description="Change current user password"
)
async def change_password(
    password_data: PasswordChange,
    current_user: Dict[str, Any] = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Dict[str, str]:
    """
    Change user password.
    
    - **old_password**: Current password
    - **new_password**: New password (min 8 characters)
    
    Requires authentication.
    """
    user_id = current_user["user_id"]
    
    await auth_service.change_password(
        user_id=user_id,
        old_password=password_data.old_password,
        new_password=password_data.new_password
    )
    
    return {"message": "Password changed successfully"}


@router.post(
    "/users/{user_id}/deactivate",
    status_code=status.HTTP_200_OK,
    summary="Deactivate user (Admin only)",
    description="Deactivate a user account"
)
async def deactivate_user(
    user_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Dict[str, str]:
    """
    Deactivate a user account.
    
    **Admin access required.**
    """
    logger.warning(f"Admin {admin_user['user_id']} deactivating user: {user_id}")
    
    await auth_service.deactivate_user(user_id)
    
    return {"message": f"User {user_id} deactivated successfully"}


@router.post(
    "/users/{user_id}/activate",
    status_code=status.HTTP_200_OK,
    summary="Activate user (Admin only)",
    description="Activate a user account"
)
async def activate_user(
    user_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin_user),
    auth_service: AuthService = Depends(get_auth_service)
) -> Dict[str, str]:
    """
    Activate a user account.
    
    **Admin access required.**
    """
    logger.info(f"Admin {admin_user['user_id']} activating user: {user_id}")
    
    await auth_service.activate_user(user_id)
    
    return {"message": f"User {user_id} activated successfully"}


@router.get(
    "/verify",
    response_model=Dict[str, Any],
    summary="Verify JWT token",
    description="Verify JWT token validity and return user data"
)
async def verify_token(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verify JWT token and return user data.
    
    Useful for checking if token is still valid.
    """
    return {
        "valid": True,
        "user": current_user
    }
