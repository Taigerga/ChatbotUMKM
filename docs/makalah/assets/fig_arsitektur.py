import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib as mpl

ACCENT = "#1f4e5f"
GRAY = "#8a8f98"
LGRAY = "#c9cdd3"
TXT = "#222222"

mpl.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 8.5,
    "figure.facecolor": "white",
    "savefig.bbox": "tight",
    "savefig.dpi": 200,
})

fig, ax = plt.subplots(figsize=(10.5, 5.6))
ax.axis("off")

def box(x, y, w, h, text, fill="#eef2f7", tc=TXT, fs=8.5, bold=False, edge=LGRAY):
    ax.add_patch(plt.Rectangle((x, y), w, h, facecolor=fill, edgecolor=edge, lw=1.2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fs, color=tc, fontweight="bold" if bold else "normal", linespacing=1.35)

def arrow(x1, y1, x2, y2):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=GRAY, lw=1.6))

# --- Baris atas: pelatihan model global
ax.text(0.01, 0.925, "Pelatihan model global (dataset publik)", fontsize=9,
        fontweight="bold", color=ACCENT, va="center")
box(0.01, 0.665, 0.19, 0.17, "Sumber publik\n(Kaggle, 10 Oktober 2026)", fill="#eef2f7")
box(0.245, 0.665, 0.19, 0.17, "Verifikasi & profiling\n(kualitas data)", fill="#eef2f7")
box(0.48, 0.665, 0.235, 0.17, "5 model global\n(dilatih 1 November 2026)", fill=ACCENT, tc="white", bold=True, edge=ACCENT)
arrow(0.20, 0.75, 0.245, 0.75)
arrow(0.435, 0.75, 0.48, 0.75)

# --- Baris bawah: layanan per toko
ax.text(0.01, 0.50, "Layanan analitik per toko", fontsize=9,
        fontweight="bold", color=ACCENT, va="center")
box(0.01, 0.185, 0.185, 0.22, "Input toko\nchatbot (konfirmasi),\nformulir, impor CSV", fill="#eef2f7")
box(0.24, 0.185, 0.185, 0.22, "Basis data toko\nterisolasi per tenant\n(MySQL)", fill="#eef2f7")
box(0.47, 0.185, 0.225, 0.22, "Layanan model\n(API + layanan ML)\nmemanggil artefak global", fill=ACCENT, tc="white", bold=True, edge=ACCENT)
box(0.74, 0.185, 0.25, 0.22, "Aplikasi toko\nchatbot & dashboard\n(Next.js)", fill="#eef2f7")
arrow(0.195, 0.295, 0.24, 0.295)
arrow(0.425, 0.295, 0.47, 0.295)
arrow(0.695, 0.295, 0.74, 0.295)

# --- Koneksi global ke layanan
arrow(0.5975, 0.665, 0.5975, 0.405)
ax.text(0.615, 0.53, "artefak model", fontsize=7, color=GRAY, va="center")

# --- Catatan bawah
ax.text(0.01, 0.055,
        "Lima model: 1) Forecasting  2) RFM + K-Means  3) Asosiasi keranjang 2-item  4) Prediksi churn  5) Deteksi anomali",
        fontsize=8, color=TXT, va="center", fontweight="bold")
ax.text(0.01, 0.005,
        "Hasil model global bersifat referensi umum, bukan kebenaran data toko; data toko tidak dipakai melatih ulang tanpa alur validasi.",
        fontsize=7, color=GRAY, va="center", fontstyle="italic")

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
plt.savefig("fig_arsitektur.png", bbox_inches="tight")
print("saved fig_arsitektur.png")
