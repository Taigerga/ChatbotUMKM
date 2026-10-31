import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score

DATA_DIR = os.getenv("DATA_DIR", "../data")
ARTIFACT_DIR = os.getenv("ARTIFACT_DIR", "./artifacts")
REF_DATE = pd.Timestamp("2025-12-31")


def _dataset() -> pd.DataFrame:
    df = pd.read_csv(os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv"))
    df["order_date"] = pd.to_datetime(df["order_date"])
    last = df.groupby("customer_id")["order_date"].max().reset_index(name="last_order")
    master = pd.read_csv(os.path.join(DATA_DIR, "raw", "customer_master.csv"))
    data = master.merge(last, on="customer_id", how="left")
    data["churn"] = (REF_DATE - data["last_order"]).dt.days > 365
    data["days_since_last"] = (REF_DATE - data["last_order"]).dt.days.fillna(9999)
    data["order_count"] = df.groupby("customer_id")["order_id"].nunique().reindex(data["customer_id"]).fillna(0).values
    data["total_spend"] = df.groupby("customer_id")["net_sales"].sum().reindex(data["customer_id"]).fillna(0).values
    return data


def train() -> dict:
    data = _dataset()
    features = ["customer_age", "days_since_last", "order_count", "total_spend"]
    X = data[features].fillna(0).values
    y = data["churn"].astype(int).values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)
    pred = model.predict(X_test)
    metrics = {
        "precision": float(precision_score(y_test, pred, zero_division=0)),
        "recall": float(recall_score(y_test, pred, zero_division=0)),
        "f1": float(f1_score(y_test, pred, zero_division=0)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
    }
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump({"model": model, "features": features}, os.path.join(ARTIFACT_DIR, "churn.joblib"))
    return metrics


def predict(customers: list[dict]) -> list[dict]:
    artifact = joblib.load(os.path.join(ARTIFACT_DIR, "churn.joblib"))
    model = artifact["model"]
    features = artifact["features"]
    frame = pd.DataFrame(customers)
    for f in features:
        if f not in frame:
            frame[f] = 0
    proba = model.predict_proba(frame[features].fillna(0).values)[:, 1]
    return [{"customer_id": c.get("customer_id"), "churn_risk": round(float(p), 4)} for c, p in zip(customers, proba)]
