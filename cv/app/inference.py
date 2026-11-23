import io
import json
from pathlib import Path

from PIL import Image

from app.config import settings
from app.schemas import Detection, ScanResponse

_ROOT = Path(__file__).resolve().parent.parent

_model = None


def load_model():
    global _model
    if _model is None:
        from ultralytics import YOLO  # loaded on first scan, not at import

        artifact = _ROOT / settings.CV_ARTIFACT_DIR / "cv-best.pt"
        _model = YOLO(str(artifact))
    return _model


def model_ready() -> bool:
    return _model is not None


def _model_version() -> str:
    path = _ROOT / settings.CV_ARTIFACT_DIR / "metadata.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))["model_version"]
    except (OSError, KeyError, TypeError, ValueError):
        return "unknown"


def predict_image(data: bytes, conf: float | None = None) -> ScanResponse:
    model = load_model()
    with Image.open(io.BytesIO(data)) as image:
        width, height = image.size
        results = model.predict(
            source=image,
            imgsz=settings.CV_IMG_SIZE,
            conf=conf or settings.CV_CONF,
            save=False,
            verbose=False,
        )

    detections = []
    boxes = results[0].boxes
    if boxes is not None:
        for xyxy, confidence, cls in zip(
            boxes.xyxy.tolist(), boxes.conf.tolist(), boxes.cls.tolist()
        ):
            class_id = int(cls)
            xmin, ymin, xmax, ymax = xyxy
            detections.append(
                Detection(
                    class_id=class_id,
                    class_name=model.names[class_id],
                    confidence=float(confidence),
                    xmin=float(xmin),
                    ymin=float(ymin),
                    xmax=float(xmax),
                    ymax=float(ymax),
                )
            )

    return ScanResponse(
        width=width,
        height=height,
        detections=detections,
        model_version=_model_version(),
    )
