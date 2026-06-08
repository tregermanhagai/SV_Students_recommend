import os
import pytest
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ["BASE_URL"]
_state: dict = {}


@pytest.fixture(scope="module")
def api_context(playwright):
    # api_context is a Playwright APIRequestContext — a reusable HTTP client with BASE_URL pre-set, shared across all tests in this module
    api_context = playwright.request.new_context(base_url=BASE_URL)
    yield api_context
    api_context.dispose()


@pytest.mark.api_tests
def test_login(api_context):
    resp = api_context.post("/auth/login", data={
        "email": os.environ["ADMIN_EMAIL"],
        "password": os.environ["ADMIN_PASSWORD"],
    })
    assert resp.ok, f"Login failed [{resp.status}]: {resp.text()}"
    body = resp.json()
    assert "access_token" in body, f"No access_token in response: {body}"
    _state["token"] = body["access_token"]


@pytest.mark.api_tests
def test_post_recommendation(api_context):
    resp = api_context.post(
        "/api/recommendations",
        headers={"Authorization": f"Bearer {_state['token']}"},
        multipart={
            "name": "Sanity Test — Pytest Playwright",
            "category": "Book",
            "recommender_name": "Pytest Runner",
            "description": "Created by API sanity test — auto-deleted",
        },
    )
    assert resp.ok, f"POST recommendation failed [{resp.status}]: {resp.text()}"
    body = resp.json()
    assert "id" in body, f"No id in response: {body}"
    _state["rec_id"] = body["id"]


@pytest.mark.api_tests
def test_delete_recommendation(api_context):
    resp = api_context.delete(
        f"/api/recommendations/{_state['rec_id']}",
        headers={"Authorization": f"Bearer {_state['token']}"},
    )
    assert resp.ok, f"DELETE recommendation failed [{resp.status}]: {resp.text()}"
