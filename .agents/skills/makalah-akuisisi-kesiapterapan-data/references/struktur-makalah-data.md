# Kerangka Makalah Akuisisi dan Kesiapterapan Data

Berdasarkan format makalah contoh (Kelompok 5, Proyek Sains Data, UNIKOM) dengan perbaikan. Target: ≥ 10 halaman isi (BAB I–VI), idealnya 14–20 dengan grafik dan tabel.

Daftar isi:
- Bagian awal
- BAB I Pendahuluan
- BAB II Deskripsi Data
- BAB III Akuisisi Data
- BAB IV Profil dan Kualitas Data
- BAB V Kesiapterapan Data pada Projek
- BAB VI Penutup
- Daftar Pustaka dan Lampiran
- Perkiraan panjang

---

## Bagian awal

**Halaman judul**
```
MAKALAH PROYEK SAINS DATA
[JUDUL PROJEK, mis. SISTEM REKOMENDASI … BERBASIS …]
Disusun Untuk Memenuhi Tugas Mata Kuliah Proyek Sains Data
Dosen: [nama dan gelar]
[logo kampus bila ada]
Disusun Oleh: Kelompok [n]
[Nama] [NIM]  (satu baris per anggota)
PROGRAM STUDI TEKNIK INFORMATIKA
FAKULTAS TEKNIK DAN ILMU KOMPUTER
UNIVERSITAS KOMPUTER INDONESIA
[tahun akademik]
```

**Abstrak** (150–250 kata, satu paragraf) + **Kata Kunci** (4–7). Urutan: masalah → data yang dipakai dan cara akuisisi → temuan kualitas data utama (angka) → kesimpulan kesiapterapan.

**Kata Pengantar** (opsional, singkat), **Daftar Isi, Daftar Gambar, Daftar Tabel**.

---

## BAB I PENDAHULUAN (±2–3 halaman)

| Subbab | Isi |
|---|---|
| 1.1 Latar Belakang | Konteks domain dan angka nyata (jumlah entitas, volume data) → masalah pengguna → keterbatasan data/pendekatan yang ada → alasan data ini dipilih → gambaran projek dan peran data. 4–6 paragraf. Boleh memuat temuan data yang memotivasi pendekatan (mis. bias rating, sparsity). |
| 1.2 Rumusan Masalah | Pertanyaan bernomor tentang pengumpulan, pembersihan, penstrukturan, kualitas, dan kesiapan data; boleh satu butir tentang rencana pemodelan. |
| 1.3 Tujuan | Selaras satu-satu dengan 1.2, diawali kata kerja operasional (mengakuisisi, menyusun, menganalisis, menilai, memetakan). |
| 1.4 Manfaat | Bagi pengguna, bagi pihak terkait (pemilik usaha/instansi), dan bagi pengembangan projek/akademik. Singkat dan konkret. |
| 1.5 Ruang Lingkup | Wilayah, objek, periode data, batas pengambilan (mis. maks. n per entitas), bahasa/jenis data. Tampilkan sebagai daftar berlabel. |
| 1.6 Sistematika Penulisan (opsional) | Satu kalimat per bab. |

## BAB II DESKRIPSI DATA (±2 halaman)

| Subbab | Isi |
|---|---|
| 2.1 Sumber Data | Sumber utama (platform, URL, cara akses, kondisi akses seperti login), sumber sekunder (open data, dataset publik) dalam tabel: Data sekunder, Isi, Peran. |
| 2.2 Jenis Data | Tabel: Jenis (teks, numerik, kategorikal, geospasial, temporal, identitas anonim), Contoh atribut, Keterangan/peran. |
| 2.3 Dataset yang Dihasilkan | Tabel: Dataset, File, Baris, Kolom, Satu baris mewakili. Jelaskan relasi antar dataset (kunci penghubung). |
| 2.4 Kamus Data: [Dataset 1] | Tabel: Kolom, Tipe, Keterangan — **semua kolom**. |
| 2.5 Kamus Data: [Dataset 2] | Sama. Tandai kolom yang tidak dipakai di model (mis. data pribadi). |

Sumber angka: header CSV, `profil_data.py` (`kolom_info`).

## BAB III AKUISISI DATA (±3–4 halaman)

| Subbab | Isi |
|---|---|
| 3.1 Perangkat yang Digunakan | Tabel: Perangkat, Fungsi (bahasa, library, browser, script buatan sendiri, spesifikasi mesin bila ada). Rujuk di teks. |
| 3.2 Tahapan Akuisisi | Pengantar arsitektur akuisisi (mis. dua tahap) dan alasannya (efisiensi, ketahanan, kualitas). Sertakan **Gambar alur akuisisi** dan **tabel/diagram corong jumlah data per tahap**. |
| 3.2.1 Tahap 1 (mis. Pengumpulan dan Pembersihan Daftar Entitas) | Strategi pencarian/kueri dan alasannya (batas hasil per kueri, dsb.), atribut yang diambil, jumlah data mentah, **langkah pembersihan berurutan dengan jumlah tersisa tiap langkah**, dan hasil akhir. |
| 3.2.2 Tahap 2 (mis. Pengambilan dan Pembersihan Data Ulasan) | Cara navigasi/ekstraksi, aturan berhenti, atribut diekstraksi, konversi (mis. tanggal relatif → bulan), durasi eksekusi, mode (headless/headed), penyimpanan berkala dan log. Pembersihan: duplikat, entitas dikeluarkan beserta alasannya, entitas tidak aktif. |
| 3.3 Kendala dan Penanganan | Tabel: Kendala, Dampak, Penanganan (autentikasi, CAPTCHA, infinite scroll freeze, kegagalan jaringan, dsb.). Ini bagian yang menunjukkan kerja nyata tim. |
| 3.4 Etika dan Keamanan Data | Data publik saja, anonimisasi pengenal, rate limiting, tidak menembus CAPTCHA otomatis, penyimpanan kredensial lokal, tujuan akademik, kepatuhan ketentuan layanan/hukum (UU PDP bila relevan, dengan sitasi terverifikasi). |
| 3.5 Reprodusibilitas (tambahan) | Tanggal akuisisi, versi tools, perintah menjalankan ulang (rujuk Lampiran), berkas log. |

## BAB IV PROFIL DAN KUALITAS DATA (±3–4 halaman)

Pengantar: sebutkan dataset akhir (jumlah baris, entitas, pengulas/subjek unik), dan bedakan dengan jumlah di daftar awal bila berbeda (beserta perhitungan selisih).

| Subbab | Isi (wajib angka dari data) |
|---|---|
| 4.1 Ringkasan Statistik | Tabel Ukuran | Nilai: jumlah entitas, total baris, baris bernilai teks (%), subjek unik, rata-rata/median/maks per entitas, rata-rata nilai, statistik panjang teks. Interpretasi. |
| 4.2 Sebaran Geografis/Segmen | Bar chart horizontal per wilayah/kategori; sebut 3–4 teratas dan terbawah beserta proporsinya; implikasi (mis. filter lokasi). Tabel lengkap di Lampiran. |
| 4.3 Karakteristik Kategori dan Atribut Penting | Distribusi kategori, harga, dsb.; sebut kekosongan dan cara mitigasinya. Pastikan jumlah kategori + "lainnya" = total. |
| 4.4 Distribusi Nilai/Rating | Bar chart; sebut persentase; kaitkan dengan masalah (bias, imbalance) dan keputusan modeling (class weighting, metrik macro-F1). |
| 4.5 Distribusi Temporal | Bar chart per bulan; jelaskan lonjakan/kekosongan (mis. akibat batas kuota) dan implikasinya (kebaruan). |
| 4.6 Kelengkapan Atribut | Tabel: Atribut, Terisi (%), Keterangan; urut dari tinggi ke rendah; interpretasi kecukupan. |
| 4.7 Pemeriksaan Kualitas Data | Matriks enam dimensi (keunikan, kelengkapan, validitas, konsistensi, ketepatan waktu, keseimbangan kelas) + kecukupan per entitas: Dimensi, Hasil pemeriksaan, Status (Baik/Cukup/Perlu penanganan). Uji konsistensi (mis. korelasi Spearman antar-nilai). Kesimpulan kesiapan "siap/siap dengan catatan". |

## BAB V KESIAPTERAPAN DATA PADA PROJEK (±3–4 halaman)

Pengantar: bab ini menjembatani data → projek; berisi rencana, bukan hasil model.

| Subbab | Isi |
|---|---|
| 5.1 Arsitektur Sistem (Rencana) | Gambar alur: akuisisi (selesai) → modul pemodelan (rencana). Jelaskan tiap modul dan keluarannya, contoh alur penggunaan akhir. |
| 5.2 Pemetaan Data ke Tahap Pemodelan | Tabel: Tahap, Data yang dipakai, Jumlah tersedia (angka nyata), Kesiapan (Siap / Siap dengan catatan / Tidak layak). Sertakan pendekatan yang ditolak beserta alasan angka (mis. sparsity). |
| 5.3–5.5 Kesiapan per Modul | Satu subbab per modul utama (mis. analisis sentimen, aspek, rekomendasi): sumber label/ground truth, komposisi kelas, strategi pembagian data (group split), metrik yang akan dipakai, data uji yang perlu disiapkan. Jelaskan **mengapa** pendekatan layak/tidak layak berdasar profil data. |
| 5.6 Mitigasi Keterbatasan Data | Tabel: Keterbatasan, Dampak pada model, Mitigasi — memuat semua temuan "Perlu penanganan" dari 4.7 dan kendala di BAB III. |
| 5.7 Rencana Tahap Selanjutnya | Daftar bernomor langkah teknis (pra-pemrosesan, EDA lanjutan, pelatihan, evaluasi, antarmuka) dengan metrik yang akan dipakai. |

## BAB VI PENUTUP

- **6.1 Kesimpulan**: butir bernomor, tiap butir menjawab rumusan masalah dengan angka (data apa dibutuhkan; hasil akuisisi; kualitas dan kelemahan utama; kesiapan modul dan yang tidak layak).
- **6.2 Saran**: butir bernomor yang berasal dari keterbatasan nyata (imbalance, anotasi manual, pembaruan data berkala, menaikkan batas pengambilan).

## Daftar Pustaka dan Lampiran

Daftar Pustaka IEEE (atau sesuai dosen), referensi terverifikasi.

Lampiran yang lazim:
- **A.** Tabel lengkap per wilayah/kategori (jumlah entitas dan baris; total harus sama dengan angka di BAB IV)
- **B.** Contoh baris data (anonim; tanpa nama pengulas)
- **C.** Contoh perintah menjalankan script akuisisi
- **D.** Daftar file data dan isinya (termasuk log dan laporan pembersihan)
- **E.** Pembagian tugas anggota (bila diminta dosen; minta datanya, jangan mengarang)

## Perkiraan panjang (spasi 1,5; TNR 12)

| Bagian | Halaman |
|---|---|
| BAB I | 2–3 |
| BAB II | 2 |
| BAB III | 3–4 |
| BAB IV | 3–5 (banyak gambar/tabel) |
| BAB V | 3–4 |
| BAB VI | 1 |
| Total isi | ≈ 14–19 |

Jika kurang dari 10 halaman isi, perdalam interpretasi gambar/tabel, kisah kendala akuisisi, dan argumen kesiapan per modul. Jangan menambah halaman dengan pengulangan atau lampiran mentah.
