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

from settings import BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD

IMAGE_PATH = Path(r"C:\Data\Shawshank.png")

RECOMMENDATION = {
    "category":     "Movie",
    "name":         "The Shawshank Redemption 2",
    "student_name": "hagai",
    "url":          "https://www.imdb.com/title/tt0111161/?ref_=mv_close",
}


def _get_token() -> str:
    """Login via API and return the Bearer token."""
    resp = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def _delete_existing(token: str) -> None:
    """Delete any existing recommendation with the same name."""
    headers = {"Authorization": f"Bearer {token}"}
    recs = httpx.get(f"{BASE_URL}/api/recommendations", headers=headers).json()
    for rec in recs:
        if rec["name"] == RECOMMENDATION["name"]:
            httpx.delete(f"{BASE_URL}/api/recommendations/{rec['id']}", headers=headers)


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

    titles = page.get_by_test_id("card-title")
    expect(titles.filter(has_text=RECOMMENDATION["name"]).first).to_be_visible()
