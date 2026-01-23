"""
Test configuration and fixtures for pytest.
"""
import pytest
import httpx
import os

# Get API URL from environment
API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001")

@pytest.fixture
def api_url():
    """Return the API base URL."""
    return API_URL

@pytest.fixture
def client():
    """HTTP client for API testing."""
    return httpx.Client(base_url=API_URL, timeout=30.0)

@pytest.fixture
async def async_client():
    """Async HTTP client for API testing."""
    async with httpx.AsyncClient(base_url=API_URL, timeout=30.0) as client:
        yield client
