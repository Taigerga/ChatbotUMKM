import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

from src.metadata import build_metadata, save_artifact

DATA_DIR = os.getenv("DATA_DIR", "../data")
OBS_END = pd.Timestamp("2024-12-31")
LABEL_END = OBS_END + pd.DateOffset(days=365)
COHORT_CUT = pd.Timestamp("2023-12-31")
FEATURES = ["customer_age", "days_since_last", "order_count", "total_spend"]


def _dataset() -> tuple[pd.DataFrame, bool]:
    df = pd.read_csv(
        os.path.join(DATA_DIR, "raw", "ecommerce_sales_customer_analytics_150k.csv")
    )
    df["order_date"] = pd.to_datetime(df["order_date"])

    history = df[df["order_date"] <= OBS_END]
    future = df[(df["order_date"] > OBS_END) & (df["order_date"] <= LABEL_END)]
    active_ids = set(future["customer_id"].unique())

    agg = (
        history.groupby("customer_id")
        .agg(
            last_order=("order_date", "max"),
            first_order=("order_date", "min"),
            order_count=("order_id", "nunique"),
            total_spend=("net_sales", "sum"),
        )
        .reset_index()
    )

    master = pd.read_csv(os.path.join(DATA_DIR, "raw", "customer_master.csv"))[
        ["customer_id", "customer_age"]
    ]
    data = agg.merge(master, on="customer_id", how="left")
    data["customer_age"] = data["customer_age"].fillna(data["customer_age"].median())
    data["days_since_last"] = (OBS_END - data["last_order"]).dt.days
    # Label: tidak ada transaksi pada 365 hari setelah OBS_END.
    data["churn"] = (~data["customer_id"].isin(active_ids)).astype(int)

    time_split = COHORT_CUT.date().isoformat()
    has_time_split = (
        (data["first_order"] <= COHORT_CUT).sum() >= 50
        and (data["first_order"] > COHORT_CUT).sum() >= 50
    )
    return data, has_time_split


def _metrics(y_true, y_pred, y_score) -> dict:
    return {
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "pr_auc": round(float(average_precision_score(y_true, y_score)), 4),
    }


def train() -> dict:
    data, has_time_split = _dataset()
    X = data[FEATURES].fillna(0).values
    y = data["churn"].astype(int).values

    limitations = [
        "Churn didefinisikan sebagai tidak ada transaksi 365 hari setelah 2024-12-31.",
        "Pelanggan tanpa riwayat sebelum 2024-12-31 tidak masuk training.",
        "Model dilatih dari dataset publik, bukan pelanggan toko Anda.",
    ]

    if has_time_split:
        train_mask = (data["first_order"] <= COHORT_CUT).values
        X_train, y_train = X[train_mask], y[train_mask]
        X_test, y_test = X[~train_mask], y[~train_mask]
        split_note = "Split berbasis waktu: cohort first_order <= 2023-12-31 untuk training."
        if len(set(y_test)) < 2:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            split_note = "Cohort test hanya satu kelas; fallback ke split acak bertingkat."
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        split_note = "Data tidak cukup untuk split waktu; dipakai split acak bertingkat."

    holdout = RandomForestClassifier(
        n_estimators=200, random_state=42, class_weight="balanced"
    ).fit(X_train, y_train)
    proba = holdout.predict_proba(X_test)[:, 1]
    metrics = {
        **_metrics(y_test, (proba >= 0.5).astype(int), proba),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "train_churn_rate": round(float(y_train.mean()), 4),
        "test_churn_rate": round(float(y_test.mean()), 4),
        "split": split_note,
    }

    model = RandomForestClassifier(
        n_estimators=200, random_state=42, class_weight="balanced"
    ).fit(X, y)
    metadata = build_metadata(
        "churn",
        samples=len(data),
        metrics=metrics,
        data_range=[str(OBS_END.date()), str(LABEL_END.date())],
        limitations=limitations,
    )
    save_artifact("churn", {"model": model, "features": FEATURES}, metadata)
    return metadata


def predict(customers: list[dict]) -> list[dict]:
    artifact = joblib.load(os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), "churn.joblib"))
    model = artifact["model"]
    features = artifact["features"]
    frame = pd.DataFrame(customers)
    for f in features:
        if f not in frame:
            frame[f] = 0
    proba = model.predict_proba(frame[features].fillna(0).values)[:, 1]
    return [
        {"customer_id": c.get("customer_id"), "churn_risk": round(float(p), 4)}
        for c, p in zip(customers, proba)
    ]
