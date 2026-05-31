import os

import pytest
from fastapi.testclient import TestClient

# Set before any saas_forge_backend imports so worker.py module-level
# _redis_settings() call doesn't fail on missing BACKEND_HMAC_SECRET.
os.environ.setdefault("BACKEND_HMAC_SECRET", "conftest-placeholder-32-bytes-xxxxx")

from saas_forge_backend.main import create_app  # noqa: E402


@pytest.fixture()
def app():
    return create_app()


@pytest.fixture()
def client(app):
    return TestClient(app)
