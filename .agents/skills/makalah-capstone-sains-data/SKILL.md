---
name: makalah-capstone-sains-data
description: Membaca kode proyek (repository, notebook Jupyter, script Python/R, aplikasi web/API, dataset, log training) lalu menyusun makalah proyek Sains Data / capstone project berbahasa Indonesia dengan format 5 BAB (Pendahuluan, Landasan Teori, Metodologi CRISP-DM, Hasil dan Pembahasan, Penutup) sesuai template Prodi Teknik Informatika UNIKOM. Gunakan skill ini setiap kali pengguna meminta makalah, laporan, paper, atau dokumentasi untuk proyek data science / machine learning / capstone / tugas akhir mata kuliah dari kodingan, notebook, folder proyek, atau repo GitHub, walaupun pengguna tidak menyebut kata "skill" atau "template". Pemicu antara lain "buatkan makalah dari kodingan ini", "laporan capstone", "makalah proyek sains data", "jadikan notebook ini laporan", "tulis BAB I sampai V proyek ML saya".
---

# Makalah Capstone / Proyek Sains Data dari Kodingan

Skill ini mengubah **kode proyek yang nyata** menjadi **makalah akademik lengkap** (Cover sampai Lampiran) dengan struktur BAB I–V. Kekuatan makalah ada pada kesesuaiannya dengan kode: dosen akan membandingkan isi makalah dengan proyek. Karena itu, semua klaim teknis (dataset, preprocessing, model, parameter, metrik, fitur aplikasi) harus berasal dari kode atau output yang benar-benar dibaca, bukan dari tebakan.

## Alur kerja

Ikuti urutan ini. Jangan langsung menulis sebelum Tahap 1–2 selesai, karena makalah yang ditulis dari asumsi akan berisi angka dan nama yang salah.

### Tahap 1 — Inventarisasi proyek

1. Daftar seluruh file proyek (`view` direktori atau `find`). Abaikan `node_modules`, `.git`, `venv`, `__pycache__`.
2. Baca dulu file orientasi: `README`, `requirements.txt` / `pyproject.toml` / `package.json`, struktur folder.
3. Identifikasi jenis artefak: notebook (`.ipynb`), script training, dataset (`.csv/.xlsx/.json`), model tersimpan (`.pkl/.joblib/.h5/.pt`), backend/API, frontend, database/skema, pengujian, dokumen lain.
4. Jika file diunggah dan isinya belum ada di konteks, baca sesuai tipenya (lihat skill `file-reading`). Untuk `.ipynb`, baca sel kode **dan** output sel (output berisi angka hasil yang dibutuhkan di BAB IV).

### Tahap 2 — Ekstraksi fakta (evidence ledger)

Susun catatan kerja berisi fakta + sumbernya (nama file/sel/baris). Panduan lengkap pemetaan kode → bagian makalah ada di `references/ekstraksi-dari-kode.md`; **baca file itu sebelum mengekstrak**. Ringkasnya, kumpulkan:

- Dataset: nama, sumber, jumlah baris/kolom, tipe data, target/label, format, periode.
- EDA: statistik deskriptif, distribusi, korelasi, missing value, outlier, temuan.
- Preprocessing: urutan langkah, parameter (mis. `test_size`, `random_state`, scaler, encoder, imputasi, SMOTE).
- Model: algoritma, library, hyperparameter, skema validasi (split/CV/GridSearch).
- Evaluasi: metrik dan nilainya per model, confusion matrix, feature importance.
- Aplikasi (jika ada): framework, arsitektur, endpoint/route, halaman, fitur, database, deployment.
- Tools: bahasa, versi, library, IDE/platform, spesifikasi lingkungan bila tercatat.

Jika output hasil (akurasi, dsb.) tidak tersimpan di notebook/log, boleh menjalankan kode di sandbox **hanya bila** dataset tersedia, dependensi bisa dipasang, dan waktu eksekusi wajar. Jika tidak bisa, jangan mengarang angka: tulis `[ISI: nilai akurasi model X dari hasil training]` dan catat di daftar "Data yang perlu dilengkapi".

### Tahap 3 — Lengkapi metadata

Metadata cover (judul, mata kuliah, dosen, kelompok, anggota + NIM, tanggal) hampir tidak pernah ada di kode. Cek dulu apakah pengguna sudah memberikannya. Jika belum, tanyakan **dalam satu pesan singkat** bersama preferensi format keluaran (lihat "Format keluaran"), lalu lanjutkan bekerja. Bila pengguna tidak menjawab, pakai placeholder `[Nama Anggota 1] – [NIM]` agar mudah diganti. Judul proyek boleh diusulkan dari tujuan proyek yang tampak di kode.

### Tahap 4 — Menulis makalah

Struktur wajib dan panduan isi tiap subbab ada di `references/template-struktur.md`; **baca sebelum menulis dan ikuti nomor subbab persis**, karena makalah akan dinilai terhadap template tersebut. Garis besar:

- Halaman judul → Kata Pengantar → Daftar Isi/Gambar/Tabel/Lampiran
- **BAB I** Pendahuluan (1.1–1.7)
- **BAB II** Landasan Teori dan Tinjauan Pustaka (2.1–2.7)
- **BAB III** Metodologi Proyek (3.1–3.7)
- **BAB IV** Hasil dan Pembahasan (4.1–4.9)
- **BAB V** Penutup (kesimpulan, saran)
- Daftar Pustaka → Lampiran

Aturan penyesuaian terhadap proyek nyata:

1. **Sesuaikan jumlah subbab dengan isi proyek.** Template menyediakan slot untuk 5 model (2.5.1–2.5.5, 4.4.1–4.4.5); jika proyek hanya memakai 2 model, tulis 2 saja. Hapus slot kosong, jangan biarkan `[Algoritma 3]`.
2. **Hapus subbab yang tidak berlaku, jelaskan alasannya sekali.** Jika proyek tidak punya aplikasi, 3.6 dan 4.7–4.8 ditulis singkat ("proyek tidak mengembangkan aplikasi; deployment berupa …") atau diganti pengujian model. Jangan mengisi dengan fitur fiktif.
3. **Pilih metrik sesuai tugas ML**, bukan semua sekaligus: klasifikasi → accuracy/precision/recall/F1/confusion matrix; regresi → MAE/MSE/RMSE/R²; clustering → Silhouette (dan Davies-Bouldin bila dipakai di kode). Hanya jelaskan di BAB II metrik yang benar-benar muncul di BAB IV.
4. **Konsistensi lintas bab.** Rumusan masalah (1.3) → tujuan (1.4) → metode (BAB III) → hasil (BAB IV) → kesimpulan (5.1) harus bisa dilacak satu-satu. Kesimpulan menjawab tiap rumusan masalah dengan angka dari BAB IV.
5. **Metodologi.** Default CRISP-DM (6 tahap, 3.2.1–3.2.6) kecuali kode/README menunjukkan metode lain. Tiap tahap harus merujuk ke hal konkret di proyek, bukan teori umum.
6. **BAB II = teori, BAB IV = bukti.** Teori menjelaskan cara kerja algoritma dan rumus metrik; implementasi, parameter, dan hasil hanya di BAB IV.
7. **Pembahasan (4.6 dan 4.9)** harus menafsirkan: mengapa model A lebih baik dari B (sifat data, ukuran data, ketidakseimbangan kelas, overfitting), kelebihan/kekurangan, dan keterkaitan dengan penelitian terdahulu. Jangan hanya mengulang tabel.

### Tahap 5 — Visual, tabel, dan diagram

- **Diagram** (arsitektur 3.6, use case/activity/flowchart/DFD/ERD 3.7): hasilkan dari kode yang dibaca (route, model database, alur pipeline). Gunakan blok Mermaid pada keluaran Markdown; untuk keluaran Word, render ke gambar (mis. `mmdc`, Graphviz, atau matplotlib) bila tersedia, jika tidak sisipkan kode Mermaid di lampiran dan beri keterangan.
- **Grafik EDA/evaluasi** (4.2.3, 4.5): bila dataset dan kode tersedia, buat ulang grafik dengan matplotlib/seaborn. Bila gambar sudah ada di proyek (mis. `outputs/*.png`, output notebook), pakai itu.
- **Screenshot aplikasi (4.7)** tidak dapat dibuat dari kode saja. Sisipkan placeholder bernomor, mis. `[Gambar 4.12: Screenshot halaman utama — tempel di sini]`, dan sertakan deskripsi fitur dari kode.
- Semua gambar/tabel bernomor per bab (`Gambar 4.1`, `Tabel 4.2`), berjudul, dan **dirujuk di teks** sebelum muncul. Daftar Gambar/Tabel/Lampiran harus sesuai dengan yang ada.

### Tahap 6 — Daftar Pustaka

Jangan mengarang referensi, penulis, atau DOI. Pilihan yang diperbolehkan:
- Cari referensi nyata dengan `web_search` (jurnal/buku/dokumentasi resmi untuk algoritma, library, dan penelitian terdahulu) dan verifikasi bahwa judul/penulis/tahun cocok dengan hasil pencarian.
- Dokumentasi resmi library dan sumber dataset (Kaggle, UCI, dsb.) yang memang dipakai di kode.
- Jika tidak bisa diverifikasi, tulis placeholder `[Referensi: jurnal tentang <topik> — isi sendiri]` dan masukkan ke daftar tindak lanjut.

Gunakan gaya sitasi yang diminta dosen; bila tidak disebut, pakai IEEE bernomor `[1]` (sesuai contoh template). Tiap sitasi di teks harus ada di daftar pustaka dan sebaliknya. Bagian 2.1 Penelitian Terdahulu idealnya memuat 3–5 penelitian dalam bentuk tabel (peneliti, tahun, metode, dataset, hasil, perbedaan dengan proyek ini); jangan menulis isi penelitian yang tidak terverifikasi.

### Tahap 7 — Pemeriksaan akhir

Sebelum menyerahkan, cek:

- [ ] Semua nama model, parameter, dan angka metrik di makalah sama persis dengan kode/output.
- [ ] Tidak ada placeholder `[…]` tersisa selain yang sengaja (metadata, screenshot, referensi, nilai yang tidak bisa diambil) — dan semuanya tercantum di daftar tindak lanjut.
- [ ] Nomor bab/subbab sesuai template; Daftar Isi cocok dengan isi.
- [ ] Tiap rumusan masalah punya jawaban di 5.1; tiap tujuan punya bukti di BAB IV.
- [ ] Tabel perbandingan model memuat semua model yang dilatih, dan model terbaik di 4.6 sesuai tabel.
- [ ] Tidak ada kebocoran data yang dilaporkan sebagai hasil bagus tanpa catatan (mis. scaling sebelum split, evaluasi pada data training). Jika ditemukan, sampaikan sebagai catatan jujur di 4.9/5.2 dan ke pengguna.
- [ ] Bahasa baku, konsisten, tanpa "saya/kami" (gunakan "penulis" atau kalimat pasif).

## Format keluaran

Ikuti permintaan pengguna. Jika tidak disebut:

- Makalah akademik umumnya diserahkan sebagai **Word (.docx)**; bila pengguna meminta Word, atau akan mencetak/mengumpulkan, gunakan skill `docx`. Bila pengguna ingin dokumen yang bisa diedit dan dibagikan di sini dan tersedia fitur dokumen Claude, buat sebagai dokumen. Jika ragu, tawarkan dengan satu pertanyaan singkat bersama pertanyaan metadata di Tahap 3.
- Makalah panjang: tulis bab demi bab (satu bab per langkah), jangan satu keluaran raksasa, agar kualitas terjaga.
- Format dokumen default bila kampus tidak menentukan: Times New Roman 12 pt, spasi 1,5, rata kiri-kanan, margin kiri 4 cm / atas 3 cm / kanan 3 cm / bawah 3 cm, halaman judul–daftar memakai angka romawi kecil, isi mulai BAB I memakai angka Arab. Judul BAB kapital, tebal, rata tengah. Cantumkan kepada pengguna bahwa format ini mengikuti kebiasaan umum dan dapat disesuaikan dengan pedoman prodi.

Setelah selesai, beri ringkasan singkat (maks. beberapa kalimat) dan **daftar tindak lanjut**: metadata yang perlu diisi, screenshot yang perlu ditempel, nilai/angka yang tidak bisa diambil dari kode, referensi yang perlu dilengkapi, serta temuan masalah di kode (mis. kebocoran data, ketidakseimbangan kelas yang tidak ditangani).

## Gaya penulisan

- Bahasa Indonesia baku (PUEBI), paragraf utuh dan mengalir; hindari daftar poin untuk uraian — poin hanya untuk daftar yang memang berbentuk daftar (identifikasi masalah, tujuan, batasan, sistematika) sebagaimana template.
- Istilah asing dicetak miring pada kemunculan pertama (*machine learning*, *overfitting*); beri padanan Indonesia bila ada.
- Tulis dengan sudut pandang akademik: "Penelitian ini menggunakan …", "Berdasarkan Tabel 4.3, model Random Forest memperoleh …".
- Setiap tabel/gambar diikuti paragraf interpretasi: apa yang terlihat, apa artinya bagi tujuan proyek.
- Spesifik, bukan generik. Hindari kalimat pembuka klise ("Di era digital saat ini …") tanpa data. Latar belakang (1.1) sebaiknya berangkat dari masalah domain yang ditangani dataset, didukung referensi nyata.
- Untuk 1.1 dan 2.3, bila kode hanya menunjukkan teknisnya (mis. prediksi churn), simpulkan domain dari nama dataset/kolom, lalu tulis konteks yang wajar dan beri sitasi terverifikasi atau placeholder referensi.

## Hal yang tidak boleh dilakukan

- Mengarang angka evaluasi, jumlah data, nama dataset, fitur aplikasi, atau hasil pengujian (Black Box/UAT) yang tidak ada bukti dari kode/pengguna. Untuk 4.8, jika tidak ada bukti pengujian, buat tabel skenario uji berdasarkan fungsi yang ada di kode dengan kolom "Hasil" yang diisi hanya jika dijalankan atau diberikan pengguna.
- Mengarang kontribusi anggota kelompok (Lampiran 8); minta datanya atau beri tabel kosong.
- Menyalin teks panjang dari sumber web; parafrasekan dan beri sitasi.
- Menghapus bagian dari template secara diam-diam; setiap penghapusan/penggabungan dijelaskan singkat di ringkasan akhir.

## File referensi

- `references/template-struktur.md` — kerangka lengkap BAB I–V beserta isi yang diharapkan tiap subbab dan sumber datanya. **Baca sebelum menulis.**
- `references/ekstraksi-dari-kode.md` — cara membaca notebook/script/aplikasi dan memetakan temuan ke subbab makalah, plus pola kode yang perlu dikenali. **Baca sebelum mengekstrak fakta.**
