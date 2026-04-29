import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "sanity: sanity / smoke tests")


@pytest.fixture(scope="session", autouse=True)
def set_test_id_attribute(playwright):
    playwright.selectors.set_test_id_attribute("data-test")
