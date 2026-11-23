import secrets
from pathlib import Path

import yaml
from fastapi import Depends, FastAPI, Header, HTTPException, status

from app.config import settings

app = FastAPI(title="CV Service UMKM", version="0.1")

_ROOT = Path(__file__).resolve().parent.parent


def _auth(x_cv_token: str | None = Header(default=None)) -> None:
    expected = settings.CV_INTERNAL_TOKEN
    if expected and not (
        x_cv_token and secrets.compare_digest(x_cv_token.encode(), expected.encode())
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, object]:
    # ponytail: static False until Task 3 wires load_model into the service.
    return {"status": "ok", "model_ready": False}


@app.get("/classes", dependencies=[Depends(_auth)])
def classes() -> dict[str, object]:
    path = _ROOT / settings.CV_CLEAN_DATA_DIR / "data.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return {"nc": data["nc"], "names": data["names"]}
