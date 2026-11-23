import io
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from starlette.concurrency import run_in_threadpool

import app.main as main
from app.main import app
from app.schemas import ScanResponse


@pytest.fixture
def client():
    return TestClient(app)


def make_jpeg_bytes(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height)).save(buffer, format="JPEG")
    return buffer.getvalue()


def make_gif_bytes(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height)).save(buffer, format="GIF")
    return buffer.getvalue()


def test_health_and_classes(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "secret")
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "ok"
    assert client.get("/classes").status_code == 401
    r2 = client.get("/classes", headers={"x-cv-token": "secret"})
    assert r2.json()["nc"] == 1114
    assert len(r2.json()["names"]) == 1114


def test_health_reflects_cached_model(client, monkeypatch):
    monkeypatch.setattr("app.inference._model", object(), raising=False)
    assert client.get("/health").json()["model_ready"] is True


def test_scan_rejects_bad_file_and_accepts_image(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")
    monkeypatch.setattr(
        "app.main.predict_image",
        lambda data: ScanResponse(width=1, height=1, detections=[], model_version="test"),
    )

    bad = client.post("/scan", files={"file": ("a.txt", b"x", "text/plain")})
    assert bad.status_code == 400
    assert bad.json()["code"] == "INVALID_IMAGE"

    large = client.post(
        "/scan", files={"file": ("a.jpg", b"x" * (11 * 1024 * 1024), "image/jpeg")}
    )
    assert large.status_code == 400
    assert large.json()["code"] == "FILE_TOO_LARGE"

    r = client.post("/scan", files={"file": ("a.jpg", make_jpeg_bytes(2, 2), "image/jpeg")})
    assert r.status_code == 200
    assert r.json()["detections"] == []
    assert r.json()["model_version"] == "test"


def test_scan_rejects_corrupt_image_bytes(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")

    def must_not_run(data):
        pytest.fail("corrupt bytes must not reach inference")

    monkeypatch.setattr("app.main.predict_image", must_not_run)
    r = client.post("/scan", files={"file": ("a.png", b"not-an-image", "image/png")})

    assert r.status_code == 400
    assert r.json()["code"] == "INVALID_IMAGE"


def test_scan_rejects_allowed_mime_with_disallowed_pil_format(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")
    calls = []

    def fake_predict(data):
        calls.append(data)
        return ScanResponse(width=1, height=1, detections=[], model_version="test")

    monkeypatch.setattr("app.main.predict_image", fake_predict)
    r = client.post("/scan", files={"file": ("a.jpg", make_gif_bytes(4, 4), "image/jpeg")})

    assert calls == []
    assert r.status_code == 400
    assert r.json()["code"] == "INVALID_IMAGE"


def test_scan_offloads_inference_to_threadpool(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")
    calls = []
    real_offload = run_in_threadpool

    async def recording_offload(func, *args, **kwargs):
        calls.append((func, args))
        return await real_offload(func, *args, **kwargs)

    def fake_predict(data):
        return ScanResponse(width=1, height=1, detections=[], model_version="test")

    monkeypatch.setattr(main, "run_in_threadpool", recording_offload, raising=False)
    monkeypatch.setattr(main, "predict_image", fake_predict)
    payload = make_jpeg_bytes(2, 2)

    r = client.post("/scan", files={"file": ("a.jpg", payload, "image/jpeg")})

    assert r.status_code == 200
    assert len(calls) == 1
    assert calls[0][0] is fake_predict
    assert calls[0][1] == (payload,)


def test_scan_requires_token(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "secret")
    r = client.post("/scan", files={"file": ("a.jpg", make_jpeg_bytes(2, 2), "image/jpeg")})
    assert r.status_code == 401


def test_scan_maps_inference_failure_to_500(client, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")

    def boom(data):
        raise RuntimeError("model died")

    monkeypatch.setattr("app.main.predict_image", boom)
    r = client.post("/scan", files={"file": ("a.jpg", make_jpeg_bytes(2, 2), "image/jpeg")})

    assert r.status_code == 500
    assert r.json()["code"] == "INFERENCE_FAILED"


def test_classes_reports_data_not_ready_for_missing_or_incomplete_yaml(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")
    monkeypatch.setenv("CV_CLEAN_DATA_DIR", str(tmp_path))

    missing = client.get("/classes")
    assert missing.status_code == 503
    assert missing.json()["code"] == "DATA_NOT_READY"

    (tmp_path / "data.yaml").write_text("nc: 2\n", encoding="utf-8")
    incomplete = client.get("/classes")
    assert incomplete.status_code == 503
    assert incomplete.json()["code"] == "DATA_NOT_READY"


def test_scan_reports_model_not_ready_when_artifact_load_fails(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CV_INTERNAL_TOKEN", "")
    monkeypatch.setenv("CV_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setattr("app.inference._model", None, raising=False)

    class BrokenYOLO:
        def __init__(self, path):
            raise OSError(f"missing weights: {path}")

    monkeypatch.setitem(sys.modules, "ultralytics", SimpleNamespace(YOLO=BrokenYOLO))
    r = client.post("/scan", files={"file": ("a.jpg", make_jpeg_bytes(2, 2), "image/jpeg")})

    assert r.status_code == 503
    assert r.json()["code"] == "MODEL_NOT_READY"
