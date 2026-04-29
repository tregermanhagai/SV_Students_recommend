"""
Sanity test: admin logs in and creates a recommendation.
Prerequisites:
  - Local server running at http://127.0.0.1:8000  (cd backend && uvicorn main:app --reload)
  - Image file exists at C:\\Data\\Shawshank.png
  - Credentials set correctly in tests/settings.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import httpx
from playwright.sync_api import Page, expect

from settings import BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_KEY
from pages.login_page import LoginPage

IMAGE_PATH = Path(r"C:\Data\Shawshank.png")

RECOMMENDATION = {
    "category":     "Movie",
    "name":         "The Shawshank Redemption 2",
    "student_name": "hagai",
    "url":          "https://www.imdb.com/title/tt0111161/?ref_=mv_close",
    "description":  "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
}


def _get_token() -> str:
    """Login via API and return the Bearer token."""
    resp = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


STUDENT_1 = {
    "name":     "student_1",
    "email":    "student1@svcollege.co.il",   # underscore not valid in Supabase email
    "password": "test1234",
}


def _delete_existing(token: str) -> None:
    """Delete any existing recommendation with the same name."""
    headers = {"Authorization": f"Bearer {token}"}
    recs = httpx.get(f"{BASE_URL}/api/recommendations", headers=headers).json()
    for rec in recs:
        if rec["name"] == RECOMMENDATION["name"]:
            httpx.delete(f"{BASE_URL}/api/recommendations/{rec['id']}", headers=headers)


def _supabase_headers() -> dict:
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }


def _find_supabase_user(email: str) -> dict | None:
    """Return the Supabase auth user dict for the given email, or None."""
    resp = httpx.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=_supabase_headers(),
        params={"page": 1, "per_page": 1000},
    )
    users = resp.json().get("users", [])
    return next((u for u in users if u.get("email") == email), None)


def _delete_user_by_email(email: str) -> None:
    """Delete a Supabase Auth user by email using the service-role admin API."""
    user = _find_supabase_user(email)
    if user:
        httpx.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}",
            headers=_supabase_headers(),
        )


def _create_student_via_admin(student: dict) -> None:
    """Create a user directly via Supabase admin API.

    Using the admin API avoids triggering a confirmation email, which sidesteps
    Supabase's per-address email rate limit that fires when the same address is
    registered repeatedly during test runs.
    """
    httpx.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=_supabase_headers(),
        json={
            "email":         student["email"],
            "password":      student["password"],
            "email_confirm": True,
            "user_metadata": {"full_name": student["name"]},
        },
    )


@pytest.mark.sanity
def test_admin_creates_recommendation(page: Page):
    # ── Precondition: remove duplicate if it exists ───────────────
    token = _get_token()
    _delete_existing(token)

    # ── Step 1: Login via UI ──────────────────────────────────────
    page.goto(f"{BASE_URL}/pages/login.html")

    page.get_by_test_id("input-email").fill(ADMIN_EMAIL)
    page.get_by_test_id("input-password").fill(ADMIN_PASSWORD)
    page.get_by_test_id("btn-login").click()

    expect(page).to_have_url(f"{BASE_URL}/pages/home.html", timeout=8_000)

    # ── Step 2: Navigate to Add Recommendation ────────────────────
    page.get_by_test_id("nav-signup-recommendations").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/add-recommendation.html", timeout=5_000)

    # ── Step 3: Fill the form ─────────────────────────────────────
    page.get_by_test_id("select-category").select_option(RECOMMENDATION["category"])
    page.get_by_test_id("input-recommendation-name").fill(RECOMMENDATION["name"])
    page.get_by_test_id("input-recommender-name").fill(RECOMMENDATION["student_name"])
    page.get_by_test_id("input-website-link").fill(RECOMMENDATION["url"])
    page.get_by_test_id("textarea-description").fill(RECOMMENDATION["description"])

    assert IMAGE_PATH.exists(), f"Image not found: {IMAGE_PATH}"
    page.get_by_test_id("input-image").set_input_files(str(IMAGE_PATH))

    # ── Step 4: Submit ────────────────────────────────────────────
    page.get_by_test_id("btn-submit-recommendation").click()

    try:
        expect(page.get_by_test_id("success-message")).to_be_visible(timeout=8_000)
    except Exception:
        expect(page).to_have_url(f"{BASE_URL}/pages/home.html", timeout=8_000)

    # ── Step 5: Verify card appears on home feed ──────────────────
    page.goto(f"{BASE_URL}/pages/home.html")
    expect(page.get_by_test_id("section-feed")).to_be_visible(timeout=8_000)

    card = page.get_by_test_id("card-title").filter(has_text=RECOMMENDATION["name"]).first
    expect(card).to_be_visible()

    # ── Step 6: Open recommendation detail page ───────────────────
    card.click()
    expect(page.get_by_test_id("detail-title")).to_have_text(RECOMMENDATION["name"], timeout=8_000)

    # ── Step 7: Submit 5-star rating + comment ────────────────────
    # Radio inputs are hidden by CSS; click the visible label instead
    page.locator('label[for="star5"]').click()
    page.get_by_test_id("textarea-comment").fill("Amazing movie, highly recommended!")
    page.get_by_test_id("btn-submit-comment").click()

    # ── Step 8: Verify the comment appears in the list ────────────
    comment = page.get_by_test_id("comment-item").first
    expect(comment).to_be_visible(timeout=8_000)
    expect(page.get_by_test_id("comment-text").first).to_have_text("Amazing movie, highly recommended!")


@pytest.mark.sanity
def test_student_cannot_delete_others_recommendations(page: Page):
    # ── Precondition: delete student_1 if already exists ─────────
    _delete_user_by_email(STUDENT_1["email"])

    # ── Step 1: Create student_1 via admin API (no email sent → no rate limit)
    _create_student_via_admin(STUDENT_1)

    # ── Step 2: Login as student_1 via UI ────────────────────────
    login_page = LoginPage(page)
    login_page.goto()
    login_page.login(STUDENT_1["email"], STUDENT_1["password"])

    # ── Step 3: Get admin's recommendation ID via API ─────────────
    recs = httpx.get(f"{BASE_URL}/api/recommendations").json()
    admin_rec = next((r for r in recs if r["name"] == RECOMMENDATION["name"]), None)
    assert admin_rec, f"Admin recommendation '{RECOMMENDATION['name']}' not found — run the first test first."

    # ── Step 4: Open recommendation detail page ───────────────────
    page.goto(f"{BASE_URL}/pages/recommendation-detail.html?id={admin_rec['id']}")
    expect(page.get_by_test_id("detail-title")).to_have_text(RECOMMENDATION["name"], timeout=8_000)

    # ── Step 5: Verify delete button is NOT visible for student_1 ─
    expect(page.get_by_test_id("btn-delete-recommendation")).not_to_be_visible()

    # ── Step 6: Verify API also rejects DELETE with 403 ───────────
    student_token = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": STUDENT_1["email"], "password": STUDENT_1["password"]},
    ).json()["access_token"]

    api_resp = httpx.delete(
        f"{BASE_URL}/api/recommendations/{admin_rec['id']}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert api_resp.status_code == 403, (
        f"Expected 403 Forbidden but got {api_resp.status_code}: {api_resp.text}"
    )

    # ── Step 7: Logout ────────────────────────────────────────────
    login_page.logout()

    # student_1 is intentionally left in the system for manual testing
