"""
Shared API helpers for all sanity test suites.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import httpx
from settings import BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_KEY


def get_token(email: str = ADMIN_EMAIL, password: str = ADMIN_PASSWORD) -> str:
    """Login via API and return the Bearer token."""
    resp = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def supabase_admin_headers() -> dict:
    """Headers for Supabase service-role admin API calls."""
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }


def find_supabase_user(email: str) -> dict | None:
    """Return the Supabase auth user dict for the given email, or None."""
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=supabase_admin_headers(),
        params={"page": 1, "per_page": 1000},
    )
    users = resp.json().get("users", [])
    return next((u for u in users if u.get("email") == email), None)


def delete_supabase_user(email: str) -> None:
    """Delete a Supabase Auth user by email (no-op if the user does not exist)."""
    user = find_supabase_user(email)
    if user:
        httpx.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}",
            headers=supabase_admin_headers(),
        )


def create_supabase_user(student: dict) -> None:
    """Create a user via the Supabase admin API (email pre-confirmed, no email sent)."""
    httpx.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=supabase_admin_headers(),
        json={
            "email":         student["email"],
            "password":      student["password"],
            "email_confirm": True,
            "user_metadata": {"full_name": student["name"]},
        },
    )
