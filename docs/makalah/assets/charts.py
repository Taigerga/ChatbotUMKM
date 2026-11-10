import json
import matplotlib
matplotlib.use("Agg")
import numpy as np
import matplotlib.pyplot as plt
import matplotlib as mpl

ACCENT = "#1f4e5f"   # dark slate, single accent
GRAY = "#8a8f98"     # muted gray
LGRAY = "#c9cdd3"
TXT = "#222222"

mpl.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.edgecolor": GRAY,
    "figure.facecolor": "white",
    "savefig.bbox": "tight",
    "savefig.dpi": 200,
})

A = "docs/makalah/assets"

def savefig(name):
    plt.tight_layout()
    plt.savefig(f"{A}/{name}.png")
    plt.close()
    print("saved", name)

# ---------- Figure: funnel akuisisi (Gambar 3.1)
fig, ax = plt.subplots(figsize=(8.2, 4.6))
stages = [
    ("Unduh 5 berkas CSV dari Kaggle\n(10 Oktober 2026)", 5, "5 berkas"),
    ("Verifikasi struktur & encoding\n(0 karakter rusak tersisa)", 5, "5 berkas"),
    ("Baris transaksi tervalidasi\n(0 duplikat, ID unik)", 138116, "138.116 baris"),
    ("Baris dengan rating & ulasan\n(hanya order_status = Completed)", 113559, "113.559 baris (82,2%)"),
    ("Pelanggan unik teridentifikasi", 24911, "24.911 pelanggan"),
    ("Produk unik teridentifikasi", 1175, "1.175 produk"),
]
ypos = np.arange(len(stages))[::-1]
maxw = 1.0
for i, (label, val, note) in enumerate(stages):
    w = maxw - i * 0.13
    ax.barh(ypos[i], w, color=ACCENT if i in (2, 3) else GRAY, height=0.62)
    ax.text(w + 0.02, ypos[i], note, va="center", fontsize=8, color=TXT, fontweight="bold")
    ax.text(0.02, ypos[i], label, va="center", fontsize=8, color="white", fontweight="bold")
ax.set_xlim(0, 1.35)
ax.axis("off")
savefig("fig_corong_akuisisi")

# ---------- Figure: distribusi rating (Gambar 4.1)
with open(f"{A}/ringkasan.json", encoding="utf-8") as f:
    rk = json.load(f)
rat = rk["ecommerce_sales_customer_analytics_150k"]["distribusi_rating"]
xs = sorted(float(k) for k in rat)
ys = [rat[str(k) if str(k) in rat else k]["n"] for k in xs]
# keys in json are like '3.5'
ys = [rat[f"{k:.1f}"]["n"] for k in xs]
fig, ax = plt.subplots(figsize=(8.2, 3.6))
colors = [ACCENT if 3.4 <= x <= 3.8 else LGRAY for x in xs]
ax.bar(xs, ys, width=0.085, color=colors)
ax.set_xlabel("Rating pelanggan (1,6–5,0)")
ax.set_ylabel("Jumlah ulasan")
ax.set_title("Rating mengumpul di 3,3–3,9; rata-rata 3,68 (n = 113.559)", fontsize=9, color=TXT)
savefig("fig_rating")

# ---------- Figure: transaksi per bulan (Gambar 4.2)
per_month = rk["ecommerce_sales_customer_analytics_150k"]["per_bulan"]
months = sorted(per_month)
vals = [per_month[m] for m in months]
fig, ax = plt.subplots(figsize=(9.2, 3.6))
ax.bar(months, vals, color=GRAY, width=0.8)
for i, m in enumerate(months):
    if m.endswith("-11") or m.endswith("-12"):
        ax.patches[i].set_color(ACCENT)
ax.set_ylabel("Jumlah transaksi")
ax.set_title("Transaksi stabil ±1.600–2.500/bulan; puncak setiap November–Desember (n = 138.116)", fontsize=8.5, color=TXT)
ax.set_xticks(months[::6])
ax.tick_params(axis="x", labelsize=8)
savefig("fig_bulanan")

# ---------- Figure: order_status (Gambar 4.3)
status = rk["ecommerce_sales_customer_analytics_150k"]["kategori"]["order_status"]
order = sorted(status.items(), key=lambda kv: kv[1])
fig, ax = plt.subplots(figsize=(8.2, 3.2))
labels = [k for k, _ in order]
counts = [v for _, v in order]
cols = [ACCENT if k == "Completed" else GRAY for k in labels]
ax.barh(labels, counts, color=cols)
for i, (k, v) in enumerate(order):
    ax.text(v + 1500, i, f"{v:,.0f} ({v/138116*100:.2f}%)".replace(",", "."), va="center", fontsize=8, color=TXT)
ax.set_xlim(0, max(counts) * 1.22)
ax.set_xlabel("Jumlah order")
ax.set_title("82,22% order berstatus Completed; 17,78% tanpa rating/ulasan", fontsize=8.5, color=TXT)
savefig("fig_order_status")

# ---------- Figure: keterisian atribut tidak lengkap (Gambar 4.4)
attrs = [
    ("return_status / return_reason", 6.85),
    ("coupon_code", 19.99),
    ("campaign_name", 39.74),
    ("delivery_days / est. delivery", 82.22),
    ("customer_rating / review / sentiment", 82.22),
]
fig, ax = plt.subplots(figsize=(8.6, 3.4))
names = [a[0] for a in attrs][::-1]
pcts = [a[1] for a in attrs][::-1]
cols = [ACCENT if p >= 80 else GRAY for p in pcts]
ax.barh(names, pcts, color=cols)
for i, p in enumerate(pcts):
    ax.text(p + 1.5, i, f"{p:.2f}%", va="center", fontsize=8, color=TXT)
ax.set_xlim(0, 100)
ax.set_xlabel("Terisi (%)")
ax.set_title("Kolom inti 100% terisi; kolom pasca-transaksi terisi parsial", fontsize=8.5, color=TXT)
savefig("fig_keterisian")

# ---------- Figure: negara pelanggan (Gambar 4.5)
countries = {"USA": 82600, "UK": 20235, "Germany": 11593, "Canada": 7015, "Australia": 6794, "India": 5707, "UAE": 4172}
items = sorted(countries.items(), key=lambda kv: kv[1])
fig, ax = plt.subplots(figsize=(8.2, 3.4))
names = [k for k, _ in items]
counts = [v for _, v in items]
cols = [ACCENT if k == "USA" else GRAY for k in names]
ax.barh(names, counts, color=cols)
tot = sum(counts.values()) if isinstance(counts, dict) else sum(counts)
for i, v in enumerate(counts):
    ax.text(v + 1200, i, f"{v:,.0f} ({v/138116*100:.1f}%)".replace(",", "."), va="center", fontsize=8, color=TXT)
ax.set_xlim(0, max(counts) * 1.18)
ax.set_xlabel("Jumlah transaksi")
ax.set_title("USA mendominasi 59,8% transaksi; 6 negara lain ≤ 14,7%", fontsize=8.5, color=TXT)
savefig("fig_negara")

# ---------- Figure: kategori produk (Gambar 4.6)
cats = {"Sports & Outdoors": 91, "Books & Media": 87, "Health & Wellness": 86, "Beauty & Personal Care": 83,
        "Automotive": 81, "Office Supplies": 80, "Electronics": 78, "Home Appliances": 78, "Grocery": 78,
        "Toys & Games": 77, "Baby & Kids": 75, "Pet Supplies": 74, "Home & Kitchen": 70, "Jewelry": 69, "Fashion": 68}
items = sorted(cats.items(), key=lambda kv: kv[1])
fig, ax = plt.subplots(figsize=(8.6, 4.6))
names = [k for k, _ in items]
counts = [v for _, v in items]
ax.barh(names, counts, color=GRAY)
ax.set_xlabel("Jumlah produk")
ax.set_title("15 kategori seimbang (68–91 produk; katalog padat, tidak timpang)", fontsize=8.5, color=TXT)
savefig("fig_kategori")

# ---------- Figure: sentimen (Gambar 4.7)
sent = {"Positive": 78083, "Neutral": 34684, "Negative": 792}
items = sorted(sent.items(), key=lambda kv: kv[1])
fig, ax = plt.subplots(figsize=(8.2, 3.0))
names = [k for k, _ in items]
counts = [v for _, v in items]
cols = [ACCENT if k == "Negative" else GRAY for k in names]
ax.barh(names, counts, color=cols)
nb = 113559
for i, v in enumerate(counts):
    ax.text(v + 1200, i, f"{v:,.0f} ({v/nb*100:.1f}%)".replace(",", "."), va="center", fontsize=8, color=TXT)
ax.set_xlim(0, max(counts) * 1.18)
ax.set_xlabel("Jumlah ulasan (n = 113.559)")
ax.set_title("Sentimen sangat timpang: Negative hanya 0,7% (792) — kelas minoritas ekstrem", fontsize=8, color=TXT)
savefig("fig_sentimen")

# ---------- Figure: arsitektur rencana (Gambar 5.1)
fig, ax = plt.subplots(figsize=(9.4, 5.2))
ax.axis("off")
boxes = [
    (0.02, 0.78, 0.22, 0.16, "Sumber\n(Kaggle, diunduh\n10-Okt-2026)", GRAY),
    (0.30, 0.78, 0.20, 0.16, "data/raw/\n5 berkas CSV\n(±88,6 MB)", GRAY),
    (0.56, 0.78, 0.20, 0.16, "Profiling &\nmatriks kecocokan\n(selesai)", ACCENT),
    (0.02, 0.46, 0.22, 0.16, "MySQL toko_analitik_ai\n(data tenant,\nper-toko)", GRAY),
    (0.30, 0.46, 0.20, 0.16, "Impor CSV / form /\nchatbot (input\npemilik toko)", GRAY),
    (0.56, 0.46, 0.20, 0.16, "FastAPI ML :8001\nartefak global\n(dari 150k)", ACCENT),
    (0.80, 0.46, 0.17, 0.16, "Next.js web\n+ chatbot\n(antarmuka)", GRAY),
    (0.02, 0.12, 0.95, 0.18, "5 modul ML (rencana):\n1) Forecasting  2) RFM + K-Means  3) Market Basket (Apriori)\n4) Churn (365 hari sebelum 2025-12-31)  5) Anomaly Detection", ACCENT),
]
for x, y, w, h, text, color in boxes:
    ax.add_patch(plt.Rectangle((x, y), w, h, facecolor=color, alpha=0.92, edgecolor="white"))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=7.5, color="white", fontweight="bold")
for x1, y1, x2, y2 in [(0.24, 0.86, 0.30, 0.86), (0.50, 0.86, 0.56, 0.86), (0.66, 0.78, 0.66, 0.62), (0.52, 0.54, 0.56, 0.54), (0.76, 0.54, 0.80, 0.54), (0.30, 0.46, 0.24, 0.30), (0.66, 0.46, 0.66, 0.30)]:
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(arrowstyle="-|>", color=TXT, lw=1.4))
ax.set_xlim(0, 1); ax.set_ylim(0, 1)
savefig("fig_arsitektur")
print("done")
