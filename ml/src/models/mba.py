import os
from collections import Counter

import joblib
import pandas as pd

from src.metadata import build_metadata, save_artifact

DATA_DIR = os.getenv("DATA_DIR", "../data")
MIN_BASKETS = 100
MAX_RULES = 200


def _baskets() -> list[list[str]]:
    orders = pd.read_csv(os.path.join(DATA_DIR, "raw", "order_items.csv"))
    names = pd.read_csv(os.path.join(DATA_DIR, "raw", "product_catalog.csv"))[
        ["product_id", "product_name"]
    ]
    merged = orders.merge(names, on="product_id", how="left")
    baskets = (
        merged.groupby("order_id")["product_name"]
        .apply(lambda s: sorted(set(s.dropna().astype(str))))
        .tolist()
    )
    return baskets.tolist() if hasattr(baskets, "tolist") else list(baskets)


def train(min_support: float = 0.00001) -> dict:
    baskets = _baskets()
    total = len(baskets)
    pair_counts: Counter = Counter()
    item_counts: Counter = Counter()
    for basket in baskets:
        for item in basket:
            item_counts[item] += 1
        for i in range(len(basket)):
            for j in range(i + 1, len(basket)):
                pair_counts[tuple(sorted((basket[i], basket[j])))] += 1

    rules = []
    for (a, b), count in pair_counts.items():
        support = count / total
        if support < min_support:
            continue
        conf_ab = count / item_counts[a]
        conf_ba = count / item_counts[b]
        lift = support / ((item_counts[a] / total) * (item_counts[b] / total))
        rules.append(
            {
                "antecedent": a,
                "consequent": b,
                "support": round(support, 4),
                "confidence": round(conf_ab, 4),
                "lift": round(lift, 4),
            }
        )
        rules.append(
            {
                "antecedent": b,
                "consequent": a,
                "support": round(support, 4),
                "confidence": round(conf_ba, 4),
                "lift": round(lift, 4),
            }
        )

    rules.sort(key=lambda r: r["lift"], reverse=True)
    limitations = [
        "Aturan hanya berbasis pasangan produk; kombinasi 3+ item tidak dihitung.",
        "Asosiasi bukan sebab-akibat.",
    ]
    if total < MIN_BASKETS:
        limitations.append(
            f"Jumlah basket {total} di bawah {MIN_BASKETS}; aturan belum stabil."
        )

    metadata = build_metadata(
        "mba",
        samples=total,
        metrics={
            "baskets": total,
            "rules_kept": len(rules[:MAX_RULES]),
            "min_support": min_support,
        },
        limitations=limitations,
    )
    save_artifact("mba", {"rules": rules[:MAX_RULES]}, metadata)
    return metadata


def predict(basket: list[str], top_n: int = 5) -> list[dict]:
    artifact = joblib.load(os.path.join(os.getenv("ARTIFACT_DIR", "./artifacts"), "mba.joblib"))
    rules = artifact["rules"]
    recs = [r for r in rules if r["antecedent"] in basket and r["consequent"] not in basket]
    recs.sort(key=lambda r: r["lift"], reverse=True)
    return recs[:top_n]
