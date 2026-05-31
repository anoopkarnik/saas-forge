import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.main import create_app


@pytest.fixture()
def app():
    return create_app()


@pytest.fixture()
def client(app):
    return TestClient(app)
