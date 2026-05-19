"""
Sanity test: registration flow — register a new student via the UI,
then delete their account from the profile page, leaving the environment clean.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from playwright.sync_api import Page, expect

from settings import BASE_URL
from helpers import delete_supabase_user
from pages.login_page import LoginPage

NEW_STUDENT = {
    "name":     "Sanity Test Student",
    "email":    "sanity.register@example.com",
    "password": "test1234",
}


@pytest.mark.sanity
def test_register_new_student_and_delete_profile(page: Page):
    # ── Precondition: remove any leftover account ─────────────────
    delete_supabase_user(NEW_STUDENT["email"])

    # ── Step 1: Register via UI ───────────────────────────────────
    page.goto(f"{BASE_URL}/pages/register.html")
    expect(page.get_by_test_id("form-register")).to_be_visible(timeout=8_000)

    page.get_by_test_id("input-name").fill(NEW_STUDENT["name"])
    page.get_by_test_id("input-email").fill(NEW_STUDENT["email"])
    page.get_by_test_id("input-password").fill(NEW_STUDENT["password"])
    page.get_by_test_id("btn-register").click()

    # ── Step 2: Verify success and redirect to login ──────────────
    expect(page.get_by_test_id("success-message")).to_be_visible(timeout=10_000)
    expect(page).to_have_url(
        f"{BASE_URL}/pages/login.html?registered=true", timeout=8_000
    )

    # ── Step 3: Login with the new account ───────────────────────
    login_page = LoginPage(page)
    login_page.login(NEW_STUDENT["email"], NEW_STUDENT["password"])

    # ── Step 4: Navigate to profile and delete account ────────────
    page.goto(f"{BASE_URL}/pages/profile.html")
    expect(page.get_by_test_id("profile-email")).to_have_text(
        NEW_STUDENT["email"], timeout=8_000
    )

    page.get_by_test_id("btn-delete-account").click()
    expect(page.get_by_test_id("delete-confirm")).to_be_visible()
    page.get_by_test_id("btn-confirm-delete").click()

    # ── Step 5: Verify redirect to login after deletion ───────────
    expect(page).to_have_url(f"{BASE_URL}/pages/login.html", timeout=8_000)
