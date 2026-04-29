from playwright.sync_api import Page, expect
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from settings import BASE_URL


class LoginPage:
    def __init__(self, page: Page):
        self.page = page

    def goto(self):
        self.page.goto(f"{BASE_URL}/pages/login.html")

    def login(self, email: str, password: str):
        self.page.get_by_test_id("input-email").fill(email)
        self.page.get_by_test_id("input-password").fill(password)
        self.page.get_by_test_id("btn-login").click()
        expect(self.page).to_have_url(f"{BASE_URL}/pages/home.html", timeout=8_000)

    def logout(self):
        self.page.get_by_test_id("nav-logout").click()
        expect(self.page).to_have_url(f"{BASE_URL}/pages/login.html", timeout=8_000)
