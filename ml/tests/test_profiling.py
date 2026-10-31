from pathlib import Path

import pandas as pd

from src.profiling.profile_datasets import profile_dataset, write_reports

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"


def test_profile_order_level_file():
    df = profile_dataset(RAW / "ecommerce_sales_customer_analytics_150k.csv")
    assert len(df) == 46
    assert df.loc[df.column == "order_id", "unique"].item() == 138116
    assert df.loc[df.column == "order_date", "nullable_pct"].item() == 0


def test_write_reports(tmp_path):
    write_reports(RAW, tmp_path)
    assert (tmp_path / "profiling.md").exists()
    dd = pd.read_csv(tmp_path / "data_dictionary.csv")
    assert set(dd.file.unique()) == {
        "customer_master",
        "dataset_statistics",
        "ecommerce_sales_customer_analytics_150k",
        "order_items",
        "product_catalog",
    }
    report = (tmp_path / "profiling.md").read_text(encoding="utf-8")
    assert "138116" in report
    assert "bound method" not in report
