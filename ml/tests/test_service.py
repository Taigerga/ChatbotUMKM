import os

from fastapi.testclient import TestClient

os.environ.setdefault("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "data"))
os.environ.setdefault("ARTIFACT_DIR", os.path.join(os.path.dirname(__file__), "..", "artifacts_test"))
os.environ.setdefault("ML_INTERNAL_TOKEN", "")

from src.service import app

client = TestClient(app)

MODELS = ["forecasting", "rfm", "mba", "churn", "anomaly"]


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_readiness_shape():
    res = client.get("/readiness")
    assert res.status_code == 200
    body = res.json()
    assert body["scope"] == "global"
    assert set(body["models"]) == set(MODELS)
    for model in body["models"].values():
        assert model["status"] in {"ready", "limited", "not_ready"}
        assert "reason" in model


def test_models_endpoint_lists_all_models():
    res = client.get("/models")
    assert res.status_code == 200
    body = res.json()
    assert set(body["models"]) == set(MODELS)
    for name, model in body["models"].items():
        assert model["model"] == name
        assert model["scope"] == "global"
        assert isinstance(model["limitations"], list)
