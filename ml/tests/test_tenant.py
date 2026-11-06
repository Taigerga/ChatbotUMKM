"""Tes pelatihan model per-toko tanpa HTTP: payload sintetis -> hasil lengkap."""

from src import tenant
from src.tenant import train_all, results


def _payload() -> dict:
    import random

    rng = random.Random(7)
    daily = [
        {"date": f"2026-{(i // 28) % 12 + 1:02d}-{i % 28 + 1:02d}", "value": 1_000_000 + rng.randint(-200_000, 900_000)}
        for i in range(180)
    ]
    customers = []
    for i in range(40):
        order_count = rng.randint(1, 12)
        customers.append(
            {
                "customer_id": f"c{i}",
                "name": f"Pelanggan {i}",
                "recency": rng.randint(0, 120) if i < 30 else rng.randint(100, 200),
                "frequency": order_count,
                "monetary": order_count * rng.randint(50_000, 300_000),
                "days_since_last": rng.randint(0, 60) if i < 30 else rng.randint(95, 200),
                "order_count": order_count,
                "total_spend": order_count * 120_000,
            }
        )
    products = ["Beras", "Gula", "Minyak", "Kopi", "Teh", "Telur"]
    transactions = [rng.sample(products, rng.randint(2, 4)) for _ in range(120)]
    return {"tenant_id": "test-tenant", "daily": daily, "customers": customers, "transactions": transactions, "horizon": 7}


def test_train_all_produces_kelima_model():
    import os

    os.environ["ARTIFACT_DIR"] = "./artifacts-test"
    out = train_all(_payload())
    assert set(out["models"].keys()) == {"forecasting", "rfm", "mba", "churn", "anomaly"}
    assert out["errors"] == {}

    f = out["models"]["forecasting"]
    assert len(f["predictions"]) == 7
    assert "mape_pct" in f["metrics"]["model"]
    assert f["scope"] == "tenant"

    r = out["models"]["rfm"]
    assert len(r["segments"]) == 40
    assert all(s["segment"] for s in r["segments"])
    assert r["metrics"]["chosen_k"] >= 2

    m = out["models"]["mba"]
    assert isinstance(m["rules"], list) and len(m["rules"]) > 0
    for rule in m["rules"]:
        assert {"antecedent", "consequent", "support", "confidence", "lift"} <= set(rule)

    c = out["models"]["churn"]
    assert len(c["risks"]) == 40
    assert all(0 <= x["churn_risk"] <= 1 for x in c["risks"])

    a = out["models"]["anomaly"]
    assert len(a["series"]) == 180
    assert all({"date", "value", "baseline", "z_score", "is_anomaly"} <= set(row) for row in a["series"])


def test_results_membaca_artefak():
    import os, shutil

    os.environ["ARTIFACT_DIR"] = "./artifacts-test"
    shutil.rmtree("./artifacts-test/tenants/test-tenant", ignore_errors=True)
    train_all(_payload())
    out = results("test-tenant")
    assert out["models"]["forecasting"] is not None
    assert out["models"]["forecasting"]["results"]["predictions"]
    assert out["models"]["anomaly"]["results"]["series"]
    assert results("tenant-tidak-ada")["models"]["forecasting"] is None


def test_data_kosong_tidak_menghentikan_model_lain():
    import os, shutil

    os.environ["ARTIFACT_DIR"] = "./artifacts-test"
    shutil.rmtree("./artifacts-test/tenants/kosong", ignore_errors=True)
    out = train_all({"tenant_id": "kosong", "daily": [], "customers": [], "transactions": []})
    assert out["models"]["forecasting"]["status"] == "not_ready"
    assert out["models"]["mba"]["status"] == "not_ready"
    assert len(out["errors"]) >= 1
