from fastapi import APIRouter, Depends, HTTPException, status, Header
from services.supabase_client import get_supabase
from dependencies import get_current_user

router = APIRouter()


@router.get(
    "/profile/me",
    summary="Get current user profile",
)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile information."""
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", current_user["id"]).single().execute()

    name = profile.data["name"] if profile.data else current_user.get("email", "")
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": name,
    }


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
