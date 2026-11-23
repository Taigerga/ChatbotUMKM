# Seller CV — Asisten Katalog dari Foto Rak

## Intent
Bantu Penjual membuat atau mencocokkan produk katalog dari **satu foto rak yang berisi banyak produk**. Dataset PhantomStock dipakai sebagai kosakata pengenalan, bukan sebagai sumber kebenaran stok.

## Goals
- MVP: (1) Asisten Katalog dari Foto Rak, (2) deteksi produk + kotak + confidence, (3) mapping kelas ↔ `productId`, (4) riwayat usulan/scan.
- Satu foto menghasilkan banyak kotak; tiap kotak jadi satu usulan produk.
- Penjual memilih usulan: petakan ke produk existing atau buat produk baru.
- Semua data scan/mapping terikat tenant.
- Fitur opsional no.8 (model khusus per Penjual) disediakan sebagai opt-in, bukan jalur utama.

## Non-goals
- Auto-update stok, harga, atau SKU dari deteksi.
- Menyatakan "10 box" sebagai "stok 10".
- OCR/barcode/expiry, tata letak rak, close-up satu produk.
- Fitur Pembeli (rencana terpisah, setelah Penjual selesai).
- Mengubah 5 model ML yang ada.

## Anti-goals
- Hasil deteksi ditampilkan sebagai fakta tanpa confidence dan konfirmasi Penjual.
- Kelas langka dianggap akurat; 1.090 dari 1.114 kelas punya <100 sampel.

## Constraints
- Dataset: `data/computervision/PhantomStock.v1i.yolo26`, 14.952 gambar, 1.114 kelas, ~186.649 box. Masalah: 25 label kosong, 3.178 box di luar frame, 1 box ber-ukuran nol, leakage sumber video antar-split. Cleaning + split ulang wajib sebelum training.
- Belum ada checkpoint. Training dari `yolo26n.pt`, `imgsz=640`, `conf=0.25`.
- Lisensi Ultralytics (AGPL vs Enterprise) harus diklarifikasi sebelum produksi.
- Stack: Next.js 16 App Router, NestJS 12 + Prisma/MariaDB, FastAPI. CV service terpisah dari `ml/` agar dependency torch/ultralytics tidak menyentuh 5 model existing.
- Auth: JWT cookie `token` + header `x-tenant-id`. Semua endpoint CV memakai `JwtAuthGuard` + `TenantGuard`.
- Upload gambar: JPEG/PNG/WEBP, maksimal 10 MB per file. Validasi tipe dan ukuran di server wajib. Kamera browser butuh HTTPS; upload tetap tersedia sebagai fallback.
- Bytes gambar tidak disimpan. Riwayat menyimpan metadata + deteksi; preview hanya di browser saat scan.
- Tanpa kamera: mode kamera disembunyikan, upload tetap jalan.

## Approaches
**A. Model umum PhantomStock + mapping manual (dipilih).** Latih satu YOLO26n untuk 1.114 kelas. Penjual memetakan kelas ke produk tenant. Ringan, satu training, CPU cukup, tidak peduli tata letak rak. Risiko: domain gap dan kelas langka; ditutup dengan konfirmasi Penjual.

**B. Model khusus per Penjual (opsional, tahap lanjut).** Fine-tune dengan 30–50 foto rak tenant yang dianotasi pakai SKU sendiri. Output langsung `productId`. Biaya: foto, anotasi, training, dan weight per tenant. Tidak menggantikan A; diaktifkan hanya jika Penjual memilih.

Ditolak: hitung box sebagai stok (occlusion/dobel box), OCR/barcode (di luar YOLO), cek tata letak rak (butuh segmentasi rak), foto close-up satu produk (domain dataset bukan close-up).

## Decisions
- No.5 = "terdeteksi / tidak terdeteksi" per produk yang dipetakan, plus confidence.
- No.7 = jumlah box per kelas, diberi label jelas "box terdeteksi", bukan "stok".
- No.8 = fitur opsional opt-in Penjual, ditandai beta, tidak memblokir MVP.
- Buat produk baru dari usulan tetap melalui form katalog biasa; nama kelas hanya mengisi saran.

## Left to builder
Struktur file, nama endpoint, skema Prisma, dan test mengikuti rencana implementasi. Detail UI final mengikuti pola komponen yang ada.
