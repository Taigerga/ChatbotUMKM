#!/usr/bin/env python3
"""Profiling cepat dataset CSV/XLSX untuk makalah akuisisi & kesiapterapan data.

Pemakaian:
  python profil_data.py data1.csv [data2.csv ...] --out profil_out \
      [--rating-col rating] [--text-col teks_ulasan] [--date-col perkiraan_tanggal] \
      [--cat-col kecamatan --cat-col kategori] [--id-col review_id]

Keluaran di folder --out:
  ringkasan.json  : angka ringkasan per file
  *.png           : grafik (rating, bulanan, kategori, panjang teks, keterisian atribut)
Hanya kolom yang disebut/ditemukan yang diproses; hasil tidak pernah dikarang.
"""
import argparse, json, os, sys
import pandas as pd

def load(path):
    if path.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(path)
    return pd.read_csv(path, encoding="utf-8", low_memory=False)

def filled_pct(s):
    """Persentase terisi; string kosong/spasi dihitung kosong."""
    t = s.copy()
    if t.dtype == object:
        t = t.astype(str).str.strip().replace({"": None, "nan": None, "None": None})
    return round(float(t.notna().mean() * 100), 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", default="profil_out")
    ap.add_argument("--rating-col"); ap.add_argument("--text-col")
    ap.add_argument("--date-col"); ap.add_argument("--id-col")
    ap.add_argument("--cat-col", action="append", default=[])
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    try:
        import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    except ImportError:
        plt = None; print("matplotlib tidak ada: grafik dilewati", file=sys.stderr)

    result = {}
    for f in a.files:
        df = load(f); name = os.path.splitext(os.path.basename(f))[0]
        r = {"baris": int(len(df)), "kolom": int(df.shape[1]),
             "duplikat_baris_penuh": int(df.astype(str).duplicated().sum()),
             "kolom_info": {c: {"tipe": str(df[c].dtype), "terisi_pct": filled_pct(df[c]),
                                "unik": int(df[c].nunique(dropna=True))} for c in df.columns}}
        num = df.select_dtypes("number")
        if not num.empty:
            r["deskriptif_numerik"] = json.loads(num.describe().round(3).to_json())
        if a.id_col and a.id_col in df:
            r["id_duplikat"] = int(df[a.id_col].duplicated().sum())
            r["id_unik"] = int(df[a.id_col].nunique())
        if a.rating_col and a.rating_col in df:
            vc = df[a.rating_col].value_counts().sort_index()
            r["distribusi_rating"] = {str(k): {"n": int(v), "pct": round(v / len(df) * 100, 1)} for k, v in vc.items()}
            r["rating_rata2"] = round(float(df[a.rating_col].mean()), 3)
            if plt:
                ax = vc.plot(kind="bar", color="#2a78d6"); ax.set_title("Distribusi rating"); ax.set_xlabel("Rating"); ax.set_ylabel("Jumlah")
                plt.tight_layout(); plt.savefig(f"{a.out}/{name}_rating.png", dpi=200); plt.close()
        if a.text_col and a.text_col in df:
            t = df[a.text_col].fillna("").astype(str).str.strip()
            has = t != ""; w = t[has].str.split().str.len()
            r["teks"] = {"berteks": int(has.sum()), "berteks_pct": round(has.mean() * 100, 1),
                         "kata_median": float(w.median()) if len(w) else None,
                         "kata_rata2": round(float(w.mean()), 1) if len(w) else None}
            if plt and len(w):
                w.clip(upper=w.quantile(0.99)).plot(kind="hist", bins=40, color="#2a78d6"); plt.title("Panjang teks (kata)"); plt.xlabel("Jumlah kata")
                plt.tight_layout(); plt.savefig(f"{a.out}/{name}_panjang_teks.png", dpi=200); plt.close()
        if a.date_col and a.date_col in df:
            m = df[a.date_col].astype(str).str[:7].value_counts().sort_index()
            r["per_bulan"] = {k: int(v) for k, v in m.items()}
            if plt:
                m.plot(kind="bar", color="#2a78d6"); plt.title("Jumlah per bulan"); plt.xticks(rotation=45, ha="right")
                plt.tight_layout(); plt.savefig(f"{a.out}/{name}_bulanan.png", dpi=200); plt.close()
        for c in a.cat_col:
            if c in df:
                vc = df[c].value_counts()
                r.setdefault("kategori", {})[c] = {str(k): int(v) for k, v in vc.items()}
                if plt:
                    vc.head(30).iloc[::-1].plot(kind="barh", color="#9aa0a6"); plt.title(f"Jumlah per {c}")
                    plt.tight_layout(); plt.savefig(f"{a.out}/{name}_{c}.png", dpi=200); plt.close()
        if plt:
            k = pd.Series({c: v["terisi_pct"] for c, v in r["kolom_info"].items()}).sort_values()
            k.plot(kind="barh", color="#2a78d6", figsize=(7, max(3, len(k) * 0.3))); plt.title("Keterisian atribut (%)")
            plt.tight_layout(); plt.savefig(f"{a.out}/{name}_keterisian.png", dpi=200); plt.close()
        result[name] = r
    json.dump(result, open(f"{a.out}/ringkasan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps({k: {"baris": v["baris"], "kolom": v["kolom"]} for k, v in result.items()}, indent=2))

if __name__ == "__main__":
    main()
