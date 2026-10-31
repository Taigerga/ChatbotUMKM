import os
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

DATA_DIR = os.getenv("DATA_DIR", "../data")
ARTIFACT_DIR = os.getenv("ARTIFACT_DIR", "./artifacts")


def _rfm() -> pd.DataFrame:
    df = pd.read_csv(os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv"))
    ref = pd.to_datetime(df["order_date"]).max()
    agg = df.groupby("customer_id").agg(
        last=("order_date", "max"),
        freq=("order_id", "nunique"),
        monetary=("net_sales", "sum"),
    ).reset_index()
    agg["recency"] = (ref - pd.to_datetime(agg["last"])).dt.days
    return agg


def train(n_clusters: int = 4) -> dict:
    rfm = _rfm()
    X = rfm[["recency", "freq", "monetary"]].values
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = model.fit_predict(Xs)
    rfm["cluster"] = labels
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump({"scaler": scaler, "model": model}, os.path.join(ARTIFACT_DIR, "rfm.joblib"))
    summary = rfm.groupby("cluster").agg(customers=("customer_id", "count"), recency=("recency", "mean"), freq=("freq", "mean"), monetary=("monetary", "mean")).reset_index()
    return {"clusters": int(n_clusters), "customers": int(len(rfm)), "summary": summary.to_dict(orient="records")}


def predict(customers: list[dict]) -> list[dict]:
    artifact = joblib.load(os.path.join(ARTIFACT_DIR, "rfm.joblib"))
    scaler = artifact["scaler"]
    model = artifact["model"]
    frame = pd.DataFrame(customers)
    X = frame[["recency", "frequency", "monetary"]].values
    labels = model.predict(scaler.transform(X))
    return [{"customer_id": c.get("customer_id"), "cluster": int(l)} for c, l in zip(customers, labels)]
