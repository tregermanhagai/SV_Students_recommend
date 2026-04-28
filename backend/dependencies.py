from fastapi import Header, HTTPException, status
import httpx
from config import get_settings


async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Validates the Bearer token by calling the Supabase Auth API.
    Works with any JWT algorithm Supabase uses (HS256, ES256, etc.).
    Returns the user payload on success, raises HTTP 401 on failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    resp = httpx.get(
        f"{settings.supabase_url}/auth/v1/user",
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {token}",
        },
    )

    if resp.status_code != 200:
        raise credentials_exception

    user_data = resp.json()
    return {
        "id":    user_data["id"],
        "email": user_data.get("email", ""),
    }
