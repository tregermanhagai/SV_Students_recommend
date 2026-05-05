"""
Sanity tests: shopping cart — add items, modify quantities, remove, persist.
Prerequisites:
  - Local server running at http://127.0.0.1:8000  (cd backend && uvicorn main:app --reload)
  - Credentials set correctly in tests/settings.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import httpx
from playwright.sync_api import Page, expect

from settings import BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
from helpers import get_token
from pages.login_page import LoginPage


# ── Cart API helpers ──────────────────────────────────────────────────────────

def _clear_cart(token: str) -> None:
    resp = httpx.put(
        f"{BASE_URL}/api/cart",
        json={"items": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Failed to clear cart: {resp.text}"


def _set_cart(token: str, items: list) -> None:
    resp = httpx.put(
        f"{BASE_URL}/api/cart",
        json={"items": items},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, f"Failed to set cart: {resp.text}"


# ── Fixture ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def store_page(page: Page):
    """Log in as admin, clear the cart, land on the store page. Clean up after."""
    token = get_token()
    _clear_cart(token)

    login_page = LoginPage(page)
    login_page.goto()
    login_page.login(ADMIN_EMAIL, ADMIN_PASSWORD)

    page.goto(f"{BASE_URL}/pages/store.html")
    page.wait_for_load_state("networkidle")

    yield page, token

    _clear_cart(token)


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.sanity
def test_cart_icon_hidden_on_empty_cart(store_page):
    """FR-2: Cart icon must be invisible when the cart is empty."""
    page, _ = store_page
    expect(page.get_by_test_id("nav-cart")).to_be_hidden()


@pytest.mark.sanity
def test_add_tshirt_shows_cart_icon_with_badge(store_page):
    """FR-1, FR-2, UI-1: Clicking 'Add to cart' on T-shirt shows the cart icon with badge = 1."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()

    expect(page.get_by_test_id("nav-cart")).to_be_visible(timeout=5_000)
    expect(page.get_by_test_id("cart-badge")).to_have_text("1")


@pytest.mark.sanity
def test_cart_shows_correct_tshirt_details(store_page):
    """UI-2: Cart displays correct name, unit price, quantity, subtotal, and grand total."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("nav-cart")).to_be_visible(timeout=5_000)
    page.get_by_test_id("nav-cart").click()

    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)
    expect(page.get_by_test_id("cart-item-tshirt")).to_be_visible()
    expect(page.get_by_test_id("cart-item-name-tshirt")).to_have_text("T-Shirt with SV College Logo")
    expect(page.get_by_test_id("cart-item-price-tshirt")).to_have_text("50 NIS each")
    expect(page.get_by_test_id("cart-qty-tshirt")).to_have_text("1")
    expect(page.get_by_test_id("cart-subtotal-tshirt")).to_have_text("50 NIS")
    expect(page.get_by_test_id("cart-total")).to_have_text("50 NIS")


@pytest.mark.sanity
def test_add_both_products_updates_badge_and_total(store_page):
    """FR-3, FR-7: Adding T-shirt and Cup produces 2 line items; total = 70 NIS."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("1", timeout=5_000)

    page.get_by_test_id("btn-add-cup").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("2", timeout=5_000)

    page.get_by_test_id("nav-cart").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)

    expect(page.get_by_test_id("cart-item-tshirt")).to_be_visible()
    expect(page.get_by_test_id("cart-item-cup")).to_be_visible()
    expect(page.get_by_test_id("cart-total")).to_have_text("70 NIS")


@pytest.mark.sanity
def test_same_product_merges_into_one_line(store_page):
    """FR-3: Clicking 'Add to cart' twice on the same product increments qty — not a new row."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("1", timeout=5_000)

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("2", timeout=5_000)

    page.get_by_test_id("nav-cart").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)

    expect(page.get_by_test_id("cart-item-tshirt")).to_be_visible()
    expect(page.get_by_test_id("cart-qty-tshirt")).to_have_text("2")
    expect(page.get_by_test_id("cart-subtotal-tshirt")).to_have_text("100 NIS")
    expect(page.get_by_test_id("cart-total")).to_have_text("100 NIS")


@pytest.mark.sanity
def test_quantity_increment_and_decrement_in_cart(store_page):
    """FR-4, FR-7: + / - controls update qty, subtotal, and grand total in real time."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("nav-cart")).to_be_visible(timeout=5_000)
    page.get_by_test_id("nav-cart").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)

    # 1 → 3
    page.get_by_test_id("btn-qty-plus-tshirt").click()
    page.get_by_test_id("btn-qty-plus-tshirt").click()
    expect(page.get_by_test_id("cart-qty-tshirt")).to_have_text("3", timeout=5_000)
    expect(page.get_by_test_id("cart-subtotal-tshirt")).to_have_text("150 NIS")
    expect(page.get_by_test_id("cart-total")).to_have_text("150 NIS")

    # 3 → 2
    page.get_by_test_id("btn-qty-minus-tshirt").click()
    expect(page.get_by_test_id("cart-qty-tshirt")).to_have_text("2", timeout=5_000)
    expect(page.get_by_test_id("cart-subtotal-tshirt")).to_have_text("100 NIS")
    expect(page.get_by_test_id("cart-total")).to_have_text("100 NIS")


@pytest.mark.sanity
def test_quantity_ceiling_enforced_at_10(store_page):
    """FR-5: Qty cannot exceed 10 — the + button is a no-op at the ceiling."""
    page, token = store_page

    # Seed 9 units via API so we only need one UI click to reach 10
    _set_cart(token, [
        {"product": "tshirt", "name": "T-Shirt with SV College Logo", "price": 50, "quantity": 9}
    ])

    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.get_by_test_id("nav-cart")).to_be_visible(timeout=5_000)
    page.get_by_test_id("nav-cart").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)

    # 9 → 10 (allowed)
    page.get_by_test_id("btn-qty-plus-tshirt").click()
    expect(page.get_by_test_id("cart-qty-tshirt")).to_have_text("10", timeout=5_000)

    # 10 → 11 (blocked — qty stays at 10)
    page.get_by_test_id("btn-qty-plus-tshirt").click()
    expect(page.get_by_test_id("cart-qty-tshirt")).to_have_text("10")


@pytest.mark.sanity
def test_remove_item_updates_total_and_hides_icon_when_empty(store_page):
    """FR-6, FR-7: Removing items updates the total; removing the last item hides the cart icon."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("1", timeout=5_000)
    page.get_by_test_id("btn-add-cup").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("2", timeout=5_000)

    page.get_by_test_id("nav-cart").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)

    # Remove T-shirt — total drops from 70 to 20
    page.get_by_test_id("btn-remove-tshirt").click()
    expect(page.get_by_test_id("cart-item-tshirt")).to_be_hidden(timeout=5_000)
    expect(page.get_by_test_id("cart-item-cup")).to_be_visible()
    expect(page.get_by_test_id("cart-total")).to_have_text("20 NIS")

    # Remove Cup — cart is now empty
    page.get_by_test_id("btn-remove-cup").click()
    expect(page.get_by_test_id("cart-empty")).to_be_visible(timeout=5_000)
    expect(page.get_by_test_id("nav-cart")).to_be_hidden()


@pytest.mark.sanity
def test_cart_persists_after_logout_and_login(store_page):
    """PR-1, PR-2: Cart contents survive a full logout / login cycle."""
    page, _ = store_page

    page.get_by_test_id("btn-add-tshirt").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("1", timeout=5_000)
    page.get_by_test_id("btn-add-cup").click()
    expect(page.get_by_test_id("cart-badge")).to_have_text("2", timeout=5_000)

    login_page = LoginPage(page)
    login_page.logout()
    login_page.login(ADMIN_EMAIL, ADMIN_PASSWORD)

    page.goto(f"{BASE_URL}/pages/store.html")
    page.wait_for_load_state("networkidle")

    expect(page.get_by_test_id("nav-cart")).to_be_visible(timeout=8_000)
    expect(page.get_by_test_id("cart-badge")).to_have_text("2")

    page.get_by_test_id("nav-cart").click()
    expect(page).to_have_url(f"{BASE_URL}/pages/cart.html", timeout=5_000)
    expect(page.get_by_test_id("cart-item-tshirt")).to_be_visible()
    expect(page.get_by_test_id("cart-item-cup")).to_be_visible()
    expect(page.get_by_test_id("cart-total")).to_have_text("70 NIS")
