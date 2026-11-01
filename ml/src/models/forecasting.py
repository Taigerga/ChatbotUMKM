import os

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from src.metadata import save_artifact, build_metadata

DATA_DIR = os.getenv("DATA_DIR", "../data")
TEST_DAYS = 30


def _daily_series() -> pd.DataFrame:
    df = pd.read_csv(
        os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv")
    )
    df["order_date"] = pd.to_datetime(df["order_date"])
    daily = df.groupby("order_date")["net_sales"].sum().reset_index()
    daily = daily.sort_values("order_date").reset_index(drop=True)
    daily["t"] = np.arange(len(daily))
    return daily


def _metrics(actual: np.ndarray, predicted: np.ndarray) -> dict:
    mae = float(np.mean(np.abs(actual - predicted)))
    denominator = np.where(actual == 0, 1.0, actual)
    mape = float(np.mean(np.abs((actual - predicted) / denominator)) * 100)
    return {"mae": round(mae, 2), "mape_pct": round(mape, 2)}


def train() -> dict:
    daily = _daily_series()
    split = max(len(daily) - TEST_DAYS, 1)
    train_df, test_df = daily.iloc[:split], daily.iloc[split:]

    holdout_model = LinearRegression().fit(
        train_df[["t"]].values, train_df["net_sales"].values
    )
    actual = test_df["net_sales"].values
    predicted = holdout_model.predict(test_df[["t"]].values)
    naive = np.repeat(train_df["net_sales"].values[-1], len(test_df))

    metrics = {
        "holdout_days": int(len(test_df)),
        "model": _metrics(actual, predicted),
        "baseline_naive": _metrics(actual, naive),
    }

    model = LinearRegression().fit(daily[["t"]].values, daily["net_sales"].values)
    metadata = build_metadata(
        "forecasting",
        samples=len(daily),
        metrics=metrics,
        data_range=[
            str(daily["order_date"].min().date()),
            str(daily["order_date"].max().date()),
        ],
        limitations=[
            "Regresi linear pada indeks hari: tidak menangkap musiman atau hari libur.",
            "Evaluasi memakai 30 hari terakhir sebagai holdout, bukan validasi silang.",
            "Bandingkan MAPE model dengan baseline naive sebelum memakai angka ramalan.",
        ],
    )
    save_artifact(
        "forecasting",
        {
            "model": model,
            "last_t": int(daily["t"].max()),
            "last_date": str(daily["order_date"].max().date()),
        },
        metadata,
    )
    return metadata


def predict(horizon: int = 7) -> list[dict]:
    artifact = joblib.load(os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), "forecasting.joblib"))
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
