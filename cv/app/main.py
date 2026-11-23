import io
import secrets
from pathlib import Path

import yaml
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from PIL import Image

from app.config import settings
from app.inference import model_ready, predict_image

app = FastAPI(title="CV Service UMKM", version="0.1")

_ROOT = Path(__file__).resolve().parent.parent
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _auth(x_cv_token: str | None = Header(default=None)) -> None:
    expected = settings.CV_INTERNAL_TOKEN
    if expected and not (
        x_cv_token and secrets.compare_digest(x_cv_token.encode(), expected.encode())
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _error(code: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"code": code})


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "model_ready": model_ready()}


@app.get("/classes", dependencies=[Depends(_auth)])
def classes() -> dict[str, object]:
    path = _ROOT / settings.CV_CLEAN_DATA_DIR / "data.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return {"nc": data["nc"], "names": data["names"]}


@app.post("/scan", dependencies=[Depends(_auth)])
async def scan(file: UploadFile = File(...)):
    content_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    if content_type not in _ALLOWED_IMAGE_TYPES:
        return _error("INVALID_IMAGE", status.HTTP_400_BAD_REQUEST)

    data = await file.read()
    if len(data) > settings.CV_MAX_UPLOAD_BYTES:
        return _error("FILE_TOO_LARGE", status.HTTP_400_BAD_REQUEST)

    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
    except Exception:
        return _error("INVALID_IMAGE", status.HTTP_400_BAD_REQUEST)

    try:
        return predict_image(data)
    except Exception:
        return _error("INFERENCE_FAILED", status.HTTP_500_INTERNAL_SERVER_ERROR)
