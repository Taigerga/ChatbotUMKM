import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

DATA_DIR = os.getenv("DATA_DIR", "../data")
ARTIFACT_DIR = os.getenv("ARTIFACT_DIR", "./artifacts")


def _daily_series() -> pd.DataFrame:
    df = pd.read_csv(os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv"))
    df["order_date"] = pd.to_datetime(df["order_date"])
    daily = df.groupby("order_date")["net_sales"].sum().reset_index()
    daily = daily.sort_values("order_date")
    daily["t"] = np.arange(len(daily))
    return daily


def train() -> dict:
    daily = _daily_series()
    X = daily[["t"]].values
    y = daily["net_sales"].values
    model = LinearRegression()
    model.fit(X, y)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump({"model": model, "last_t": int(daily["t"].max()), "last_date": str(daily["order_date"].max().date())}, os.path.join(ARTIFACT_DIR, "forecasting.joblib"))
    return {"samples": len(daily), "last_date": str(daily["order_date"].max().date())}


def predict(horizon: int = 7) -> list[dict]:
    artifact = joblib.load(os.path.join(ARTIFACT_DIR, "forecasting.joblib"))
    model = artifact["model"]
    last_t = artifact["last_t"]
    last_date = pd.to_datetime(artifact["last_date"])
    out = []
    for i in range(1, horizon + 1):
        t = last_t + i
        pred = float(model.predict([[t]])[0])
        date = (last_date + pd.Timedelta(days=i)).date()
        out.append({"date": str(date), "value": round(max(pred, 0), 2)})
    return out
