import os

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from src.metadata import build_metadata, save_artifact

DATA_DIR = os.getenv("DATA_DIR", "../data")
K_RANGE = range(2, 7)
SILHOUETTE_SAMPLE = 5000


def _rfm() -> pd.DataFrame:
    df = pd.read_csv(
        os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv")
    )
    ref = pd.to_datetime(df["order_date"]).max()
    agg = (
        df.groupby("customer_id")
        .agg(
            last=("order_date", "max"),
            freq=("order_id", "nunique"),
            monetary=("net_sales", "sum"),
        )
        .reset_index()
    )
    agg["recency"] = (ref - pd.to_datetime(agg["last"])).dt.days
    return agg


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
        # Hindari dua cluster bernama sama.
        if name in names.values():
            name = f"{name} {cluster}"
        names[cluster] = name
    return names


def train(n_clusters: int | None = None) -> dict:
    rfm = _rfm()
    X = rfm[["recency", "freq", "monetary"]].values
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    candidates = [n_clusters] if n_clusters else list(K_RANGE)
    scores: dict[int, dict] = {}
    best_k, best_score, best_model, best_labels = candidates[0], -1.0, None, None
    for k in candidates:
        if k >= len(rfm):
            continue
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(Xs)
        sample = min(SILHOUETTE_SAMPLE, len(Xs))
        score = float(
            silhouette_score(Xs, labels, sample_size=sample, random_state=42)
        )
        scores[k] = {"silhouette": round(score, 4), "inertia": round(float(model.inertia_), 2)}
        if score > best_score:
            best_k, best_score, best_model, best_labels = k, score, model, labels

    rfm["cluster"] = best_labels
    summary = (
        rfm.groupby("cluster")
        .agg(
            customers=("customer_id", "count"),
            recency=("recency", "mean"),
            freq=("freq", "mean"),
            monetary=("monetary", "mean"),
        )
        .reset_index()
    )
    names = _name_clusters(summary)
    summary["segment"] = summary["cluster"].map(names)
    summary["recency"] = summary["recency"].round(1)
    summary["freq"] = summary["freq"].round(2)
    summary["monetary"] = summary["monetary"].round(2)

    metadata = build_metadata(
        "rfm",
        samples=len(rfm),
        metrics={
            "chosen_k": int(best_k),
            "silhouette": round(best_score, 4),
            "candidates": scores,
        },
        limitations=[
            "Segmentasi dari transaksi dataset publik, bukan pelanggan toko Anda.",
            "Label segmen (Champion/Loyal/At Risk/Lost) adalah aturan peringkat, bukan hasil bisnis tervalidasi.",
            "Pelanggan tanpa riwayat tidak dapat disegmentasi.",
        ],
        extra={
            "clusters": summary.to_dict(orient="records"),
            "segment_names": {str(k): v for k, v in names.items()},
        },
    )
    save_artifact("rfm", {"scaler": scaler, "model": best_model, "segment_names": names}, metadata)
    return metadata


def predict(customers: list[dict]) -> list[dict]:
    artifact = joblib.load(os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), "rfm.joblib"))
    scaler = artifact["scaler"]
    model = artifact["model"]
    names = artifact.get("segment_names", {})
    frame = pd.DataFrame(customers)
    X = frame[["recency", "frequency", "monetary"]].values
    labels = model.predict(scaler.transform(X))
    return [
        {
            "customer_id": c.get("customer_id"),
            "cluster": int(label),
            "segment": names.get(int(label), f"Cluster {int(label)}"),
        }
        for c, label in zip(customers, labels)
    ]
