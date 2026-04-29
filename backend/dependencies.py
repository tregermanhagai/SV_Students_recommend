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
    user_id = user_data["id"]

    profile = httpx.get(
        f"{settings.supabase_url}/rest/v1/profiles",
        params={"id": f"eq.{user_id}", "select": "is_admin"},
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
        },
    )
    is_admin = False
    if profile.status_code == 200 and profile.json():
        is_admin = bool(profile.json()[0].get("is_admin", False))

    return {
        "id":       user_id,
        "email":    user_data.get("email", ""),
        "is_admin": is_admin,
    }
