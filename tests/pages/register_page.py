from playwright.sync_api import Page, expect
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from settings import BASE_URL


class RegisterPage:
    def __init__(self, page: Page):
        self.page = page

    def goto(self, skip_captcha: bool = True):
        url = f"{BASE_URL}/pages/register.html"
        if skip_captcha:
            url += "?skip_captcha=true"
        self.page.goto(url)

    def register(self, name: str, email: str, password: str):
        self.page.get_by_test_id("input-name").fill(name)
        self.page.get_by_test_id("input-email").fill(email)
        self.page.get_by_test_id("input-password").fill(password)
        self.page.get_by_test_id("btn-register").click()

        # Wait for either a success or an error message to become visible
        self.page.wait_for_function(
            "() => {"
            "  const ok  = document.querySelector('[data-test=\"success-message\"]');"
            "  const err = document.querySelector('[data-test=\"error-message\"]');"
            "  const vis = el => el && getComputedStyle(el).display !== 'none' && el.textContent.trim() !== '';"
            "  return vis(ok) || vis(err);"
            "}",
            timeout=6_000,
        )

        error_el = self.page.get_by_test_id("error-message")
        if error_el.is_visible():
            raise AssertionError(f"Registration failed: {error_el.text_content().strip()}")

        expect(self.page.get_by_test_id("success-message")).to_be_visible()
        expect(self.page).to_have_url(
            f"{BASE_URL}/pages/login.html?registered=true", timeout=5_000
        )
