"""Kalibrasi model global ke data toko."""

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

from src.models import anomaly, forecasting, rfm


@pytest.fixture()
def artifact_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("ARTIFACT_DIR", str(tmp_path))
    return tmp_path


def test_forecasting_skala_dan_tanggal_hari_ini(artifact_dir):
    model = LinearRegression().fit(np.array([[0], [10]]), np.array([100.0, 200.0]))
    joblib.dump({"model": model, "last_t": 10, "last_date": "2025-01-01"}, artifact_dir / "forecasting.joblib")

    result = forecasting.predict(horizon=3, target_daily=5_000.0, anchor="2026-11-10")
    values = [point["value"] for point in result["predictions"]]

    assert [point["date"] for point in result["predictions"]] == ["2026-11-11", "2026-11-12", "2026-11-13"]
    assert np.mean(values) == pytest.approx(5_000.0, rel=1e-3)
    assert result["calibration"]["anchored_to"] == "today"
    assert result["calibration"]["factor"] > 0


def test_forecasting_tanpa_target_tetap_skala_global(artifact_dir):
    model = LinearRegression().fit(np.array([[0], [10]]), np.array([100.0, 200.0]))
    joblib.dump({"model": model, "last_t": 10, "last_date": "2025-01-01"}, artifact_dir / "forecasting.joblib")

    result = forecasting.predict(horizon=2)
    assert result["calibration"]["factor"] == 1.0
    assert result["calibration"]["target_daily"] is None


def test_anomaly_zero_fill_dan_baseline_toko(artifact_dir):
    joblib.dump(
        {
            "global_median": 100.0,
            "global_scale": 10.0,
            "weekday_stats": {str(day): {"median": 100.0, "scale": 10.0, "days": 10} for day in range(7)},
            "weekday_multiplier": {str(day): 1.0 for day in range(7)},
            "threshold": 3.5,
        },
        artifact_dir / "anomaly.joblib",
    )
    series = [
        {"date": f"2026-01-{day:02d}", "value": 1_000.0 + (day % 5) * 40}
        for day in range(1, 11)
    ]
    # 2026-01-05 sengaja hilang, harus diisi 0
    series = [row for row in series if row["date"] != "2026-01-05"]
    series.append({"date": "2026-01-11", "value": 50_000.0})

    rows = anomaly.predict(series, calibrate=True)
    by_date = {row["date"]: row for row in rows}

    assert "2026-01-05" in by_date
    assert by_date["2026-01-05"]["value"] == 0
    assert by_date["2026-01-11"]["is_anomaly"] is True
    assert by_date["2026-01-04"]["is_anomaly"] is False


def test_rfm_kalibrasi_tetap_memberi_segmen(artifact_dir):
    rng = np.random.default_rng(3)
    global_X = rng.normal(0, 1, (30, 3))
    scaler = StandardScaler().fit(global_X)
    model = KMeans(n_clusters=2, random_state=0, n_init=10).fit(scaler.transform(global_X))
    joblib.dump(
        {"scaler": scaler, "model": model, "segment_names": {0: "Champion", 1: "Lost"}},
        artifact_dir / "rfm.joblib",
    )

    customers = [
        {"customer_id": f"c{i}", "recency": i * 1000, "frequency": i, "monetary": i * 1_000_000}
        for i in range(6)
    ]
    rows = rfm.predict(customers, calibrate=True)

    assert len(rows) == 6
    assert all(row["segment"] in {"Champion", "Lost"} for row in rows)
