import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, status
from config import get_settings
from services.supabase_client import get_supabase
from dependencies import get_current_user

router = APIRouter()


def require_admin(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return current_user


@router.get("/admin/users", summary="List all users (admin only)")
def list_users(current_user: dict = Depends(require_admin)):
    settings = get_settings()
    resp = httpx.get(
        f"{settings.supabase_url}/auth/v1/admin/users",
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
        },
        params={"per_page": 1000},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch users.")

    auth_users = resp.json().get("users", [])

    sb = get_supabase()
    profiles = sb.table("profiles").select("id, name, is_admin").execute()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    result = []
    for u in auth_users:
        uid = u.get("id")
        profile = profile_map.get(uid, {})
        banned_until = u.get("banned_until")
        is_banned = bool(banned_until and banned_until != "none")
        result.append({
            "id":           uid,
            "email":        u.get("email", ""),
            "name":         profile.get("name", ""),
            "is_admin":     profile.get("is_admin", False),
            "is_banned":    is_banned,
            "banned_until": banned_until,
            "created_at":   u.get("created_at", ""),
        })

    return result


@router.post("/admin/users/{user_id}/ban", summary="Ban a user (admin only)")
def ban_user(user_id: str, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot ban yourself.")
    settings = get_settings()
    resp = httpx.put(
        f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
        },
        json={"ban_duration": "876600h"},
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to ban user.")
    return {"status": "banned"}


@router.post("/admin/users/{user_id}/unban", summary="Unban a user (admin only)")
def unban_user(user_id: str, current_user: dict = Depends(require_admin)):
    settings = get_settings()
    resp = httpx.put(
        f"{settings.supabase_url}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey":        settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
        },
        json={"ban_duration": "none"},
    )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=500, detail="Failed to unban user.")
    return {"status": "unbanned"}


# ── Email Blacklist ───────────────────────────────────────────

@router.get("/admin/blacklist", summary="List blacklisted emails (admin only)")
def list_blacklist(current_user: dict = Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("email_blacklist").select("id, email, created_at").order("created_at", desc=True).execute()
    return rows.data or []


@router.post("/admin/blacklist", status_code=201, summary="Add email to blacklist (admin only)")
def add_blacklist(email: str = Body(..., embed=True), current_user: dict = Depends(require_admin)):
    email = email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    sb = get_supabase()
    existing = sb.table("email_blacklist").select("id").eq("email", email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email is already blacklisted.")
    result = sb.table("email_blacklist").insert({"email": email, "added_by": current_user["id"]}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add email to blacklist.")
    return result.data[0]


@router.delete("/admin/blacklist/{entry_id}", status_code=204, summary="Remove email from blacklist (admin only)")
def remove_blacklist(entry_id: str, current_user: dict = Depends(require_admin)):
    sb = get_supabase()
    sb.table("email_blacklist").delete().eq("id", entry_id).execute()


# ── System Settings ───────────────────────────────────────────

@router.get("/admin/settings", summary="Get system settings (admin only)")
def get_settings_endpoint(current_user: dict = Depends(require_admin)):
    sb = get_supabase()
    rows = sb.table("system_settings").select("key, value, updated_at").execute()
    return {r["key"]: r["value"] for r in (rows.data or [])}


@router.put("/admin/settings/{key}", summary="Update a system setting (admin only)")
def update_setting(key: str, value: str = Body(..., embed=True), current_user: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("system_settings").upsert({"key": key, "value": value, "updated_at": "now()"}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update setting.")
    return {"key": key, "value": value}
