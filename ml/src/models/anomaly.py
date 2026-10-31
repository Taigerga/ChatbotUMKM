import os
import joblib
import numpy as np
import pandas as pd

DATA_DIR = os.getenv("DATA_DIR", "../data")
ARTIFACT_DIR = os.getenv("ARTIFACT_DIR", "./artifacts")


def _daily() -> pd.DataFrame:
    df = pd.read_csv(os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv"))
    df["order_date"] = pd.to_datetime(df["order_date"])
    daily = df.groupby("order_date")["net_sales"].sum().reset_index()
    return daily


def train() -> dict:
    daily = _daily()
    mean = float(daily["net_sales"].mean())
    std = float(daily["net_sales"].std(ddof=0))
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump({"mean": mean, "std": std}, os.path.join(ARTIFACT_DIR, "anomaly.joblib"))
    return {"samples": len(daily), "mean": round(mean, 2), "std": round(std, 2)}


def predict(series: list[dict]) -> list[dict]:
    artifact = joblib.load(os.path.join(ARTIFACT_DIR, "anomaly.joblib"))
    mean = artifact["mean"]
    std = artifact["std"] or 1
    out = []
    for row in series:
        value = float(row["value"])
        z = (value - mean) / std
        out.append({"date": row.get("date"), "value": value, "z_score": round(z, 3), "is_anomaly": abs(z) >= 3})
    return out
