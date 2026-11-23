import io
import sys
import threading
from types import SimpleNamespace

import numpy as np
from PIL import Image

from app.inference import load_model, model_ready, predict_image


def make_jpeg_bytes(width: int, height: int) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height)).save(buffer, format="JPEG")
    return buffer.getvalue()


class _Boxes:
    def __init__(self, detections):
        self.xyxy = np.asarray([d[2] for d in detections], dtype=float).reshape(-1, 4)
        self.conf = np.asarray([d[1] for d in detections], dtype=float)
        self.cls = np.asarray([d[0] for d in detections], dtype=float)


class FakeYOLO:
    def __init__(self, detections=(), names=None):
        self.detections = list(detections)
        self.names = names if names is not None else {0: "Teh Botol", 7: "Kopi Susu"}
        self.predict_kwargs = None

    def predict(self, **kwargs):
        self.predict_kwargs = kwargs
        return [SimpleNamespace(boxes=_Boxes(self.detections))]


def test_predict_image_maps_boxes_and_confidence(monkeypatch):
    fake = FakeYOLO(detections=[(7, 0.91, [10, 20, 30, 40])])
    monkeypatch.setattr("app.inference.load_model", lambda: fake)

    result = predict_image(make_jpeg_bytes(100, 80), conf=0.25)

    assert result.width == 100 and result.height == 80
    assert result.detections[0].class_id == 7
    assert result.detections[0].class_name == fake.names[7]
    assert result.detections[0].confidence == 0.91
    assert result.detections[0].xmin == 10
    assert result.detections[0].ymin == 20
    assert result.detections[0].xmax == 30
    assert result.detections[0].ymax == 40
    assert fake.predict_kwargs["source"].size == (100, 80)
    assert fake.predict_kwargs["imgsz"] == 640
    assert fake.predict_kwargs["conf"] == 0.25
    assert fake.predict_kwargs["save"] is False
    assert fake.predict_kwargs["verbose"] is False


def test_predict_image_returns_empty_detections_and_default_conf(tmp_path, monkeypatch):
    monkeypatch.setenv("CV_ARTIFACT_DIR", str(tmp_path))
    fake = FakeYOLO()
    monkeypatch.setattr("app.inference.load_model", lambda: fake)

    result = predict_image(make_jpeg_bytes(4, 4))

    assert result.detections == []
    assert result.model_version == "unknown"
    assert fake.predict_kwargs["conf"] == 0.25


def test_predict_image_reads_model_version_from_artifact_metadata(tmp_path, monkeypatch):
    (tmp_path / "metadata.json").write_text('{"model_version":"cv-v1"}', encoding="utf-8")
    monkeypatch.setenv("CV_ARTIFACT_DIR", str(tmp_path))
    fake = FakeYOLO()
    monkeypatch.setattr("app.inference.load_model", lambda: fake)

    result = predict_image(make_jpeg_bytes(4, 4), conf=0.5)

    assert result.model_version == "cv-v1"
    assert fake.predict_kwargs["conf"] == 0.5


def test_load_model_loads_once_from_artifact_and_caches(tmp_path, monkeypatch):
    loaded_paths = []

    class FakeYOLOClass:
        def __init__(self, path):
            loaded_paths.append(path)

    monkeypatch.setitem(sys.modules, "ultralytics", SimpleNamespace(YOLO=FakeYOLOClass))
    monkeypatch.setenv("CV_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setattr("app.inference._model", None, raising=False)

    first = load_model()

    assert first is load_model()
    assert loaded_paths == [str(tmp_path / "cv-best.pt")]


def test_load_model_guards_first_load_race(tmp_path, monkeypatch):
    started = threading.Event()
    release = threading.Event()
    loaded = []

    class BlockingYOLO:
        def __init__(self, path):
            loaded.append(path)
            started.set()
            if not release.wait(timeout=5):
                raise TimeoutError("model load never released")

    monkeypatch.setitem(sys.modules, "ultralytics", SimpleNamespace(YOLO=BlockingYOLO))
    monkeypatch.setenv("CV_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setattr("app.inference._model", None, raising=False)

    results = []
    errors = []

    def load():
        try:
            results.append(load_model())
        except BaseException as exc:
            errors.append(exc)

    first = threading.Thread(target=load)
    second = threading.Thread(target=load)
    first.start()
    try:
        assert started.wait(timeout=5)
        second.start()
        second.join(timeout=0.1)
        assert second.is_alive()
    finally:
        release.set()
        first.join(timeout=5)
        second.join(timeout=5)

    assert not errors
    assert loaded == [str(tmp_path / "cv-best.pt")]
    assert len(results) == 2 and results[0] is results[1]


def test_model_ready_tracks_cached_model(monkeypatch):
    monkeypatch.setattr("app.inference._model", None, raising=False)
    assert model_ready() is False
    monkeypatch.setattr("app.inference._model", object())
    assert model_ready() is True
