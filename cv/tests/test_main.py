import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_and_classes(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "secret")
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "ok"
    assert client.get("/classes").status_code == 401
    r2 = client.get("/classes", headers={"x-cv-token": "secret"})
    assert r2.json()["nc"] == 1114
    assert len(r2.json()["names"]) == 1114
