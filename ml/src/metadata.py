"""Metadata artefak model global.

Semua model di layanan ini dilatih dari dataset publik 150k (global),
bukan data tenant. Metadata disimpan di dalam file joblib masing-masing.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import joblib

MODELS = ["forecasting", "rfm", "mba", "churn", "anomaly"]

# Ambang sampel minimum agar model dianggap layak dipakai.
MIN_SAMPLES = {
    "forecasting": 180,
    "rfm": 200,
    "mba": 100,
    "churn": 300,
    "anomaly": 180,
}

GLOBAL_NOTE = "Model global dari dataset publik 150k, bukan data toko Anda."


def artifact_dir() -> str:
    return os.getenv("ARTIFACT_DIR", "./artifacts")


def artifact_path(model_name: str) -> str:
    return os.path.join(artifact_dir(), f"{model_name}.joblib")


def build_metadata(
    model_name: str,
    *,
    samples: int,
    metrics: dict[str, Any] | None = None,
    data_range: list[str] | None = None,
    limitations: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    meta: dict[str, Any] = {
        "model": model_name,
        "scope": "global",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": int(samples),
        "metrics": metrics or {},
        "data_range": data_range or [],
        "limitations": [GLOBAL_NOTE, *(limitations or [])],
    }
    if extra:
        meta.update(extra)
    return meta


def save_artifact(model_name: str, payload: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    os.makedirs(artifact_dir(), exist_ok=True)
    payload = {**payload, "metadata": metadata}
    joblib.dump(payload, artifact_path(model_name))
    return metadata


def read_artifact(model_name: str) -> dict[str, Any] | None:
    path = artifact_path(model_name)
    if not os.path.exists(path):
        return None
    try:
        return joblib.load(path)
    except Exception:  # noqa: BLE001 - artefak rusak dianggap tidak tersedia
        return None


def describe(model_name: str) -> dict[str, Any]:
    artifact = read_artifact(model_name)
    if artifact is None:
        return {
            "model": model_name,
            "status": "not_ready",
            "scope": "global",
            "available": False,
            "samples": 0,
            "metrics": {},
            "data_range": [],
            "limitations": [GLOBAL_NOTE],
            "reason": "Artefak model belum dilatih.",
        }

    meta = artifact.get("metadata", {})
    samples = int(meta.get("samples", 0))
    minimum = MIN_SAMPLES.get(model_name, 1)
    if samples <= 0:
        status = "not_ready"
        reason = "Metadata sampel tidak tersedia; latih ulang model."
    elif samples < minimum:
        status = "limited"
        reason = f"Sampel {samples} di bawah ambang nyaman {minimum}; hasil perlu dianggap indikatif."
    else:
        status = "ready"
        reason = f"Sampel {samples} memenuhi ambang minimum {minimum}."

    metrics = meta.get("metrics", {})
    if model_name == "forecasting":
        model_mape = metrics.get("model", {}).get("mape_pct")
        naive_mape = metrics.get("baseline_naive", {}).get("mape_pct")
        if model_mape is not None and naive_mape is not None and model_mape > naive_mape:
            status = "limited"
            reason = (
                f"MAPE model {model_mape}% lebih buruk dari baseline naive {naive_mape}%; "
                "ramalan belum layak dipakai sebagai target."
            )
    if model_name == "churn":
        pr_auc = metrics.get("pr_auc")
        if pr_auc is not None and pr_auc < 0.5:
            status = "limited"
            reason = (
                f"PR-AUC {pr_auc} di bawah 0.5 pada holdout berbasis waktu; "
                "skor risiko hanya indikatif."
            )

    return {
        "model": model_name,
        "status": status,
        "scope": meta.get("scope", "global"),
        "available": True,
        "samples": samples,
        "metrics": meta.get("metrics", {}),
        "data_range": meta.get("data_range", []),
        "limitations": meta.get("limitations", [GLOBAL_NOTE]),
        "trained_at": meta.get("trained_at"),
        "reason": reason,
    }
