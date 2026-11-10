import os

import joblib
import numpy as np
import pandas as pd

from src.metadata import build_metadata, save_artifact

DATA_DIR = os.getenv("DATA_DIR", "../data")
THRESHOLD = 3.5


def _daily() -> pd.DataFrame:
    df = pd.read_csv(
        os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv")
    )
    df["order_date"] = pd.to_datetime(df["order_date"])
    daily = df.groupby("order_date")["net_sales"].sum().reset_index()
    daily["weekday"] = daily["order_date"].dt.weekday
    return daily


def _robust_stats(values: np.ndarray) -> tuple[float, float]:
    median = float(np.median(values))
    mad = float(np.median(np.abs(values - median)))
    # 1.4826 membuat MAD sebanding dengan simpangan baku pada distribusi normal.
    scale = mad * 1.4826
    if scale <= 0:
        scale = float(np.std(values)) or 1.0
    return median, scale


def train() -> dict:
    daily = _daily()
    global_median, global_scale = _robust_stats(daily["net_sales"].values)
    weekday_stats = {}
    for weekday, group in daily.groupby("weekday"):
        median, scale = _robust_stats(group["net_sales"].values)
        weekday_stats[int(weekday)] = {"median": median, "scale": scale, "days": int(len(group))}

    metrics = {
        "threshold_z": THRESHOLD,
        "weekday_days": {str(k): v["days"] for k, v in weekday_stats.items()},
        "method": "robust z-score median+MAD per hari-dalam-minggu",
    }
    # Multiplier pola mingguan dipakai saat kalibrasi ke data toko.
    weekday_multiplier = {
        str(k): round(v["median"] / global_median, 4)
        for k, v in weekday_stats.items()
        if global_median > 0
    }
    metadata = build_metadata(
        "anomaly",
        samples=len(daily),
        metrics={**metrics, "weekday_multiplier": weekday_multiplier},
        data_range=[
            str(daily["order_date"].min().date()),
            str(daily["order_date"].max().date()),
        ],
        limitations=[
            "Baseline dari penjualan harian dataset publik, bukan pola toko Anda.",
            "Anomali statistik bukan bukti kecurangan atau kesalahan input.",
            "Hari libur dan kampanye besar dapat terbaca sebagai anomali.",
        ],
    )
    save_artifact(
        "anomaly",
        {
            "global_median": global_median,
            "global_scale": global_scale,
            "weekday_stats": weekday_stats,
            "weekday_multiplier": weekday_multiplier,
            "threshold": THRESHOLD,
        },
        metadata,
    )
    return metadata


def _zero_fill(series: list[dict]) -> list[dict]:
    """Lengkapi hari tanpa transaksi dengan nilai 0."""
    if not series:
        return []
    rows = {str(row["date"]): float(row["value"]) for row in series if row.get("date")}
    if not rows:
        return series
    dates = pd.to_datetime(sorted(rows))
    full = pd.date_range(dates.min(), dates.max(), freq="D")
    return [{"date": str(day.date()), "value": rows.get(str(day.date()), 0.0)} for day in full]


def _calibrated_predict(series: list[dict], artifact: dict) -> list[dict]:
    """Pola hari-dalam-minggu global, skala dan median mengikuti toko."""
    rows = _zero_fill(series)
    values = np.array([row["value"] for row in rows], dtype=float)
    tenant_median, _ = _robust_stats(values)
    multiplier = artifact.get("weekday_multiplier") or {
        str(k): v["median"] / artifact["global_median"]
        for k, v in artifact.get("weekday_stats", {}).items()
        if artifact.get("global_median")
    }
    threshold = artifact.get("threshold", THRESHOLD)

    baselines = []
    for row in rows:
        weekday = pd.Timestamp(row["date"]).weekday()
        factor = float(multiplier.get(str(weekday), 1.0))
        baselines.append(tenant_median * factor)
    baselines_arr = np.array(baselines, dtype=float)
    residual = values - baselines_arr
    _, scale = _robust_stats(residual)

    out = []
    for row, baseline, z in zip(rows, baselines, residual / (scale or 1.0)):
        out.append(
            {
                "date": row["date"],
                "value": float(row["value"]),
                "baseline": round(float(baseline), 2),
                "z_score": round(float(z), 3),
                "is_anomaly": abs(float(z)) >= threshold,
            }
        )
    return out


def predict(series: list[dict], calibrate: bool = False) -> list[dict]:
    artifact = joblib.load(
        os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), "anomaly.joblib")
    )
    if calibrate:
        return _calibrated_predict(series, artifact)

    threshold = artifact.get("threshold", THRESHOLD)
    weekday_stats = artifact.get("weekday_stats", {})
    out = []
    for row in series:
        value = float(row["value"])
        weekday = None
        if row.get("date"):
            try:
                weekday = pd.Timestamp(row["date"]).weekday()
            except (ValueError, TypeError):
                weekday = None
        stats = weekday_stats.get(str(weekday)) or weekday_stats.get(weekday)
        baseline = stats["median"] if stats else artifact["global_median"]
        scale = stats["scale"] if stats else artifact["global_scale"]
        z = (value - baseline) / (scale or 1.0)
        out.append(
            {
                "date": row.get("date"),
                "value": value,
                "baseline": round(float(baseline), 2),
                "z_score": round(float(z), 3),
                "is_anomaly": abs(z) >= threshold,
            }
        )
    return out
