"""Profiling dataset mentah: satu baris per kolom, plus laporan markdown."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

RAW_DEFAULT = Path(__file__).resolve().parents[3] / "data" / "raw"
REPORT_DEFAULT = Path(__file__).resolve().parents[3] / "data" / "reports"

MONEY_HINTS = ("sales", "revenue", "price", "cost", "profit", "amount", "value", "rating")


def _role(column: str) -> str:
    name = column.lower()
    if name.endswith("_id") or name == "id":
        return "id"
    if "date" in name or name.endswith("_at"):
        return "tanggal"
    if name == "quantity":
        return "kuantitas"
    if any(h in name for h in MONEY_HINTS):
        return "nilai_uang"
    return "atribut"


def profile_dataset(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, encoding="utf-8", encoding_errors="replace")
    rows = []
    total = len(df)
    for column in df.columns:
        series = df[column]
        non_null = int(series.notna().sum())
        samples = series.dropna().astype(str).unique()[:3]
        rows.append(
            {
                "file": csv_path.stem,
                "column": column,
                "dtype": str(series.dtype),
                "non_null": non_null,
                "nullable_pct": round((total - non_null) / total * 100, 2) if total else 0.0,
                "unique": int(series.nunique(dropna=True)),
                "min": series.min() if non_null else None,
                "max": series.max() if non_null else None,
                "sample": " | ".join(samples),
                "suspected_role": _role(column),
            }
        )
    return pd.DataFrame(rows)


def write_reports(data_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    summary = []
    for csv_path in sorted(Path(data_dir).glob("*.csv")):
        frame = profile_dataset(csv_path)
        frames.append(frame)
        raw_text = csv_path.read_text(encoding="utf-8", errors="replace")
        broken = raw_text.count("\ufffd")
        nulls = frame.sort_values("nullable_pct", ascending=False).iloc[0]
        summary.append(
            {
                "file": csv_path.name,
                "rows": int(pd.read_csv(csv_path, encoding="utf-8", encoding_errors="replace").shape[0]),
                "columns": len(frame),
                "top_null": f"{nulls.column} ({nulls.nullable_pct}%)",
                "encoding_issues": broken,
            }
        )

    dictionary = pd.concat(frames, ignore_index=True)
    dictionary.to_csv(out_dir / "data_dictionary.csv", index=False)

    lines = ["# Profiling Dataset Mentah", "", "| File | Baris | Kolom | Null tertinggi | Karakter rusak |", "|---|---|---|---|---|"]
    for row in summary:
        lines.append(
            f"| {row['file']} | {row['rows']} | {row['columns']} | {row['top_null']} | {row['encoding_issues']} |"
        )
    lines += ["", "Karakter rusak > 0 berarti file bukan UTF-8 murni; pembersihan wajib memakai `encoding_errors=\"replace\"` atau deteksi cp1252.", ""]
    for frame in frames:
        name = frame.file.iloc[0]
        lines += [f"## {name}", "", "| Kolom | Tipe | Null % | Unik | Contoh | Peran |", "|---|---|---|---|---|---|"]
        for _, r in frame.iterrows():
            lines.append(
                f"| {r['column']} | {r['dtype']} | {r['nullable_pct']} | {r['unique']} | {str(r['sample'])[:40]} | {r['suspected_role']} |"
            )
        lines.append("")
    (out_dir / "profiling.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    data = Path(sys.argv[1]) if len(sys.argv) > 1 else RAW_DEFAULT
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else REPORT_DEFAULT
    write_reports(data, out)
    print(f"laporan ditulis ke {out}")
