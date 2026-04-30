import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Header
from config import get_settings
from services.supabase_client import get_supabase
from dependencies import get_current_user
from models.user import PasswordChange

router = APIRouter()


@router.get(
    "/profile/me",
    summary="Get current user profile",
)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile information."""
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", current_user["id"]).execute()
    rows = profile.data or []
    name = rows[0]["name"] if rows else current_user.get("email", "")
    return {
        "id":       current_user["id"],
        "email":    current_user["email"],
        "name":     name,
        "is_admin": bool(rows[0].get("is_admin")) if rows else False,
    }


@router.put(
    "/profile/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change your password",
)
def change_password(body: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Updates the authenticated user's password."""
    settings = get_settings()
    resp = httpx.put(
        f"{settings.supabase_url}/auth/v1/admin/users/{current_user['id']}",
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
        },
        json={"password": body.new_password},
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password. Please try again.",
        )


@router.delete(
    "/profile/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete your own account",
)
def delete_profile(current_user: dict = Depends(get_current_user)):
    """Permanently deletes the authenticated user's account and profile."""
    settings = get_settings()
    user_id = current_user["id"]
    resp = httpx.delete(
        f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
        },
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account. Please try again.",
        )


@router.get(
    "/profile/token",
    summary="Get your current Bearer token",
)
def get_token(authorization: str = Header(...)):
    """
    Returns your current Bearer token.

    This endpoint is provided for API practice — students can call this
    to retrieve their token programmatically, or simply copy it from the
    Profile page in the web UI.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
    token = authorization.removeprefix("Bearer ").strip()
    return {"access_token": token, "token_type": "bearer"}
