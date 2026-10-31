import os
import uuid
import threading
from fastapi import FastAPI, BackgroundTasks, HTTPException, Header
from pydantic import BaseModel
from typing import Any

from src.models import forecasting, rfm, mba, churn, anomaly

TOKEN = os.getenv("ML_INTERNAL_TOKEN", "")
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()

app = FastAPI(title="ML Service UMKM", version="1.0")


def _auth(token: str | None):
    if TOKEN and token != TOKEN:
        raise HTTPException(status_code=401, detail="token tidak valid")


class JobStatus(BaseModel):
    id: str
    status: str
    result: Any = None
    error: str | None = None


def _run_job(job_id: str, fn):
    try:
        result = fn()
        with LOCK:
            JOBS[job_id]["status"] = "done"
            JOBS[job_id]["result"] = result
    except Exception as exc:  # noqa: BLE001
        with LOCK:
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = str(exc)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/readiness")
def readiness(x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    import os as _os
    models = ["forecasting", "rfm", "mba", "churn", "anomaly"]
    out = {}
    for m in models:
        path = _os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), f"{m}.joblib")
        out[m] = _os.path.exists(path)
    return {"models": out}


@app.post("/train/{model_name}")
def train(model_name: str, background_tasks: BackgroundTasks, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    fns = {
        "forecasting": forecasting.train,
        "rfm": rfm.train,
        "mba": mba.train,
        "churn": churn.train,
        "anomaly": anomaly.train,
    }
    if model_name not in fns:
        raise HTTPException(status_code=404, detail="model tidak dikenal")
    job_id = str(uuid.uuid4())
    with LOCK:
        JOBS[job_id] = {"id": job_id, "status": "running", "result": None, "error": None}
    background_tasks.add_task(_run_job, job_id, fns[model_name])
    return {"job_id": job_id, "status": "running"}


@app.get("/jobs/{job_id}")
def job(job_id: str, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    with LOCK:
        j = JOBS.get(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="job tidak ditemukan")
    return j


class RFMRequest(BaseModel):
    customers: list[dict]


class BasketRequest(BaseModel):
    basket: list[str]
    top_n: int = 5


class ChurnRequest(BaseModel):
    customers: list[dict]


class AnomalyRequest(BaseModel):
    series: list[dict]


@app.post("/predict/forecasting")
def predict_forecasting(horizon: int = 7, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return {"predictions": forecasting.predict(horizon)}


@app.post("/predict/rfm")
def predict_rfm(req: RFMRequest, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return {"segments": rfm.predict(req.customers)}


@app.post("/predict/mba")
def predict_mba(req: BasketRequest, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return {"recommendations": mba.predict(req.basket, req.top_n)}


@app.post("/predict/churn")
def predict_churn(req: ChurnRequest, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return {"risks": churn.predict(req.customers)}


@app.post("/predict/anomaly")
def predict_anomaly(req: AnomalyRequest, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return {"anomalies": anomaly.predict(req.series)}