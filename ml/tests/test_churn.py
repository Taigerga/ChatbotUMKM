"""Churn global memakai Logistic Regression, konsisten dengan model toko."""

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from src.models import churn


@pytest.fixture()
def synthetic(monkeypatch, tmp_path):
    monkeypatch.setenv("ARTIFACT_DIR", str(tmp_path))
    rng = np.random.default_rng(7)
    rows = 60
    frame = pd.DataFrame(
        {
            "customer_id": [f"c{i}" for i in range(rows)],
            "customer_age": rng.integers(18, 60, rows),
            "days_since_last": rng.integers(0, 400, rows),
            "order_count": rng.integers(1, 12, rows),
            "total_spend": rng.integers(50_000, 2_000_000, rows),
        }
    )
    frame["churn"] = (frame["days_since_last"] > 180).astype(int)
    monkeypatch.setattr(churn, "_dataset", lambda: (frame, False))
    return frame


def test_train_menyimpan_pipeline_logistic_regression(synthetic, tmp_path):
    metadata = churn.train()
    artifact = joblib.load(tmp_path / "churn.joblib")
    model = artifact["model"]
    assert isinstance(model, Pipeline)
    assert isinstance(model[-1], LogisticRegression)
    assert metadata["metrics"]["algorithm"] == "logistic_regression"
    assert metadata["scope"] == "global"


def test_predict_mengembalikan_probabilitas(synthetic):
    churn.train()
    rows = [
        {
            "customer_id": "a",
            "customer_age": 30,
            "days_since_last": 10,
            "order_count": 5,
            "total_spend": 500_000,
        },
        {
            "customer_id": "b",
            "customer_age": 55,
            "days_since_last": 300,
            "order_count": 1,
            "total_spend": 40_000,
        },
    ]
    out = churn.predict(rows)
    assert [row["customer_id"] for row in out] == ["a", "b"]
    assert all(0 <= row["churn_risk"] <= 1 for row in out)
