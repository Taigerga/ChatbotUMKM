# Pemeriksaan Kualitas dan Kesiapterapan Data

Daftar isi:
- Enam dimensi kualitas dan cara mengukurnya
- Resep pandas yang sering dibutuhkan
- Menilai kesiapan per modul
- Daftar rekonsiliasi angka

---

## Enam dimensi kualitas dan cara mengukurnya

| Dimensi | Pertanyaan | Cara ukur | Status umum |
|---|---|---|---|
| Keunikan | Adakah duplikat? | `df.duplicated(subset=[id]).sum()` sebelum dan sesudah pembersihan | Baik bila 0 tersisa |
| Kelengkapan | Seberapa terisi tiap atribut? | `df.notna().mean()`; kosong string dihitung kosong | Baik (inti 100%), Cukup (opsional 23–77%) |
| Validitas | Nilai dalam rentang/format benar? | rentang rating, format tanggal, koordinat di dalam wilayah, tipe | Baik bila semua lolos |
| Konsistensi | Atribut saling selaras? | korelasi Spearman antara rating dan nilai aspek; kecocokan kecamatan ↔ koordinat/alamat | Baik bila korelasi kuat tetapi < 1 |
| Ketepatan waktu | Data cukup baru dan sesuai periode? | tanggal min/maks, entitas tanpa data pada periode | Baik bila dalam jendela |
| Keseimbangan kelas | Apakah kelas/label timpang? | `value_counts(normalize=True)` | "Perlu penanganan" bila satu kelas > ~80% |
| Kecukupan per entitas | Cukup data per entitas? | jumlah baris per entitas < ambang (mis. 20) | "Perlu penanganan" bila banyak entitas di bawah ambang |

## Resep pandas

```python
import pandas as pd, numpy as np
rev = pd.read_csv("ulasan.csv"); cafe = pd.read_csv("daftar.csv")

# Keterisian (string kosong dianggap kosong)
fill = rev.replace(r"^\s*$", np.nan, regex=True).notna().mean().mul(100).round(1).sort_values()

# Sparsity matriks pengguna x item
n_u, n_i = rev["id_pengulas"].nunique(), rev["id_cafe"].nunique()
density = rev[["id_pengulas","id_cafe"]].drop_duplicates().shape[0] / (n_u * n_i)
sparsity = (1 - density) * 100                      # contoh hasil: 99,88%

# Perilaku pengulas (alasan collaborative filtering tidak layak)
per_user = rev.groupby("id_pengulas")["id_cafe"].nunique()
satu = (per_user == 1).mean() * 100                 # % pengulas hanya 1 item
lima_plus = (per_user >= 5).sum()

# Korelasi Spearman rating vs nilai aspek
for c in ["nilai_makanan","nilai_layanan","nilai_suasana"]:
    print(c, rev["rating"].corr(rev[c], method="spearman").round(3))

# Kecukupan per entitas
per_item = rev.groupby("id_cafe").size()
kurang20 = (per_item < 20).sum(); median, mean, mx = per_item.median(), per_item.mean(), per_item.max()
teks = rev["teks_ulasan"].fillna("").str.strip() != ""
item_siap = rev[teks].groupby("id_cafe").size().ge(10).sum()   # entitas dengan >=10 teks

# Weak label dari rating (bintang 1-2 negatif, 3 netral, 4-5 positif)
lab = pd.cut(rev.loc[teks,"rating"], [0,2,3,5], labels=["negatif","netral","positif"])
lab.value_counts(), lab.value_counts(normalize=True).mul(100).round(1)

# Duplikat id ulasan per entitas
dup = rev.duplicated(subset=["review_id","id_cafe"]).sum()

# Rangkum distribusi per wilayah (untuk lampiran)
tbl = (rev.groupby("kecamatan").agg(ulasan=("review_id","size"))
          .join(cafe.groupby("kecamatan").size().rename("cafe"))
          .sort_values("cafe", ascending=False))

# Konsentrasi top-4
top4 = tbl.head(4); (top4["cafe"].sum()/tbl["cafe"].sum()*100).round(1)
```
Adaptasi nama kolom dengan dataset sebenarnya; jalankan dan salin angka dari keluaran, bukan dari ingatan.

## Menilai kesiapan per modul

Gunakan tiga tingkat dan beri alasan berangka:
- **Siap**: data cukup dan labelnya tersedia tanpa kerja tambahan.
- **Siap dengan catatan**: perlu penanganan tertentu (imbalance → class weight, F1-macro; anotasi manual kecil; bobot kepercayaan/smoothing untuk entitas data sedikit).
- **Tidak layak**: syarat dasar tak terpenuhi. Contoh: collaborative filtering dengan sparsity > 99% dan ≥ 90% pengguna hanya muncul sekali.

Untuk tiap modul, jawab: apa **input**-nya dari kolom mana, berapa **jumlah** tersedia, dari mana **label/ground truth**, bagaimana **pembagian data** (group split per entitas bila gaya tulis/entitas bisa bocor), metrik yang pantas (macro-F1, confusion matrix, P@K, NDCG@K), dan risikonya.

## Daftar rekonsiliasi angka (cek sebelum menyerahkan)

1. Corong akuisisi menurun runtut dan selisih tiap tahap dapat dijelaskan (mentah → tanpa duplikat → dalam wilayah → kategori sesuai → aktif → ambang ulasan → final).
2. Jumlah entitas di daftar vs entitas berulasan: selisih = entitas dikeluarkan + entitas tanpa ulasan pada periode (tulis perhitungannya).
3. Jumlah baris mentah − duplikat = baris bersih (mis. 88.135 − 119 = 88.016).
4. Distribusi rating menjumlah ke total baris dan ke 100% (± pembulatan).
5. Distribusi bulanan menjumlah ke total baris.
6. Distribusi wilayah (jumlah entitas dan baris) menjumlah ke total; angka di teks BAB IV = Lampiran A.
7. Kategori (mis. kedai kopi + kafe + restoran + lainnya) menjumlah ke jumlah entitas; bila tidak, tambahkan baris "Lainnya" atau jelaskan.
8. Kelas label (negatif + netral + positif) menjumlah ke jumlah baris bertekst; persentasenya sama di semua bab.
9. Angka di Abstrak, BAB I, BAB IV, BAB V, BAB VI, dan Lampiran sama persis untuk besaran yang sama.
10. Periode data, tanggal akuisisi, dan jendela waktu konsisten di seluruh bab; "bulan berjalan" tidak dihitung sebagai bulan penuh tanpa catatan.
11. Istilah dan ejaan nama (kafe/cafe, projek/proyek, nama kolom) konsisten, nama kolom ditulis persis seperti di dataset.

Jika ada ketidakcocokan yang tidak bisa dijelaskan dari data, laporkan kepada pengguna sebagai temuan, jangan memperhalus angka agar cocok.
