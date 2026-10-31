"""Matriks kecocokan kolom x model + ringkasan keputusan per file."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

RAW_DEFAULT = Path(__file__).resolve().parents[3] / "data" / "raw"
REPORT_DEFAULT = Path(__file__).resolve().parents[3] / "data" / "reports"

MODELS = ["forecasting", "rfm_kmeans", "market_basket", "churn", "anomaly"]
STATUSES = {"dipakai", "opsional", "tidak_dipakai", "berisiko_leakage"}

ORDERS = "ecommerce_sales_customer_analytics_150k"
LEAKAGE = ["customer_lifetime_value", "customer_order_count", "is_repeat_customer"]
COLUMN_DECISIONS: dict[tuple[str, str], tuple[dict[str, str], str]] = {}

for col in ["order_date", "net_sales"]:
    COLUMN_DECISIONS[(ORDERS, col)] = (
        {"forecasting": "dipakai", "rfm_kmeans": "dipakai", "churn": "dipakai", "anomaly": "dipakai"},
        "tanggal + nilai penjualan bersih: inti seri waktu dan RFM",
    )
COLUMN_DECISIONS[(ORDERS, "customer_id")] = (
    {"rfm_kmeans": "dipakai", "churn": "dipakai", "forecasting": "tidak_dipakai"},
    "kunci pelanggan untuk RFM dan churn",
)
COLUMN_DECISIONS[(ORDERS, "order_id")] = (
    {"market_basket": "opsional", "forecasting": "opsional"},
    "kunci transaksi; item per order ada di order_items",
)
for col in LEAKAGE:
    COLUMN_DECISIONS[(ORDERS, col)] = (
        {m: "berisiko_leakage" for m in MODELS},
        "dihitung dari seluruh histori termasuk masa depan label churn",
    )
COLUMN_DECISIONS[(ORDERS, "quantity")] = (
    {"forecasting": "opsional", "anomaly": "dipakai", "market_basket": "tidak_dipakai"},
    "volume item per order untuk deteksi anomali volume",
)
for col in ["gross_sales", "discount_amount", "tax_amount", "shipping_cost", "product_cost", "profit"]:
    COLUMN_DECISIONS[(ORDERS, col)] = (
        {"forecasting": "opsional", "anomaly": "opsional", "rfm_kmeans": "tidak_dipakai"},
        "komponen nilai; net_sales sudah mewakili",
    )
for col in ["order_status", "return_status", "return_reason", "payment_status", "delivery_status"]:
    COLUMN_DECISIONS[(ORDERS, col)] = (
        {"anomaly": "opsional", "forecasting": "opsional"},
        "penjelas anomali operasional, bukan fitur inti",
    )
for col in ["customer_segment", "customer_type", "gender", "customer_age", "region", "customer_country"]:
    COLUMN_DECISIONS[(ORDERS, col)] = (
        {"rfm_kmeans": "opsional", "churn": "opsional"},
        "atribut pelanggan untuk profil cluster dan fitur churn",
    )
for col in ["customer_review", "review_sentiment", "campaign_name", "coupon_code", "warehouse",
            "marketing_channel", "sales_channel", "payment_method", "shipping_method", "currency",
            "order_time", "customer_name", "customer_city", "customer_state", "customer_postal_code",
            "customer_rating", "loyalty_points_earned", "loyalty_points_redeemed", "delivery_days",
            "estimated_delivery_days", "profit_margin_percentage"]:
    COLUMN_DECISIONS[(ORDERS, col)] = ({}, "tidak menambah sinyal untuk model yang dipilih")

COLUMN_DECISIONS[("order_items", "order_id")] = ({"market_basket": "dipakai"}, "kunci transaksi untuk keranjang")
COLUMN_DECISIONS[("order_items", "product_id")] = ({"market_basket": "dipakai"}, "item yang dibeli per transaksi")
COLUMN_DECISIONS[("order_items", "quantity")] = ({"market_basket": "opsional"}, "bobot kuantitas, Apriori biner")
COLUMN_DECISIONS[("order_items", "net_sales")] = ({"market_basket": "opsional"}, "nilai item, bukan kebutuhan asosiasi")

COLUMN_DECISIONS[("product_catalog", "product_id")] = ({"market_basket": "dipakai"}, "kunci produk")
COLUMN_DECISIONS[("product_catalog", "product_category")] = ({"market_basket": "opsional"}, "memungkinkan aturan tingkat kategori")
COLUMN_DECISIONS[("product_catalog", "unit_price")] = ({"market_basket": "tidak_dipakai"}, "harga tidak dipakai Apriori")

for col in ["customer_id", "customer_segment", "customer_city", "customer_state", "customer_country"]:
    COLUMN_DECISIONS[("customer_master", col)] = (
        {"rfm_kmeans": "opsional", "churn": "opsional"},
        "atribut profil pelanggan; RFM memakai transaksi",
    )
COLUMN_DECISIONS[("customer_master", "customer_acquisition_cost")] = (
    {"churn": "opsional"},
    "biaya akuisisi bisa jadi fitur risiko, bukan label",
)


def build_matrix(data_dir: Path) -> pd.DataFrame:
    rows = []
    for csv_path in sorted(Path(data_dir).glob("*.csv")):
        header = pd.read_csv(csv_path, nrows=0, encoding="utf-8", encoding_errors="replace")
        for column in header.columns:
            decisions, reason = COLUMN_DECISIONS.get((csv_path.stem, column), ({}, "tidak relevan untuk kelima model"))
            row = {"file": csv_path.stem, "column": column, "reason": reason}
            for model in MODELS:
                row[model] = decisions.get(model, "tidak_dipakai")
            rows.append(row)
    frame = pd.DataFrame(rows, columns=["file", "column", *MODELS, "reason"])
    bad = set(frame[MODELS].to_numpy().ravel()) - STATUSES
    if bad:
        raise ValueError(f"status tidak dikenal: {bad}")
    return frame


FILE_DECISION = {
    "ecommerce_sales_customer_analytics_150k": ("dipakai sebagian", "forecasting, RFM+K-Means, churn, anomaly"),
    "order_items": ("dipakai sebagian", "market basket"),
    "product_catalog": ("dipakai sebagian", "market basket (kunci + kategori)"),
    "customer_master": ("hanya referensi/validasi", "profil pelanggan; transaksi tetap sumber utama"),
    "dataset_statistics": ("tidak dipakai", "ringkasan agregat 1 baris, bukan observasi"),
}


def write_matrix(data_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    frame = build_matrix(data_dir)
    frame.to_csv(out_dir / "column_suitability.csv", index=False)

    lines = [
        "# Matriks Kecocokan Kolom x Model",
        "",
        "Status: `dipakai` / `opsional` / `tidak_dipakai` / `berisiko_leakage`.",
        "",
        "## Ringkasan keputusan per file",
        "",
        "| File | Keputusan | Model yang dilayani |",
        "|---|---|---|",
    ]
    for name, (decision, models) in FILE_DECISION.items():
        lines.append(f"| {name} | {decision} | {models} |")

    lines += ["", "## Matriks", "", "| File | Kolom | " + " | ".join(MODELS) + " | Alasan |", "|---|---|" + "---|" * len(MODELS) + "---|"]
    for _, r in frame.iterrows():
        cells = " | ".join(str(r[m]) for m in MODELS)
        lines.append(f"| {r['file']} | {r['column']} | {cells} | {r['reason']} |")

    lines += [
        "",
        "## Catatan",
        "",
        "- `customer_lifetime_value`, `customer_order_count`, `is_repeat_customer` dihitung dari seluruh histori",
        "  dan tidak boleh menjadi fitur churn (data leakage).",
        "- `dataset_statistics.csv` hanya ringkasan agregat; tidak pernah dipakai sebagai data training.",
        "- Persetujuan matriks ini wajib sebelum preprocessing/training.",
        "",
    ]
    (out_dir / "column_suitability.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    data = Path(sys.argv[1]) if len(sys.argv) > 1 else RAW_DEFAULT
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else REPORT_DEFAULT
    write_matrix(data, out)
    print(f"matriks ditulis ke {out}")
