"""
API sanity tests for SV Students Recommend.

Tests the core API flow:
1. Login with admin credentials to get access_token
2. Create a recommendation with Bearer token authorization
3. Delete the created recommendation

Uses Playwright's APIRequestContext for async-ready HTTP requests.
All tests marked with @pytest.mark.api_tests and run in order (test_login → test_post → test_delete).
Shared state (_state dict) carries the access_token and rec_id between tests.
"""
import os
import pytest
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ["BASE_URL"]
_state: dict = {}


@pytest.fixture(scope="module")
def api_context(playwright):
    """
    Create a reusable Playwright APIRequestContext for HTTP requests.

    Scope: module — shared across all tests in this file.
    Sets BASE_URL as the default base for all requests (/auth/login, /api/recommendations, etc.).

    Yields:
        playwright.APIRequestContext: HTTP client with BASE_URL pre-configured.
    """
    api_context = playwright.request.new_context(base_url=BASE_URL)
    yield api_context
    api_context.dispose()


@pytest.mark.api_tests
def test_login(api_context):
    """
    Test user authentication endpoint.

    POSTs to /auth/login with ADMIN_EMAIL and ADMIN_PASSWORD from .env.
    Verifies response is successful (200) and contains access_token.
    Saves token to _state["token"] for use in subsequent tests.

    Args:
        api_context: Playwright APIRequestContext fixture.

    Raises:
        AssertionError: If login fails or access_token is missing.
    """
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
    """
    Test recommendation creation endpoint.

    POSTs to /api/recommendations with Bearer token from test_login.
    Sends multipart form data (name, category, recommender_name, description).
    Verifies response is successful and contains recommendation id.
    Saves id to _state["rec_id"] for use in test_delete_recommendation.

    Args:
        api_context: Playwright APIRequestContext fixture.

    Raises:
        AssertionError: If recommendation creation fails or id is missing.
    """
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
    """
    Test recommendation deletion endpoint.

    DELETEs /api/recommendations/{rec_id} using Bearer token and rec_id from test_post_recommendation.
    Verifies response is successful (200).
    Cleans up the test recommendation after creation.

    Args:
        api_context: Playwright APIRequestContext fixture.

    Raises:
        AssertionError: If recommendation deletion fails.
    """
    resp = api_context.delete(
        f"/api/recommendations/{_state['rec_id']}",
        headers={"Authorization": f"Bearer {_state['token']}"},
    )
    assert resp.ok, f"DELETE recommendation failed [{resp.status}]: {resp.text()}"
