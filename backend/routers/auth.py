import httpx
from fastapi import APIRouter, HTTPException, status
from models.user import UserRegister, UserLogin, UserOut, PasswordResetRequest
from services.supabase_client import get_supabase
from config import get_settings

router = APIRouter()


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(body: UserRegister):
    """
    Create a new account with name, email, and password.

    - **name**: Display name shown on comments
    - **email**: Must be a valid email address (unique per account)
    - **password**: Minimum 4 English characters
    """
    sb = get_supabase()

    # Reject blacklisted emails before account creation
    bl = sb.table("email_blacklist").select("id").eq("email", body.email.lower()).execute()
    if bl.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email address is not allowed to register.",
        )

    try:
        result = sb.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"full_name": body.name}},
            }
        )
    except Exception as e:
        msg = str(e)
        if "invalid" in msg.lower() and "email" in msg.lower():
            msg = (
                f"The email address '{body.email}' was rejected. "
                "Please use a standard format without underscores or special characters "
                "before the @ sign (e.g. student1@example.com)."
            )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    if not result.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. This email may already be registered.",
        )

    access_token = result.session.access_token if result.session else ""

    return UserOut(
        id=result.user.id,
        name=body.name,
        email=result.user.email,
        access_token=access_token,
    )


@router.post(
    "/login",
    response_model=UserOut,
    summary="Log in and receive a Bearer token",
)
def login(body: UserLogin):
    """
    Authenticate with email and password.

    Returns an **access_token** — copy it to use as your Bearer token
    in protected endpoints or on the Profile page.
    """
    sb = get_supabase()

    # Reject blacklisted emails before attempting login
    bl = sb.table("email_blacklist").select("id").eq("email", body.email.lower()).execute()
    if bl.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled.",
        )

    try:
        result = sb.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password.",
        )

    if not result.user or not result.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password.",
        )

    name = (result.user.user_metadata or {}).get("full_name", result.user.email)

    return UserOut(
        id=result.user.id,
        name=name,
        email=result.user.email,
        access_token=result.session.access_token,
    )


@router.post(
    "/recover",
    summary="Send a password reset email",
)
def request_password_reset(body: PasswordResetRequest):
    """Triggers Supabase to send a password-reset email to the given address."""
    settings = get_settings()
    httpx.post(
        f"{settings.supabase_url}/auth/v1/recover",
        headers={
            "apikey":        settings.supabase_service_key,
            "Content-Type":  "application/json",
        },
        json={"email": body.email, "redirect_to": body.redirect_to},
    )
    # Always return success — never reveal whether the email exists
    return {"message": "If that email is registered, a reset link has been sent."}
