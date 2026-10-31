from pathlib import Path

from src.profiling.column_suitability import build_matrix, write_matrix

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
MODELS = ["forecasting", "rfm_kmeans", "market_basket", "churn", "anomaly"]


def test_matrix_marks_leakage_and_required_columns():
    m = build_matrix(RAW)
    cell = m[(m.file == "ecommerce_sales_customer_analytics_150k") & (m.column == "customer_lifetime_value")]
    assert (cell["churn"] == "berisiko_leakage").all()
    assert (m[(m.file == "order_items") & (m.column == "product_id")].market_basket == "dipakai").all()
    assert m[(m.file == "dataset_statistics")].forecasting.eq("tidak_dipakai").all()
    assert set(m.columns) == {"file", "column", "reason", *MODELS}
    assert m[["file", "column"]].duplicated().sum() == 0


def test_write_matrix(tmp_path):
    write_matrix(RAW, tmp_path)
    assert (tmp_path / "column_suitability.csv").exists()
    md = (tmp_path / "column_suitability.md").read_text(encoding="utf-8")
    assert "dataset_statistics" in md
    assert "berisiko_leakage" in md
