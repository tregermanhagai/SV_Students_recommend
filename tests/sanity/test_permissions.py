"""
Sanity tests: user permissions — students cannot modify other users' content.
Prerequisites:
  - Local server running at http://127.0.0.1:8000  (cd backend && uvicorn main:app --reload)
  - The recommendation "The Shawshank Redemption 2" must exist (run test_create_recommendation first)
  - Credentials set correctly in tests/settings.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import httpx
from playwright.sync_api import Page, expect

from settings import BASE_URL
from helpers import get_token, delete_supabase_user, create_supabase_user
from pages.login_page import LoginPage

# Name of the recommendation created by test_create_recommendation.py
ADMIN_RECOMMENDATION_NAME = "The Shawshank Redemption 2"

STUDENT_1 = {
    "name":     "student_1",
    "email":    "student1@svcollege.co.il",
    "password": "test1234",
}


@pytest.mark.sanity
def test_student_cannot_delete_others_recommendations(page: Page):
    # ── Precondition: delete student_1 if already exists ─────────
    delete_supabase_user(STUDENT_1["email"])

    # ── Step 1: Create student_1 via admin API (no email sent → no rate limit)
    create_supabase_user(STUDENT_1)

    # ── Step 2: Login as student_1 via UI ────────────────────────
    login_page = LoginPage(page)
    login_page.goto()
    login_page.login(STUDENT_1["email"], STUDENT_1["password"])

    # ── Step 3: Get admin's recommendation ID via API ─────────────
    recs = httpx.get(f"{BASE_URL}/api/recommendations").json()
    admin_rec = next((r for r in recs if r["name"] == ADMIN_RECOMMENDATION_NAME), None)
    assert admin_rec, (
        f"Recommendation '{ADMIN_RECOMMENDATION_NAME}' not found — "
        "run test_create_recommendation.py first."
    )

    # ── Step 4: Open recommendation detail page ───────────────────
    page.goto(f"{BASE_URL}/pages/recommendation-detail.html?id={admin_rec['id']}")
    expect(page.get_by_test_id("detail-title")).to_have_text(ADMIN_RECOMMENDATION_NAME, timeout=8_000)

    # ── Step 5: Verify delete button is NOT visible for student_1 ─
    expect(page.get_by_test_id("btn-delete-recommendation")).not_to_be_visible()

    # ── Step 6: Verify API also rejects DELETE with 403 ───────────
    student_token = get_token(STUDENT_1["email"], STUDENT_1["password"])

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
