"""Pelatihan model per-toko (tenant) dari data yang dikirim API.

Berbeda dari model global (dataset publik 150k), model di sini dihitung
murni dari data toko yang dikirimkan: deret penjualan harian, agregat
RFM pelanggan, dan basket transaksi. Artefak disimpan per tenant di
ARTIFACT_DIR/tenants/{tenant_id}/.
"""

from __future__ import annotations

import os
from collections import Counter
from datetime import datetime, timezone
from itertools import combinations
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import average_precision_score, accuracy_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

MODELS = ["forecasting", "rfm", "mba", "churn", "anomaly"]

# Kunci output yang ikut disimpan di artefak agar bisa dibaca ulang tanpa latih ulang.
RESULT_KEYS = {"predictions", "segments", "summary", "segment_names", "rules", "risks", "series"}

# Ambang sampel minimum per model agar dianggap "ready" (selaras dataReadiness API).
MIN_SAMPLES = {
    "forecasting": 30,
    "rfm": 10,
    "mba": 30,
    "churn": 10,
    "anomaly": 14,
}

MAX_RULES = 100
CHURN_INACTIVE_DAYS = 90


def tenant_dir(tenant_id: str) -> str:
    return os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), "tenants", tenant_id)


def _artifact_path(tenant_id: str, model_name: str) -> str:
    return os.path.join(tenant_dir(tenant_id), f"{model_name}.joblib")


def _status(model_name: str, samples: int) -> tuple[str, str]:
    minimum = MIN_SAMPLES.get(model_name, 1)
    if samples <= 0:
        return "not_ready", "Data tidak tersedia untuk model ini."
    if samples < minimum:
        return "limited", f"Sampel {samples} di bawah ambang {minimum}; hasil indikatif."
    return "ready", f"Sampel {samples} memenuhi ambang {minimum}."


def _save(tenant_id: str, model_name: str, payload: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    os.makedirs(tenant_dir(tenant_id), exist_ok=True)
    joblib.dump({"params": payload, "metadata": metadata}, _artifact_path(tenant_id, model_name))
    return metadata


# ---------------------------------------------------------------- forecasting

def _train_forecasting(tenant_id: str, daily: list[dict], horizon: int) -> dict[str, Any]:
    frame = pd.DataFrame(daily)
    if frame.empty:
        raise ValueError("Deret penjualan harian kosong.")
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values("date").reset_index(drop=True)
    frame["t"] = np.arange(len(frame))
    frame = frame.fillna({"value": 0})

    split = max(len(frame) - 30, 1)
    train_df, test_df = frame.iloc[:split], frame.iloc[split:]
    holdout = LinearRegression().fit(train_df[["t"]], train_df["value"])
    actual = test_df["value"].to_numpy()
    predicted = holdout.predict(test_df[["t"]])

    def metrics(a: np.ndarray, p: np.ndarray) -> dict:
        mae = float(np.mean(np.abs(a - p))) if len(a) else 0.0
        denom = np.where(a == 0, 1.0, a)
        mape = float(np.mean(np.abs((a - p) / denom)) * 100) if len(a) else 0.0
        return {"mae": round(mae, 2), "mape_pct": round(mape, 2)}

    metrics_out = {
        "holdout_days": int(len(test_df)),
        "model": metrics(actual, predicted),
        "baseline_naive": metrics(actual, np.repeat(train_df["value"].to_numpy()[-1], len(test_df))),
    }

    model = LinearRegression().fit(frame[["t"]], frame["value"])
    last_date = frame["date"].max()
    predictions = []
    for i in range(1, horizon + 1):
        pred = float(model.predict(pd.DataFrame({"t": [len(frame) - 1 + i]}))[0])
        predictions.append({"date": str((last_date + pd.Timedelta(days=i)).date()), "value": round(max(pred, 0), 2)})

    metadata = {
        "model": "forecasting",
        "scope": "tenant",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": int(len(frame)),
        "metrics": metrics_out,
        "data_range": [str(frame["date"].min().date()), str(frame["date"].max().date())],
        "limitations": [
            "Regresi linear pada indeks hari: tidak menangkap musiman atau hari libur.",
            "Evaluasi memakai 30 hari terakhir sebagai holdout.",
        ],
    }
    _save(tenant_id, "forecasting", {"model": model, "last_t": int(frame["t"].max()), "last_date": str(last_date.date()), "predictions": predictions}, metadata)
    return {**metadata, "predictions": predictions}


# ------------------------------------------------------------------------ rfm

def _name_clusters(summary: pd.DataFrame) -> dict[int, str]:
    summary = summary.copy()
    summary["recency_rank"] = summary["recency"].rank(ascending=True)
    summary["monetary_rank"] = summary["monetary"].rank(ascending=False)
    names: dict[int, str] = {}
    for _, row in summary.iterrows():
        recent = row["recency_rank"] <= 2
        valuable = row["monetary_rank"] <= 2
        if recent and valuable:
            name = "Champion"
        elif recent:
            name = "Loyal"
        elif valuable:
            name = "At Risk"
        else:
            name = "Lost"
        cluster = int(row["cluster"])
        if name in names.values():
            name = f"Segmen {cluster}"
        names[cluster] = name
    return names


def _train_rfm(tenant_id: str, customers: list[dict]) -> dict[str, Any]:
    frame = pd.DataFrame(customers)
    X = frame[["recency", "frequency", "monetary"]].to_numpy(dtype=float)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    best_k, best_score, best_model, best_labels = 2, -1.0, None, None
    scores: dict[int, dict] = {}
    sample = min(len(Xs), 5000)
    for k in range(2, min(7, len(frame))):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(Xs)
        score = float(silhouette_score(Xs, labels, sample_size=sample, random_state=42))
        scores[k] = {"silhouette": round(score, 4)}
        if score > best_score:
            best_k, best_score, best_model, best_labels = k, score, km, labels
    if best_model is None:
        best_k, best_model, best_labels = 2, KMeans(n_clusters=2, random_state=42, n_init=10).fit(Xs), None
        best_labels = best_model.labels_

    frame["cluster"] = best_labels
    summary = (
        frame.groupby("cluster")
        .agg(customers=("customer_id", "count"), recency=("recency", "mean"), freq=("frequency", "mean"), monetary=("monetary", "mean"))
        .reset_index()
    )
    names = _name_clusters(summary)
    summary["segment"] = summary["cluster"].map(names)
    segments = [
        {
            "customer_id": c["customer_id"],
            "name": c.get("name", c["customer_id"]),
            "cluster": int(label),
            "segment": names[int(label)],
            "recency": int(c["recency"]),
            "frequency": int(c["frequency"]),
            "monetary": round(float(c["monetary"]), 2),
        }
        for c, label in zip(frame.to_dict(orient="records"), best_labels)
    ]
    metadata = {
        "model": "rfm",
        "scope": "tenant",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": int(len(frame)),
        "metrics": {"chosen_k": int(best_k), "candidates": scores},
        "limitations": [
            "K dipilih via silhouette; dengan data toko kecil, segmen bisa tidak stabil.",
            "Label segmen adalah aturan peringkat, bukan validasi bisnis.",
        ],
    }
    _save(tenant_id, "rfm", {"scaler": scaler, "model": best_model, "segment_names": {str(k): v for k, v in names.items()}}, metadata)
    return {
        **metadata,
        "segments": segments,
        "summary": summary.to_dict(orient="records"),
        "segment_names": {str(k): v for k, v in names.items()},
    }


# ------------------------------------------------------------------------ mba

def _train_mba(tenant_id: str, transactions: list[list[str]]) -> dict[str, Any]:
    baskets = [sorted({str(item).strip() for item in basket if str(item).strip()}) for basket in transactions]
    baskets = [b for b in baskets if len(b) >= 2]
    total = len(baskets)
    if total == 0:
        raise ValueError("Tidak ada transaksi multi-item untuk aturan asosiasi.")

    item_counts: Counter = Counter()
    pair_counts: Counter = Counter()
    for basket in baskets:
        for item in basket:
            item_counts[item] += 1
        for a, b in combinations(basket, 2):
            pair_counts[tuple(sorted((a, b)))] += 1

    min_support = max(3 / total, 0.01)
    rules = []
    for (a, b), count in pair_counts.items():
        support = count / total
        if support < min_support:
            continue
        conf_ab = count / item_counts[a]
        conf_ba = count / item_counts[b]
        lift = support / ((item_counts[a] / total) * (item_counts[b] / total))
        rules.append({"antecedent": a, "consequent": b, "support": round(support, 4), "confidence": round(conf_ab, 4), "lift": round(lift, 4)})
        rules.append({"antecedent": b, "consequent": a, "support": round(support, 4), "confidence": round(conf_ba, 4), "lift": round(lift, 4)})
    rules.sort(key=lambda r: (r["lift"], r["confidence"]), reverse=True)
    rules = rules[:MAX_RULES]

    metadata = {
        "model": "mba",
        "scope": "tenant",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": total,
        "metrics": {"baskets": total, "rules_kept": len(rules), "min_support": round(min_support, 4)},
        "limitations": [
            "Aturan hanya berbasis pasangan produk; kombinasi 3+ item tidak dihitung.",
            "Asosiasi bukan sebab-akibat.",
        ],
    }
    _save(tenant_id, "mba", {"rules": rules}, metadata)
    return {**metadata, "rules": rules}


# ---------------------------------------------------------------------- churn

def _train_churn(tenant_id: str, customers: list[dict]) -> dict[str, Any]:
    frame = pd.DataFrame(customers)
    frame["churn"] = (frame["days_since_last"] > CHURN_INACTIVE_DAYS).astype(int)
    frame["avg_order_value"] = frame["total_spend"] / frame["order_count"].clip(lower=1)
    features = ["order_count", "total_spend", "avg_order_value"]
    X = frame[features].fillna(0).to_numpy(dtype=float)
    y = frame["churn"].to_numpy()

    metrics: dict[str, Any] = {}
    if len(set(y)) < 2 or len(frame) < 10:
        model = LogisticRegression(max_iter=1000).fit(X, y)
        metrics = {"note": "Data tidak cukup untuk holdout; metrik tidak dihitung."}
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        if len(set(y_test)) < 2:
            X_train, X_test, y_train, y_test = X, X, y, y
        holdout = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X_train, y_train)
        proba = holdout.predict_proba(X_test)[:, 1]
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, (proba >= 0.5).astype(int))), 4),
            "pr_auc": round(float(average_precision_score(y_test, proba)), 4),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test)),
            "churn_rate": round(float(y.mean()), 4),
        }

    model = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X, y)
    proba_all = model.predict_proba(X)[:, 1]
    risks = [
        {"customer_id": c["customer_id"], "name": c.get("name", c["customer_id"]), "churn_risk": round(float(p), 4)}
        for c, p in zip(frame.to_dict(orient="records"), proba_all)
    ]
    risks.sort(key=lambda r: r["churn_risk"], reverse=True)
    metadata = {
        "model": "churn",
        "scope": "tenant",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": int(len(frame)),
        "metrics": metrics,
        "limitations": [
            f"Label churn = tidak transaksi {CHURN_INACTIVE_DAYS} hari; definisi ini diterapkan dari data Anda sendiri.",
            "Fitur dari snapshot tunggal, bukan split waktu ketat; angka hanya indikatif.",
        ],
    }
    _save(tenant_id, "churn", {"model": model, "features": features}, metadata)
    return {**metadata, "risks": risks}


# -------------------------------------------------------------------- anomaly

def _robust_stats(values: np.ndarray) -> tuple[float, float]:
    median = float(np.median(values))
    mad = float(np.median(np.abs(values - median)))
    scale = mad * 1.4826
    if scale <= 0:
        scale = float(np.std(values)) or 1.0
    return median, scale


def _train_anomaly(tenant_id: str, daily: list[dict]) -> dict[str, Any]:
    frame = pd.DataFrame(daily)
    frame["date"] = pd.to_datetime(frame["date"])
    frame["weekday"] = frame["date"].dt.day_of_week
    weekday_stats: dict[str, dict] = {}
    for weekday, group in frame.groupby("weekday"):
        median, scale = _robust_stats(group["value"].to_numpy())
        weekday_stats[str(int(weekday))] = {"median": round(median, 2), "scale": round(scale, 2), "days": int(len(group))}

    series = []
    for row in frame.sort_values("date").itertuples():
        stats = weekday_stats.get(str(int(row.weekday)))
        baseline = stats["median"] if stats else float(frame["value"].median())
        scale = stats["scale"] if stats else 1.0
        z = (float(row.value) - baseline) / (scale or 1.0)
        series.append({
            "date": str(pd.Timestamp(row.date).date()),
            "value": round(float(row.value), 2),
            "baseline": round(float(baseline), 2),
            "z_score": round(float(z), 3),
            "is_anomaly": bool(abs(z) >= 3.5),
        })

    metadata = {
        "model": "anomaly",
        "scope": "tenant",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "samples": int(len(frame)),
        "metrics": {"threshold_z": 3.5, "method": "robust z-score median+MAD per hari-dalam-minggu", "weekday_days": {k: v["days"] for k, v in weekday_stats.items()}},
        "limitations": [
            "Baseline dari penjualan harian toko Anda.",
            "Anomali statistik bukan bukti kecurangan; hari libur bisa terbaca anomali.",
        ],
    }
    _save(tenant_id, "anomaly", {"weekday_stats": weekday_stats, "threshold": 3.5}, metadata)
    return {**metadata, "series": series}


def _merge_results(tenant_id: str, model_name: str, out: dict[str, Any]) -> None:
    path = _artifact_path(tenant_id, model_name)
    if not os.path.exists(path):
        return
    artifact = joblib.load(path)
    artifact["results"] = {k: v for k, v in out.items() if k in RESULT_KEYS}
    joblib.dump(artifact, path)


# ------------------------------------------------------------------- orkestra

def train_all(payload: dict) -> dict[str, Any]:
    tenant_id = str(payload["tenant_id"])
    horizon = int(payload.get("horizon", 7))
    daily = payload.get("daily") or []
    customers = payload.get("customers") or []
    transactions = payload.get("transactions") or []

    results: dict[str, Any] = {}
    errors: dict[str, str] = {}
    for name, fn in [
        ("forecasting", lambda: _train_forecasting(tenant_id, daily, horizon)),
        ("rfm", lambda: _train_rfm(tenant_id, [c for c in customers if c.get("frequency", 0) > 0])),
        ("mba", lambda: _train_mba(tenant_id, transactions)),
        ("churn", lambda: _train_churn(tenant_id, customers)),
        ("anomaly", lambda: _train_anomaly(tenant_id, daily)),
    ]:
        try:
            out = fn()
            status, reason = _status(name, int(out.get("samples", 0)))
            _merge_results(tenant_id, name, out)
            results[name] = {**out, "status": status, "reason": reason}
        except Exception as exc:  # noqa: BLE001 - satu model gagal tidak menghentikan lainnya
            errors[name] = str(exc)
            results[name] = {"model": name, "scope": "tenant", "status": "not_ready", "reason": f"Gagal melatih: {exc}", "samples": 0}
    return {"models": results, "errors": errors}


def results(tenant_id: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for name in MODELS:
        path = _artifact_path(tenant_id, name)
        if not os.path.exists(path):
            out[name] = None
            continue
        try:
            artifact = joblib.load(path)
            meta = artifact.get("metadata", {})
            status, reason = _status(name, int(meta.get("samples", 0)))
            metrics = meta.get("metrics", {})
            if name == "forecasting":
                model_mape = metrics.get("model", {}).get("mape_pct")
                naive_mape = metrics.get("baseline_naive", {}).get("mape_pct")
                if model_mape is not None and naive_mape is not None and model_mape > naive_mape:
                    status, reason = "limited", f"MAPE model {model_mape}% lebih buruk dari baseline naive {naive_mape}%; ramalan hanya indikatif."
            if name == "churn":
                pr_auc = metrics.get("pr_auc")
                if pr_auc is not None and pr_auc < 0.5:
                    status, reason = "limited", f"PR-AUC {pr_auc} di bawah 0.5; skor risiko hanya indikatif."
            out[name] = {
                "model": name,
                "scope": "tenant",
                "status": status,
                "reason": reason,
                "samples": int(meta.get("samples", 0)),
                "metrics": meta.get("metrics", {}),
                "data_range": meta.get("data_range", []),
                "trained_at": meta.get("trained_at"),
                "limitations": meta.get("limitations", []),
                "results": artifact.get("results", {}),
            }
        except Exception:  # noqa: BLE001 - artefak rusak dianggap belum ada
            out[name] = None
    return {"models": out}
