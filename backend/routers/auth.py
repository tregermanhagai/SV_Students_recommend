from fastapi import APIRouter, HTTPException, status
from models.user import UserRegister, UserLogin, UserOut
from services.supabase_client import get_supabase

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
    try:
        result = sb.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"full_name": body.name}},
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

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
    try:
        result = sb.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not result.user or not result.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    name = (result.user.user_metadata or {}).get("full_name", result.user.email)

    return UserOut(
        id=result.user.id,
        name=name,
        email=result.user.email,
        access_token=result.session.access_token,
    )
