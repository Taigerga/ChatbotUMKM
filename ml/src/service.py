import os
import threading
import uuid
from typing import Any

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

from src.metadata import MODELS, describe
from src.models import anomaly, churn, forecasting, mba, rfm
from src import tenant

TOKEN = os.getenv("ML_INTERNAL_TOKEN", "")
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()

app = FastAPI(title="ML Service UMKM", version="1.1")

TRAIN_FNS = {
    "forecasting": forecasting.train,
    "rfm": rfm.train,
    "mba": mba.train,
    "churn": churn.train,
    "anomaly": anomaly.train,
}


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
    models = {name: describe(name) for name in MODELS}
    summary = {
        "ready": sum(1 for m in models.values() if m["status"] == "ready"),
        "limited": sum(1 for m in models.values() if m["status"] == "limited"),
        "not_ready": sum(1 for m in models.values() if m["status"] == "not_ready"),
    }
    return {"scope": "global", "summary": summary, "models": models}


@app.get("/models")
def models(x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return {"scope": "global", "models": {name: describe(name) for name in MODELS}}


@app.post("/train/{model_name}")
def train(
    model_name: str,
    background_tasks: BackgroundTasks,
    x_ml_token: str | None = Header(default=None),
):
    _auth(x_ml_token)
    if model_name not in TRAIN_FNS:
        raise HTTPException(status_code=404, detail="model tidak dikenal")
    job_id = str(uuid.uuid4())
    with LOCK:
        JOBS[job_id] = {"id": job_id, "status": "running", "result": None, "error": None}
    background_tasks.add_task(_run_job, job_id, TRAIN_FNS[model_name])
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


class TenantTrainRequest(BaseModel):
    tenant_id: str
    daily: list[dict] = []
    customers: list[dict] = []
    transactions: list[list[str]] = []
    horizon: int = 7


@app.post("/tenant/train")
def tenant_train(req: TenantTrainRequest, background_tasks: BackgroundTasks, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    job_id = str(uuid.uuid4())
    with LOCK:
        JOBS[job_id] = {"id": job_id, "status": "running", "result": None, "error": None}
    background_tasks.add_task(_run_job, job_id, lambda: tenant.train_all(req.model_dump()))
    return {"job_id": job_id, "status": "running"}


@app.get("/tenant/results")
def tenant_results(tenant_id: str, x_ml_token: str | None = Header(default=None)):
    _auth(x_ml_token)
    return tenant.results(tenant_id)
