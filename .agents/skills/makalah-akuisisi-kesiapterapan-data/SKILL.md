---
name: makalah-akuisisi-kesiapterapan-data
description: Menyusun makalah pengumpulan data proyek mata kuliah Proyek Sains Data (bahasa Indonesia) yang membahas data yang digunakan, proses akuisisi data, profil dan kualitas data, serta kesiapterapan data pada proyek (BAB I–VI + abstrak, daftar pustaka, lampiran), minimal 10 halaman dengan grafik dan tabel. Gunakan skill ini setiap kali pengguna meminta makalah/laporan/tugas tentang "pengumpulan data projek", "akuisisi data", "deskripsi data", "profil data", "kualitas data", "kesiapterapan data", "data readiness", atau menyerahkan dataset, hasil scraping, script scraper, log pengambilan data, atau soal tugas dosen yang meminta makalah tentang data yang dipakai di projek, walaupun pengguna tidak menyebut kata "skill". Bukan untuk makalah capstone yang berisi hasil pemodelan lengkap (gunakan makalah-capstone-sains-data).
---

# Makalah Akuisisi dan Kesiapterapan Data Projek

Makalah ini menjawab tugas dosen: *satu makalah per kelompok tentang data yang digunakan, akuisisinya, dan kesiapterapannya pada projek*, minimal 10 halaman, dilengkapi grafik dan data sebagai pemaparan. Fokusnya **data**, bukan hasil model. Model, sentimen, atau rekomendasi ditulis sebagai **rencana** di BAB V; jangan menyajikan hasil pemodelan yang belum dikerjakan.

Pembeda utama dari makalah capstone: tidak ada BAB hasil evaluasi model. Sebagai gantinya, bobot terbesar ada pada (1) deskripsi dan kamus data, (2) cerita akuisisi yang jujur termasuk kendala, (3) profil dan kualitas data berbasis angka, dan (4) argumen mengapa data layak dipakai untuk projek.

## Alur kerja

### Tahap 1 — Kumpulkan bahan
Cari dan baca semua yang tersedia: soal/instruksi tugas, dataset (`.csv/.xlsx/.json`), script akuisisi (scraper, API client, notebook), log dan laporan pembersihan, README, makalah/proposal sebelumnya, dan metadata kelompok. Jika instruksi tugas atau PDF contoh format diberikan, **ikuti format contoh tersebut sebagai acuan struktur**, lalu terapkan perbaikan pada bagian "Perbaikan format" di bawah.

Tanyakan dalam **satu pesan** hal yang tidak bisa disimpulkan: judul/topik projek, nama dosen, nomor kelompok, nama dan NIM anggota, tenggat, format kirim (Word/PDF). Jika dataset tidak ada tetapi pengguna hanya punya angka, gunakan angka itu apa adanya dan tandai bagian yang belum bisa diverifikasi.

### Tahap 2 — Hitung angka dari data (jangan dari ingatan)
Semua angka di makalah harus dapat ditelusuri ke dataset, log, atau pernyataan pengguna. Jika dataset tersedia, jalankan:

```bash
python /mnt/skills/user/makalah-akuisisi-kesiapterapan-data/scripts/profil_data.py data.csv \
  --out /home/claude/profil --rating-col rating --text-col teks_ulasan \
  --date-col perkiraan_tanggal --cat-col kecamatan --id-col review_id
```
(Sesuaikan lokasi skill dan nama kolom. Skrip menghasilkan `ringkasan.json` dan grafik PNG: distribusi rating, per bulan, per kategori, panjang teks, keterisian atribut.) Lengkapi dengan analisis spesifik projek menggunakan pandas: sparsity matriks pengguna × item, korelasi Spearman antar-kolom, jumlah item di bawah ambang kecukupan, dsb. Resep pemeriksaan kualitas ada di `references/pemeriksaan-kualitas-data.md`; **baca sebelum menulis BAB IV dan V**.

Bila dataset tidak tersedia tetapi script/log ada, ambil angka dari log (mis. `laporan_pembersihan.txt`). Bila tidak ada keduanya, jangan mengarang: tulis `[ISI: …]` dan daftarkan sebagai tindak lanjut.

### Tahap 3 — Susun kerangka dan tulis
Struktur lengkap dan isi tiap subbab ada di `references/struktur-makalah-data.md`; **baca sebelum menulis**. Ringkasnya:

- Halaman judul → Abstrak (+ kata kunci) → Daftar Isi / Gambar / Tabel
- **BAB I** Pendahuluan: latar belakang, rumusan masalah, tujuan, manfaat, ruang lingkup
- **BAB II** Deskripsi Data: sumber, jenis, dataset yang dihasilkan, kamus data
- **BAB III** Akuisisi Data: perangkat, tahapan, kendala dan penanganan, etika dan keamanan
- **BAB IV** Profil dan Kualitas Data: statistik, sebaran, distribusi, kelengkapan, matriks kualitas
- **BAB V** Kesiapterapan Data pada Projek: arsitektur rencana, pemetaan data ke modul, kesiapan per modul, mitigasi keterbatasan, rencana tahap berikutnya
- **BAB VI** Penutup: kesimpulan, saran
- Daftar Pustaka → Lampiran

Tulis bab demi bab. Tiap bab diawali paragraf pengantar yang menyebut isi bab, dan ditutup paragraf penghubung ke bab berikutnya bila perlu.

### Tahap 4 — Grafik dan tabel
Gunakan grafik dari skrip atau buat sendiri dengan matplotlib: gaya sederhana, satu warna sorot untuk temuan utama dan abu-abu untuk lainnya, judul yang menyatakan temuan ("86,4% ulasan memberi bintang 5"), label sumbu, sumber/jumlah n di subjudul. Wajib ada minimal: diagram alur akuisisi (corong/funnel dengan jumlah data tiap tahap), distribusi nilai/rating, sebaran kategori atau wilayah, distribusi waktu bila ada kolom tanggal, kelengkapan atribut, dan diagram alur data → rencana pemodelan (BAB V). Setiap gambar dan tabel: bernomor per bab, berjudul, **dirujuk di teks sebelum muncul**, dan diikuti paragraf interpretasi (apa yang terlihat dan apa implikasinya bagi projek). Keterangan tabel di atas tabel, keterangan gambar di bawah gambar.

### Tahap 5 — Daftar pustaka
Makalah data tetap perlu landasan: referensi tentang masalah domain, teknik akuisisi/etika scraping (bila ada), sparsity dan cold-start pada sistem rekomendasi atau konsep serupa sesuai projek, dan kualitas data (dimensi kualitas). Cari dengan `web_search`, verifikasi judul/penulis/tahun dari hasil pencarian, dan jangan mengarang referensi atau DOI. Minimal 8–10 referensi bila memungkinkan, gaya IEEE bernomor kecuali dosen meminta lain. Referensi yang tak bisa diverifikasi ditulis sebagai placeholder dan dicatat di daftar tindak lanjut. Sitasi di teks dan daftar pustaka harus saling cocok. Dokumentasi resmi platform sumber data dan halaman dataset boleh dikutip.

### Tahap 6 — Pemeriksaan akhir
- [ ] **Rekonsiliasi angka**: seluruh angka yang berkaitan harus saling cocok (lihat daftar di `references/pemeriksaan-kualitas-data.md`). Contoh: jumlah data tiap tahap pembersihan menurun runtut, kategori/kecamatan/bulan berjumlah sama dengan totalnya, persentase menjumlah ≈ 100%, angka di abstrak = angka di bab isi = angka di lampiran.
- [ ] Istilah konsisten (pilih satu: "kafe" atau "cafe", "projek" atau "proyek", dan pakai terus).
- [ ] Penomoran bab/subbab berurutan tanpa lompatan; Daftar Isi, Daftar Gambar, Daftar Tabel sesuai isi.
- [ ] Semua gambar/tabel dirujuk dan ditafsirkan; tidak ada judul tabel ganda atau salah ketik penomoran.
- [ ] Rumusan masalah ↔ tujuan ↔ kesimpulan terjawab satu-satu.
- [ ] Tidak ada klaim hasil model yang belum ada; rencana ditulis sebagai rencana.
- [ ] Panjang minimal 10 halaman (isi, tidak termasuk cover, daftar, lampiran bila dosen menghitung demikian — penuhi kedua cara bila bisa). Jika dikonversi ke PDF, hitung halaman sebenarnya.
- [ ] Tidak ada data pribadi (nama pengulas, akun) dalam teks, contoh, atau lampiran.

## Perbaikan format dibanding makalah contoh

Gunakan struktur contoh sebagai dasar, tetapi perbaiki hal berikut karena sering muncul dan mengurangi mutu:

1. Tambahkan **Daftar Isi, Daftar Gambar, Daftar Tabel** dan **Daftar Pustaka** (contoh tidak memilikinya). Tambahkan Kata Pengantar singkat bila tidak melanggar format dosen.
2. Penomoran subbab harus **berurutan** (contoh melompat dari 3.2 ke 3.7). Bila bagian dihapus, nomor ulang.
3. Tabel dan gambar: gaya penomoran satu jenis ("Tabel 3.1", bukan "Tabel 3. 1"), tabel ber-header tebal, keterangan konsisten posisinya, dan tidak ada kutipan tabel tanpa rujukan di teks.
4. Gunakan "Gambar x.y" untuk semua diagram (jangan campur "Diagram 5.1"), dan tulis sumber data pada gambar.
5. Rumusan masalah menyebut pertanyaan yang benar-benar dijawab makalah **data** (pengumpulan, kualitas, kesiapan), bukan pertanyaan tentang performa model yang belum dikerjakan; pertanyaan tentang model dipindah ke "rencana".
6. Abstrak 150–250 kata, satu paragraf, urutan: masalah → data/akuisisi → temuan kualitas → kesimpulan kesiapan; angka yang sama dengan isi.
7. Bagian "Manfaat" ringkas dan relevan; hindari poin yang hanya menyatakan manfaat pembuatan tugas.
8. Rekonsiliasi jumlah: bila total berubah antar tahap (mis. 1.050 daftar vs 1.004 berulasan), jelaskan selisihnya di satu tempat dengan perhitungan (1.050 − 44 − 2 = 1.004) dan rujuk konsisten.
9. Tambahkan "Keterbatasan penelitian data" dan "Reprodusibilitas" (versi, tanggal akuisisi, cara mengulang) agar makalah lebih meyakinkan.
10. Format dokumen: Times New Roman 12, spasi 1,5, margin 4-3-3-3, nomor halaman (romawi kecil awal, angka Arab mulai BAB I), judul BAB kapital tebal rata tengah, cover dengan logo kampus bila pengguna menyediakan. Ikuti pedoman prodi jika ada.

## Format keluaran

Tugas dikirim ke dosen sebagai berkas (umumnya PDF atau Word). Default: buat **.docx** dengan skill `docx` (baca SKILL.md-nya dulu), sisipkan grafik PNG, tabel Word asli, dan Daftar Isi otomatis; lalu konversi ke **PDF** (LibreOffice) bila pengguna menyebut PDF atau tidak menentukan, dan hitung jumlah halaman. Serahkan kedua berkas dengan `present_files`. Bila pengguna hanya ingin teks untuk ditempel, berikan Markdown.

Setelah selesai, ringkas dalam beberapa kalimat dan beri **daftar tindak lanjut**: data pribadi anggota yang masih placeholder, logo, referensi yang perlu diverifikasi, angka yang tidak bisa diambil dari bahan, serta temuan ketidakkonsistenan data/angka yang ditemukan saat rekonsiliasi.

## Gaya penulisan

- Bahasa Indonesia baku, sudut pandang "penulis"/"tim"/pasif; konsisten.
- Paragraf utuh; poin hanya untuk daftar yang memang daftar (rumusan, tujuan, kesimpulan, saran, langkah).
- Setiap bagian menjawab "lalu apa artinya bagi projek": jangan berhenti di deskripsi angka.
- Latar belakang berangkat dari masalah nyata dan angka dari data, bukan klise pembuka.
- Kisah akuisisi ditulis kronologis dan jujur: apa yang dicoba, apa yang gagal, bagaimana diatasi. Bagian kendala dan etika memberi bobot ilmiah.
- Istilah asing dicetak miring pada kemunculan pertama.
- Hindari kalimat promosi berlebihan ("sangat kuat", "sempurna") tanpa dasar angka.

## Hal yang tidak boleh dilakukan

- Mengarang angka, jumlah data, nama file, atau proses akuisisi yang tidak ada di bahan.
- Menampilkan nama/akun pengulas atau data pribadi lain.
- Mengklaim hasil evaluasi model, akurasi, atau hasil rekomendasi yang belum ada.
- Menyalin teks panjang dari sumber lain; parafrasekan dan beri sitasi.
- Menghilangkan kendala/keterbatasan data demi terlihat bagus; sampaikan jujur dan sertakan mitigasinya.

## File referensi

- `references/struktur-makalah-data.md` — kerangka BAB I–VI beserta isi, tabel, dan gambar yang diharapkan tiap subbab. **Baca sebelum menulis.**
- `references/pemeriksaan-kualitas-data.md` — resep analisis kualitas dan kesiapterapan (pandas) dan daftar rekonsiliasi angka. **Baca sebelum menulis BAB IV–V.**
- `scripts/profil_data.py` — profiling dataset dan pembuatan grafik dasar.
