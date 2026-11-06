# Kerangka Makalah Proyek Sains Data / Capstone

Template: Program Studi Teknik Informatika, Fakultas Teknik dan Ilmu Komputer, Universitas Komputer Indonesia (UNIKOM), Bandung. Ikuti penomoran persis. Kolom "Sumber" menunjukkan dari mana isi diambil.

Daftar isi:
- Bagian awal (cover, kata pengantar, daftar)
- BAB I Pendahuluan
- BAB II Landasan Teori
- BAB III Metodologi
- BAB IV Hasil dan Pembahasan
- BAB V Penutup
- Daftar Pustaka dan Lampiran

---

## Bagian awal

**Halaman judul** (urutan baris):
```
MAKALAH PROYEK SAINS DATA / CAPSTONE PROJECT
[JUDUL PROYEK]
Disusun untuk Memenuhi Tugas Mata Kuliah [Nama Mata Kuliah]
Dosen Pengampu: [Nama Dosen]
Disusun oleh Kelompok [Nomor]:
1. [Nama] – [NIM]  (dst.)
PROGRAM STUDI TEKNIK INFORMATIKA
FAKULTAS TEKNIK DAN ILMU KOMPUTER
UNIVERSITAS KOMPUTER INDONESIA (UNIKOM)
BANDUNG
[Tahun]
```
Gunakan tahun berjalan bila pengguna tidak menyebutkan.

**Kata Pengantar**: puji syukur kepada Tuhan Yang Maha Esa; sebut judul dan mata kuliah; ringkas cakupan (latar belakang, tujuan, metodologi, pengumpulan dan pengolahan data, penerapan metode Sains Data, implementasi, evaluasi); permohonan kritik dan saran; tempat dan tanggal (Bandung, …); "Penyusun". Boleh menambahkan ucapan terima kasih kepada dosen pengampu jika namanya diketahui.

**Daftar Isi, Daftar Gambar, Daftar Tabel, Daftar Lampiran**: dibuat otomatis (docx: TOC field) atau manual yang konsisten dengan isi.

---

## BAB I PENDAHULUAN

| Subbab | Isi | Sumber |
|---|---|---|
| 1.1 Latar Belakang | Kondisi saat ini di domain, masalah yang ditemukan, urgensi, alasan memilih pendekatan Sains Data/teknologi tertentu. Alur: konteks domain → masalah → celah → solusi yang diusulkan. 3–5 paragraf, didukung data/referensi. | README, nama dataset/kolom, tujuan kode |
| 1.2 Identifikasi Masalah | Daftar bernomor, tiap butir satu masalah konkret (mis. data tidak terstruktur, proses manual, kelas tidak seimbang). | Dari domain + keputusan di kode |
| 1.3 Rumusan Masalah | Kalimat tanya bernomor. Pola template: "Bagaimana [masalah]?", "Bagaimana penerapan metode Sains Data untuk …?", "Bagaimana hasil evaluasi dari metode atau sistem yang dikembangkan?" Sesuaikan dengan proyek; tiap butir harus terjawab di 5.1. | — |
| 1.4 Tujuan Proyek | Daftar bernomor, selaras satu-satu dengan rumusan masalah. Pola template: mengidentifikasi/menganalisis masalah; mengolah dan menganalisis dataset; menerapkan metode/algoritma; mengembangkan solusi berbasis teknologi; mengevaluasi hasil dan kinerja model. Hapus butir "mengembangkan solusi" bila tidak ada aplikasi. | — |
| 1.5 Manfaat | 1.5.1 Teoretis (kontribusi bagi ilmu: perbandingan algoritma pada dataset/domain tsb.). 1.5.2 Praktis (bagi pengguna/organisasi/masyarakat). | — |
| 1.6 Batasan Masalah | Daftar bernomor, **faktual dari kode**: ruang lingkup; sumber dataset; daftar algoritma yang dipakai; metrik evaluasi; batasan fitur/fungsionalitas aplikasi. | Kode |
| 1.7 Sistematika Penulisan | Satu paragraf/poin per bab (BAB I–V), menjelaskan isi singkat tiap bab dalam makalah ini. | — |

---

## BAB II LANDASAN TEORI DAN TINJAUAN PUSTAKA

| Subbab | Isi |
|---|---|
| 2.1 Penelitian Terdahulu | 3–5 penelitian relevan (referensi nyata). Disarankan tabel: No, Peneliti (tahun), Metode, Dataset, Hasil, Perbedaan dengan proyek ini; diikuti paragraf sintesis. |
| 2.2 Konsep Sains Data | Definisi, ruang lingkup, tahapan (pengumpulan → pembersihan → eksplorasi → pemodelan → evaluasi → deployment), penerapan dalam penyelesaian masalah. Boleh menyebut jenis tugas ML (supervised/unsupervised, klasifikasi/regresi/clustering) sesuai proyek. |
| 2.3 Konsep Permasalahan | Teori/konsep domain proyek (mis. churn pelanggan, deteksi penipuan, analisis sentimen). Spesifik pada masalah, bukan umum. |
| 2.4 Dataset | Pengertian dataset, karakteristik data, jenis data (numerik/kategorikal/teks/deret waktu), relevansi dengan masalah. |
| 2.5 Metode dan Algoritma | Satu subbab per algoritma (2.5.1, 2.5.2, …) **hanya untuk yang dipakai di kode**. Tiap subbab: konsep, cara kerja, rumus utama, kelebihan, kekurangan, hyperparameter penting. Sertakan juga teknik pendukung yang signifikan (mis. SMOTE, TF-IDF, PCA, GridSearchCV) bila dipakai. |
| 2.6 Teknik Evaluasi | Hanya metrik yang dipakai di BAB IV: definisi + rumus + interpretasi. Klasifikasi: Accuracy, Precision, Recall, F1-Score, Confusion Matrix. Regresi: MAE, MSE, RMSE, R². Clustering: Silhouette Score. Template menegaskan: pilih metrik sesuai jenis tugas, bukan semuanya. |
| 2.7 Teknologi dan Tools | Bahasa pemrograman, framework, library (dengan fungsinya), IDE/platform (Jupyter, Colab, VS Code), basis data, version control. Bersumber dari `requirements`/import/konfigurasi, sertakan versi bila tercatat. |

---

## BAB III METODOLOGI PROYEK

| Subbab | Isi |
|---|---|
| 3.1 Metode Pengembangan Proyek | Pendekatan yang dipakai (default CRISP-DM; alternatif: Design Science Research, SDLC/Agile bila ada aplikasi). Jelaskan alasan pemilihan dan sertakan diagram siklusnya. |
| 3.2 Tahapan Pelaksanaan Proyek | Pengantar singkat, lalu enam tahap di bawah. Tiap tahap berisi apa yang **dikerjakan pada proyek ini**. |
| 3.2.1 Business Understanding | Kebutuhan, masalah, tujuan, kriteria keberhasilan (mis. target F1 ≥ x bila disebut; bila tidak disebut, nyatakan kriteria berbasis perbandingan model). |
| 3.2.2 Data Understanding | Proses pengumpulan, identifikasi, pemahaman karakteristik data. |
| 3.2.3 Data Preparation | Pembersihan, transformasi, seleksi fitur, missing values, pembagian data — urut seperti di kode. |
| 3.2.4 Modeling | Algoritma yang diterapkan, skema pelatihan, tuning. |
| 3.2.5 Evaluation | Cara evaluasi dan membandingkan model, metrik, skema validasi. |
| 3.2.6 Deployment | Cara hasil model dimasukkan ke aplikasi/sistem (model tersimpan, API, dashboard, notebook). Jika tidak ada deployment, jelaskan bentuk luaran proyek. |
| 3.3 Sumber dan Pengumpulan Data | Asal dataset, metode pengumpulan (unduh, scraping, API, survei), periode, penyedia. |
| 3.4 Deskripsi Dataset | Tabel wajib: No., Informasi, Keterangan dengan baris: Nama Dataset; Sumber Dataset; Jumlah Data; Jumlah Atribut; Format Data (CSV/XLSX/JSON); Jenis Data (numerik/kategorikal/campuran); Target/Label. Tambahkan tabel kamus atribut (nama kolom, tipe, deskripsi) bila kolom tidak banyak. |
| 3.5 Perangkat dan Lingkungan Pengembangan | Spesifikasi perangkat keras (CPU, RAM, GPU) dan perangkat lunak (OS, Python, versi library). Jika perangkat keras tidak tercatat, minta ke pengguna atau tandai placeholder. |
| 3.6 Arsitektur Sistem | Diagram arsitektur: pengguna → antarmuka → backend → database → pemrosesan data → model ML. Jika tanpa aplikasi: diagram alur pipeline data → model → evaluasi. Diturunkan dari struktur kode. |
| 3.7 Perancangan Sistem | Diagram yang relevan dengan proyek: Use Case, Activity, Flowchart, DFD, ERD. Pilih yang sesuai (ERD jika ada database; Use Case/Activity jika ada aplikasi; Flowchart untuk pipeline). Setiap diagram diberi nomor dan dijelaskan. |

---

## BAB IV HASIL DAN PEMBAHASAN

| Subbab | Isi |
|---|---|
| 4.1 Hasil Pengumpulan Data | Dataset yang berhasil dikumpulkan, jumlahnya, kesesuaian dengan tujuan. |
| 4.2 EDA | 4.2.1 Struktur data (baris, kolom, tipe, `df.info()` dalam tabel). 4.2.2 Statistik deskriptif (tabel mean/std/min/max, dsb.). 4.2.3 Visualisasi (histogram, bar chart, scatter, heatmap korelasi, distribusi target) dengan keterangan. 4.2.4 Temuan: pola, hubungan, tren, anomali, ketidakseimbangan kelas. |
| 4.3 Hasil Data Preprocessing | Hasil (bukan sekadar rencana) dari: missing values, duplikat, outlier, encoding, normalisasi/standardisasi, seleksi fitur, pembagian train/test (sebutkan rasio, `random_state`, ukuran tiap bagian). Tampilkan kondisi sebelum dan sesudah bila ada di output. Sertakan hanya langkah yang ada di kode. |
| 4.4 Implementasi Model ML | Satu subbab per model (4.4.1, 4.4.2, …). Tiap subbab: konsep singkat (rujuk BAB II), parameter yang digunakan (tabel), proses pelatihan, hasil prediksi. Boleh sertakan potongan kode kunci (≤ 15 baris) bila membantu. |
| 4.5 Hasil Evaluasi Model | Tabel: No., Model, Metrik Evaluasi, Hasil. Untuk klasifikasi lebih informatif memakai satu baris per model dengan kolom tiap metrik. Sertakan confusion matrix/grafik pendukung. |
| 4.6 Analisis dan Perbandingan Model | Model terbaik dan alasannya, kelebihan/kekurangan tiap model, penyebab perbedaan hasil (karakter data, ukuran data, imbalance, overfitting, hyperparameter). Bersifat interpretatif. |
| 4.7 Implementasi Aplikasi/Sistem | Hanya bila ada aplikasi. 4.7.1 Halaman Utama; 4.7.2 Pengelolaan Data; 4.7.3 Analisis dan Visualisasi; 4.7.4 Hasil Prediksi/Klasifikasi; 4.7.5 Laporan. Sesuaikan nama halaman dengan aplikasi nyata. Tiap fitur: tujuan, alur penggunaan, placeholder screenshot, penjelasan. |
| 4.8 Pengujian Sistem | Black Box Testing (tabel: No., Skenario, Input, Hasil Diharapkan, Hasil, Status), UAT, pengujian API, pengujian performa — hanya yang benar-benar dilakukan. Tanpa bukti, sajikan skenario uji dari fungsi di kode dan nyatakan hasil perlu diisi. |
| 4.9 Pembahasan | Interpretasi menyeluruh: hubungkan hasil dengan rumusan masalah, tujuan, landasan teori, dan penelitian terdahulu (2.1). Bahas keterbatasan secara jujur. |

---

## BAB V PENUTUP

- **5.1 Kesimpulan**: satu paragraf/butir per rumusan masalah, memuat jawaban dan angka pendukung dari BAB IV. Tidak memuat informasi baru.
- **5.2 Saran**: rekomendasi pengembangan lanjutan dari sisi dataset (lebih banyak/variatif), metode (algoritma lain, tuning, ensemble), fitur, dan implementasi sistem. Harus berkaitan dengan keterbatasan nyata yang ditemukan.

---

## DAFTAR PUSTAKA

Semua referensi (jurnal, buku, prosiding, dokumentasi resmi, sumber dataset). Format dari dosen/prodi; default IEEE:

```
[1] Nama Penulis, "Judul Artikel," Nama Jurnal, vol. x, no. x, pp. xx–xx, Tahun.
[2] Nama Penulis, Judul Buku. Kota: Penerbit, Tahun.
```
Urutkan sesuai kemunculan di teks (IEEE) atau alfabetis (APA).

## LAMPIRAN

Daftar yang disediakan template; sertakan yang tersedia:
1. Dataset atau tautan sumber
2. Dokumentasi proses preprocessing
3. Source code atau tautan repository GitHub
4. Dokumentasi proses training model
5. Hasil evaluasi lengkap (classification report penuh, dsb.)
6. Screenshot implementasi aplikasi
7. Dokumentasi pengujian sistem
8. Pembagian tugas dan kontribusi anggota (tabel: Nama, NIM, Peran/Kontribusi — minta dari pengguna)
9. Dokumentasi kegiatan proyek

Lampiran yang tidak ada bahannya dihapus dari daftar, bukan dibiarkan kosong.
