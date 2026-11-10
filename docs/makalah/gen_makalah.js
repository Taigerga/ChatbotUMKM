const {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun,
  PageBreak, AlignmentType, WidthType, ShadingType, Footer, SimpleField
} = require("docx");
const fs = require("fs");
const path = require("path");
const PX_PER_IN = 96;

const TNR = "Times New Roman";
const BODY = 24;            // 12 pt
const MARGIN = { top: 2268, bottom: 1701, left: 1701, right: 1701 }; // UNIKOM 4-3-3-3 cm
const TEXT = "#1f2937";
const HEAD = "#0f172a";
const FILL = "eef2f7";

// ---------- Paragraph helpers
const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: opts.size || BODY, font: TNR, bold: !!opts.bold, italics: !!opts.italics, color: opts.color || TEXT })],
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { line: 360, before: opts.before || 0, after: opts.after ?? 120 }
});
const spacing = (pts = 160) => new Paragraph({ text: "", spacing: { before: pts, after: 0 } });
const caption = (text) => new Paragraph({
  children: [new TextRun({ text, size: 20, font: TNR, italics: true, color: "5b6470" })],
  alignment: AlignmentType.CENTER, spacing: { line: 300, before: 100, after: 160 }
});
const h1 = (text) => { listCounter = 0; return new Paragraph({
  heading: "Heading1", style: "Heading1",
  children: [new TextRun({ text, size: 28, font: TNR, bold: true, color: HEAD })],
  alignment: AlignmentType.CENTER, spacing: { line: 340, before: 40, after: 220 }
}); };
const h2 = (text) => { listCounter = 0; return new Paragraph({
  heading: "Heading2", style: "Heading2",
  children: [new TextRun({ text, size: 25, font: TNR, bold: true, color: HEAD })],
  spacing: { line: 320, before: 170, after: 110 }
}); };

// ---------- Image helper (keep aspect ratio)
const imgCache = {};
function readPngSize(fp) {
  const b = fs.readFileSync(fp);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const image = (filename, widthIn = 5.6) => {
  const imgPath = path.join(__dirname, "assets", filename);
  const data = fs.readFileSync(imgPath);
  if (!imgCache[filename]) imgCache[filename] = readPngSize(imgPath);
  const { w, h } = imgCache[filename];
  const TWIPS_PER_INCH = 1440;
  const widthTwips = Math.round(widthIn * TWIPS_PER_INCH);
  const heightTwips = Math.round((widthTwips * h) / w);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 90, after: 20 },
    children: [new ImageRun({ type: "png", data, transformation: { width: widthTwips, height: heightTwips } })]
  });
};

// ---------- Table helpers
const cell = (text, { bold = false, fill = "FFFFFF", align = AlignmentType.LEFT, size = 20 } = {}) => new TableCell({
  shading: { type: ShadingType.CLEAR, fill, color: "auto" },
  margins: { top: 70, bottom: 70, left: 90, right: 90 },
  children: [new Paragraph({
    children: [new TextRun({ text, size, font: TNR, bold, color: "1f2937" })],
    alignment: align, spacing: { line: 276, before: 10, after: 10 }
  })]
});
const table = (headers, rows, widths, size = 20) => {
  const TOTAL = 8504; // A4 lebar 11906 - margin kiri+kanan 1701*2
  const sum = widths.reduce((a, b) => a + b, 0);
  const scaled = widths.map(w => Math.round((w * TOTAL) / sum));
  const layout = { columnWidths: scaled };
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    layout: "fixed",
    ...layout,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((x, i) => cell(String(x), { bold: true, fill: FILL, align: AlignmentType.CENTER, size })) }),
      ...rows.map(r => new TableRow({ children: r.map((x, i) => cell(String(x), { size })) }))
    ]
  });
};

// ---------- Bullets & manual numbering (counter resets per heading)
const bullet = (text, level = 0) => new Paragraph({
  children: [new TextRun({ text, size: BODY, font: TNR, color: TEXT })],
  bullet: { level }, spacing: { line: 340, after: 45 }, indent: { left: 520 + level * 260, hanging: 200 }
});
let listCounter = 0;
const numbered = (text) => {
  listCounter += 1;
  return new Paragraph({
    children: [new TextRun({ text: `${listCounter}.  ${text}`, size: BODY, font: TNR, color: TEXT })],
    indent: { left: 360, hanging: 300 },
    spacing: { line: 340, after: 45 }
  });
};

// ---------- Footer with page number (format set per section)
const footer = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 40, after: 0 },
    children: [new TextRun({ children: [new SimpleField({ instruction: "PAGE" })], size: 18, font: TNR, color: "6b7280" })]
  })]
});
// ================= BAGIAN DEPAN (front matter) =================
const front = [
  new Paragraph({ text: "", spacing: { line: 220, before: 700, after: 0 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: "MAKALAH PROYEK SAINS DATA", bold: true, size: 28, font: TNR, color: HEAD, characterSpacing: 6 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 90, after: 0 },
    children: [new TextRun({ text: "Chatbot Analitik UMKM Berbasis", bold: true, size: 36, font: TNR, color: HEAD })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 130 },
    children: [new TextRun({ text: "AI dan Machine Learning", bold: true, size: 36, font: TNR, color: HEAD })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 220 },
    border: { bottom: { style: "single", size: 8, space: 6, color: "1f4e5f" } },
    children: [new TextRun({ text: "Akuisisi dan Kesiapterapan Data", size: 24, font: TNR, color: "5b6470", italics: true })]
  }),

  p("Disusun untuk memenuhi tugas mata kuliah Proyek Sains Data", { align: AlignmentType.CENTER, color: TEXT, after: 340 }),
  p("Dosen Pengampu", { align: AlignmentType.CENTER, bold: true, color: HEAD, after: 20 }),
  p("Assoc. Prof. Dr. Irawan Afrianto, S.T., M.T.", { align: AlignmentType.CENTER, after: 340 }),

  p("Disusun oleh", { align: AlignmentType.CENTER, bold: true, color: HEAD, after: 20 }),
  p("Kelompok 3", { align: AlignmentType.CENTER, bold: true, color: HEAD, after: 20 }),
  p("Muhammad Rizki Sisaya", { align: AlignmentType.CENTER, after: 420 }),

  new Paragraph({ text: "", spacing: { before: 380, after: 0 } }),
  p("PROGRAM STUDI TEKNIK INFORMATIKA", { align: AlignmentType.CENTER, bold: true, after: 20 }),
  p("FAKULTAS TEKNIK DAN ILMU KOMPUTER", { align: AlignmentType.CENTER, bold: true, after: 20 }),
  p("UNIVERSITAS KOMPUTER INDONESIA (UNIKOM)", { align: AlignmentType.CENTER, bold: true, after: 20 }),
  p("2026", { align: AlignmentType.CENTER, bold: true, color: HEAD, after: 0 }),
  new Paragraph({ children: [new PageBreak()] })
];

// ================= ABSTRAK =================
const abstract = [
  h1("ABSTRAK"),
  p("Makalah ini melaporkan akuisisi, profil, kesiapterapan, dan hasil pelatihan lima model machine learning pada projek Chatbot Analitik UMKM Berbasis AI dan Machine Learning. Data yang digunakan adalah dataset publik E-commerce Sales & Customer Analytics dari Kaggle (diunduh 10 Oktober 2026): lima berkas CSV, 46 kolom utama pada tabel transaksi, 138.116 transaksi, 24.911 pelanggan unik, 1.175 produk, periode 2021–2025. Tahapan meliputi akuisisi dan verifikasi berkas, profiling otomatis, pemeriksaan kualitas enam dimensi, pemetaan kolom terhadap kelima model, dan pelatihan model global (1 November 2026). Hasil menunjukkan berkas bersih terbaca sempurna (0 karakter rusak, 0 duplikat baris penuh, 0 duplikat order_id) dan agregat konsisten persis dengan ringkasan resmi dataset (net_sales $177.134.263,74; profit $76.146.395,76; AOV $1.282,50). Kesiapterapan: forecasting layak dijalankan tetapi hasilnya kalah dari baseline naïve (MAPE 31,17% vs 11,47%) sehingga berstatus terbatas; RFM + K-Means layak (silhouette 0,3519; k = 3); asosiasi keranjang 2-item layak dengan catatan (min_support 1e-05, 200 aturan, hanya pasangan 2-item); prediksi churn berstatus terbatas (PR-AUC 0,3324, di bawah 0,5); deteksi anomali layak dengan metode statistik (median + MAD; ambang |z| ≥ 3,5). Kolom berisiko data leakage (customer_lifetime_value, customer_order_count, is_repeat_customer) tidak dipakai sebagai fitur. Kesimpulan: data layak dipakai untuk membangun baseline model global, tetapi dua model (forecasting dan churn) belum layak dijadikan dasar keputusan; generalisasi ke toko nyata menuntut kalibrasi dan validasi dengan data tenant.", { after: 180 }),
  p("Kata Kunci: akuisisi data, kualitas data, kesiapterapan, machine learning, UMKM, e-commerce", { italics: true, after: 0, color: "5b6470" }),
  new Paragraph({ children: [new PageBreak()] })
];

// ================= KATA PENGANTAR + DAFTAR =================
const frontLists = [
  h1("KATA PENGANTAR"),
  p("Puji syukur penulis panjatkan ke hadirat Tuhan Yang Maha Esa karena makalah dengan judul “Chatbot Analitik UMKM Berbasis AI dan Machine Learning: Akuisisi dan Kesiapterapan Data” dapat diselesaikan. Makalah ini disusun untuk memenuhi tugas mata kuliah Proyek Sains Data dan mendokumentasikan akuisisi data, profil dan kualitas dataset, kesiapterapan untuk kelima model machine learning, serta hasil pelatihan model global."),
  p("Penulis mengucapkan terima kasih kepada dosen pengampu Assoc. Prof. Dr. Irawan Afrianto, S.T., M.T. atas arahan selama pengerjaan. Penulis juga menyadari makalah ini masih memiliki kekurangan; masukan dan kritik yang membangun sangat diharapkan."),
  p("Bandung, 6 November 2026", { align: AlignmentType.RIGHT, after: 20 }),
  p("Tim Penyusun", { align: AlignmentType.RIGHT, after: 0 }),
  new Paragraph({ children: [new PageBreak()] }),

  h1("DAFTAR ISI"),
  p("ABSTRAK", { after: 40, color: TEXT }),
  p("KATA PENGANTAR", { after: 40, color: TEXT }),
  p("DAFTAR ISI", { after: 40, color: TEXT }),
  p("DAFTAR GAMBAR", { after: 40, color: TEXT }),
  p("DAFTAR TABEL", { after: 40, color: TEXT }),
  p("BAB I. PENDAHULUAN", { after: 30, color: TEXT }),
  p("    1.1 Latar Belakang", { after: 20, color: TEXT }),
  p("    1.2 Rumusan Masalah", { after: 20, color: TEXT }),
  p("    1.3 Tujuan", { after: 20, color: TEXT }),
  p("    1.4 Manfaat", { after: 20, color: TEXT }),
  p("    1.5 Ruang Lingkup", { after: 40, color: TEXT }),
  p("BAB II. DESKRIPSI DATA", { after: 30, color: TEXT }),
  p("    2.1 Sumber Data", { after: 20, color: TEXT }),
  p("    2.2 Jenis Data", { after: 20, color: TEXT }),
  p("    2.3 Dataset yang Dihasilkan dan Relasinya", { after: 20, color: TEXT }),
  p("    2.4 Kamus Data", { after: 40, color: TEXT }),
  p("BAB III. AKUISISI DATA", { after: 30, color: TEXT }),
  p("    3.1 Perangkat yang Digunakan", { after: 20, color: TEXT }),
  p("    3.2 Tahapan Akuisisi", { after: 20, color: TEXT }),
  p("    3.3 Kendala dan Penanganan", { after: 20, color: TEXT }),
  p("    3.4 Etika dan Keamanan Data", { after: 20, color: TEXT }),
  p("    3.5 Reprodusibilitas", { after: 40, color: TEXT }),
  p("BAB IV. PROFIL DAN KUALITAS DATA", { after: 30, color: TEXT }),
  p("    4.1 Ringkasan Statistik", { after: 20, color: TEXT }),
  p("    4.2 Komposisi Status Order dan Katalog Produk", { after: 20, color: TEXT }),
  p("    4.3 Distribusi Temporal", { after: 20, color: TEXT }),
  p("    4.4 Kelengkapan Atribut", { after: 20, color: TEXT }),
  p("    4.5 Pemeriksaan Kualitas Data", { after: 20, color: TEXT }),
  p("    4.6 Kesesuaian Dataset terhadap Lima Model", { after: 40, color: TEXT }),
  p("BAB V. KESIAPTERAPAN DATA PADA PROJEK", { after: 30, color: TEXT }),
  p("    5.1 Arsitektur Sistem", { after: 20, color: TEXT }),
  p("    5.2 Pemetaan Data ke Model Machine Learning", { after: 20, color: TEXT }),
  p("    5.3 Forecasting Penjualan (Modul 1)", { after: 20, color: TEXT }),
  p("    5.4 RFM + K-Means (Modul 2)", { after: 20, color: TEXT }),
  p("    5.5 Asosiasi Keranjang 2-Item (Modul 3)", { after: 20, color: TEXT }),
  p("    5.6 Prediksi Churn (Modul 4)", { after: 20, color: TEXT }),
  p("    5.7 Deteksi Anomali (Modul 5)", { after: 20, color: TEXT }),
  p("    5.8 Mitigasi Keterbatasan Data", { after: 20, color: TEXT }),
  p("    5.9 Status Implementasi dan Langkah Selanjutnya", { after: 40, color: TEXT }),
  p("BAB VI. PENUTUP", { after: 30, color: TEXT }),
  p("    6.1 Kesimpulan", { after: 20, color: TEXT }),
  p("    6.2 Saran", { after: 40, color: TEXT }),
  p("DAFTAR PUSTAKA", { after: 40, color: TEXT }),
  p("LAMPIRAN A. Statistik Deskriptif Per Kolom", { after: 20, color: TEXT }),
  p("LAMPIRAN B. Ringkasan Hasil Pelatihan Model Global", { after: 0, color: TEXT }),
  new Paragraph({ children: [new PageBreak()] }),

  h1("DAFTAR GAMBAR"),
  p("Gambar 3.1  Corong akuisisi data", { after: 40, color: TEXT }),
  p("Gambar 4.1  Komposisi status order", { after: 40, color: TEXT }),
  p("Gambar 4.2  Sebaran kategori produk", { after: 40, color: TEXT }),
  p("Gambar 4.3  Jumlah transaksi per bulan (2021–2025)", { after: 40, color: TEXT }),
  p("Gambar 4.4  Keterisian atribut pasca-transaksi dan marketing", { after: 40, color: TEXT }),
  p("Gambar 5.1  Arsitektur data–model–aplikasi", { after: 0, color: TEXT }),
  new Paragraph({ children: [new PageBreak()] }),

  h1("DAFTAR TABEL"),
  p("Tabel 2.1  Sumber data dan cara akses", { after: 40, color: TEXT }),
  p("Tabel 2.2  Jenis data dan contoh atribut", { after: 40, color: TEXT }),
  p("Tabel 2.3  Dataset yang dihasilkan dan relasi", { after: 40, color: TEXT }),
  p("Tabel 2.4  Kamus data ecommerce_sales_customer_analytics_150k.csv", { after: 40, color: TEXT }),
  p("Tabel 2.5  Kamus data order_items.csv", { after: 40, color: TEXT }),
  p("Tabel 2.6  Kamus data customer_master.csv", { after: 40, color: TEXT }),
  p("Tabel 2.7  Kamus data product_catalog.csv", { after: 40, color: TEXT }),
  p("Tabel 2.8  Kamus data dataset_statistics.csv", { after: 40, color: TEXT }),
  p("Tabel 3.1  Perangkat yang digunakan dalam akuisisi", { after: 40, color: TEXT }),
  p("Tabel 3.2  Kendala akuisisi dan penanganannya", { after: 40, color: TEXT }),
  p("Tabel 4.1  Ringkasan statistik utama", { after: 40, color: TEXT }),
  p("Tabel 4.2  Matriks kualitas data enam dimensi", { after: 40, color: TEXT }),
  p("Tabel 4.3  Kesesuaian dataset terhadap kelima model", { after: 40, color: TEXT }),
  p("Tabel 5.1  Pemetaan data ke model machine learning dan status pelatihan", { after: 40, color: TEXT }),
  p("Tabel 5.2  Mitigasi keterbatasan data", { after: 0, color: TEXT }),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= BAB I =================
const bab1 = [
  h1("BAB I.\nPENDAHULUAN".replace("\n", " ")),
  h2("1.1 Latar Belakang"),
  p("Pemilik toko dan pelaku UMKM di Indonesia menghadapi penumpukan data transaksi tanpa alat analisis yang mudah dipakai. Catatan penjualan, pelanggan, dan produk tersimpan rapi di aplikasi, tetapi pemilik tidak punya cara cepat untuk menjawab pertanyaan sehari-hari: produk apa yang paling laku, pelanggan mana yang berhenti membeli, dan berapa perkiraan penjualan bulan depan. Solusi yang tersedia umumnya berupa dashboard kompleks yang menuntut literasi analitik tinggi."),
  p("Projek Chatbot Analitik UMKM menjawab masalah itu lewat antarmuka percakapan. Pemilik toko dapat mencatat penjualan atau bertanya performa usaha dengan bahasa sehari-hari; sistem lalu mengusulkan tindakan terstruktur (dengan konfirmasi) atau menjawab berdasarkan data nyata, bukan karangan. Di balik antarmuka itu dibutuhkan lima model machine learning: forecasting penjualan, segmentasi RFM + K-Means, asosiasi keranjang (market basket), prediksi churn, dan deteksi anomali."),
  p("Sebelum model dilatih, data harus dipastikan layak. Data yang dipakai untuk training adalah dataset publik E-commerce Sales & Customer Analytics dari Kaggle (pengunggah: datascikhan; URL pada Daftar Pustaka), diunduh manual pada 10 Oktober 2026, terdiri atas lima berkas CSV. Data tenant nyata belum tersedia pada tahap training model global; dataset publik dipakai sebagai bahan training model global, sedangkan data tenant dikelola terpisah di MySQL dan dipakai saat inferensi per toko."),
  p("Pemeriksaan menunjukkan kualitas struktural sangat baik (0 karakter rusak, 0 duplikat, ID unik), tetapi komposisi data tidak seimbang — 82,22% order berstatus Completed dan distribusi negara didominasi Amerika Serikat (59,8%). Konsistensi agregat terbukti persis: total net_sales $177.134.263,74 sama dengan nilai pada dataset_statistics.csv, demikian pula profit $76.146.395,76 dan average order value $1.282,50. Temuan ini menentukan pendekatan modeling: kelas timpang harus ditangani eksplisit, dan kolom yang dihitung dari seluruh histori (mis. customer_lifetime_value) tidak boleh menjadi fitur."),
  p("Makalah ini melaporkan akuisisi data, profil dan kualitas berbasis angka, penilaian kesiapterapan kelima model, dan hasil pelatihan model global (1 November 2026). Hasil pelatihan dilaporkan apa adanya, termasuk dua model yang belum layak dijadikan dasar keputusan."),

  h2("1.2 Rumusan Masalah"),
  numbered("Data apa yang digunakan projek dan bagaimana cara akuisisinya?"),
  numbered("Bagaimana profil dan kualitas data tersebut (keunikan, kelengkapan, validitas, konsistensi, ketepatan waktu, dan keseimbangan)?"),
  numbered("Kolom mana yang layak dipakai untuk tiap model machine learning, dan mana yang berisiko data leakage?"),
  numbered("Apakah data siap dipakai untuk kelima model, dan bagaimana hasil pelatihan model global?"),
  numbered("Bagaimana arsitektur alur data dari sumber hingga menjadi insight yang disajikan ke pemilik toko?"),

  h2("1.3 Tujuan"),
  numbered("Menggambarkan sumber, jenis, dan struktur dataset yang dipakai projek."),
  numbered("Mendokumentasikan tahapan akuisisi berikut kendala dan penanganannya."),
  numbered("Mengukur profil dan kualitas data secara numerik dengan enam dimensi kualitas."),
  numbered("Menyusun matriks kesesuaian kolom terhadap kelima model dan menandai kolom berisiko leakage."),
  numbered("Menilai kesiapterapan kelima model dan melaporkan hasil pelatihan model global secara jujur."),
  numbered("Merancang arsitektur alur data–model–aplikasi dan menetapkan batas pemakaian model global."),

  h2("1.4 Manfaat"),
  bullet("Bagi pemilik toko: dasar bahwa insight yang muncul dibangun dari data yang sudah diaudit, bukan asumsi."),
  bullet("Bagi tim pengembang: gerbang kualitas sebelum training; daftar kolom yang boleh/tidak boleh dipakai; mitigasi eksplisit untuk kelas timpang."),
  bullet("Bagi pembaca akademik: contoh audit data publik untuk kebutuhan machine learning, termasuk cara melaporkan keterbatasan dan hasil yang belum layak secara jujur."),

  h2("1.5 Ruang Lingkup"),
  bullet("Objek: lima berkas CSV E-commerce Sales & Customer Analytics (Kaggle) — ecommerce_sales_customer_analytics_150k.csv, order_items.csv, customer_master.csv, product_catalog.csv, dataset_statistics.csv."),
  bullet("Periode data: 1 Januari 2021 sampai 31 Desember 2025 (1.826 tanggal unik)."),
  bullet("Aspek yang dibahas: akuisisi, profil, kualitas, kesiapterapan, serta hasil pelatihan model global (1 November 2026) yang dilaporkan apa adanya."),
  bullet("Data tenant nyata tidak termasuk dalam makalah ini; pembahasan data tenant dibatasi pada peran arsitektural (isolasi per toko) dan contoh pelatihan per tenant yang disebutkan sebagai konteks, bukan sebagai hasil tervalidasi."),
  bullet("Bahasa: Indonesia; nama kolom dan nilai data ditulis persis seperti pada dataset (Bahasa Inggris)."),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= BAB II =================
const bab2 = [
  h1("BAB II. DESKRIPSI DATA"),
  h2("2.1 Sumber Data"),
  p("Sumber utama adalah dataset publik “E-Commerce Sales Analytics Dataset” (slug: datascikhan/e-commerce-sales-and-customer-analytics) di Kaggle, diunggah oleh akun datascikhan. Berkas diunduh manual melalui peramban pada 10 Oktober 2026 (cap waktu berkas 10/10/2026 20:53–20:54). Tidak ada kredensial atau API key yang dipakai; dataset bersifat publik dan dapat diakses tanpa login. Lampiran B memuat perintah untuk mengunduh ulang dan memverifikasi berkas."),
  table(
    ["Elemen", "Keterangan"],
    [
      ["Sumber", "Kaggle — datascikhan/e-commerce-sales-and-customer-analytics"],
      ["Judul halaman", "E-Commerce Sales Analytics Dataset (judul terverifikasi dari halaman dataset)"],
      ["Cara akses", "Unduh manual via peramban; tidak memakai API/scraper"],
      ["Tanggal unduh", "10 Oktober 2026"],
      ["Format", "5 berkas CSV, total ±88,6 MB (88.588.135 byte)"],
      ["Lisensi/izin", "Dataset publik Kaggle; dipakai untuk keperluan akademik projek"],
      ["Isi", "Transaksi e-commerce multi-komoditas lintas 7 negara (USA, UK, Germany, Canada, Australia, India, UAE), 2021–2025"]
    ],
    [2400, 6360]
  ),
  spacing(60),
  caption("Tabel 2.1  Sumber data dan cara akses"),

  h2("2.2 Jenis Data"),
  table(
    ["Jenis", "Contoh atribut", "Keterangan"],
    [
      ["Temporal", "order_date, order_time, Date Range", "Format YYYY-MM-DD; 1.826 tanggal unik; dipakai forecasting dan RFM"],
      ["Numerik kontinu", "net_sales, gross_sales, profit, profit_margin_percentage", "Nilai uang USD; dapat negatif pada profit (-1.281,59 s.d. 7.083,68)"],
      ["Numerik diskrit", "quantity, loyalty_points_earned, customer_order_count", "quantity 1–24; customer_order_count 1–20"],
      ["Kategorikal", "order_status, customer_segment, customer_country, sales_channel", "order_status: 4 nilai; segment: 4; country: 7 (USA 59,8%)"],
      ["Identitas (anonim)", "order_id, customer_id, product_id", "Format ORD-/CUST-/PROD- + angka; tidak memuat PII nyata"],
      ["Teks bebas", "customer_review, campaign_name", "Ulasan singkat, median 5 kata; campaign 39,7% terisi"],
      ["Geospasial (nominal)", "customer_city, customer_state, region", "15.516 kota, 38 state, 5 region; tidak ada koordinat"]
    ],
    [1800, 3300, 4260]
  ),
  spacing(60),
  caption("Tabel 2.2  Jenis data dan contoh atribut"),

  h2("2.3 Dataset yang Dihasilkan dan Relasinya"),
  table(
    ["Dataset", "Baris", "Kolom", "Satu baris mewakili"],
    [
      ["ecommerce_sales_customer_analytics_150k.csv", "138.116", "46", "Satu transaksi (order) beserta pelanggan, nilai, dan hasil pengiriman/ulasan"],
      ["order_items.csv", "397.569", "12", "Satu baris item dalam sebuah order"],
      ["customer_master.csv", "25.000", "11", "Satu pelanggan (profil + biaya akuisisi)"],
      ["product_catalog.csv", "1.175", "9", "Satu produk (kategori, brand, harga)"],
      ["dataset_statistics.csv", "1", "11", "Ringkasan agregat seluruh dataset (bukan observasi)"]
    ],
    [3300, 900, 800, 4160]
  ),
  spacing(60),
  caption("Tabel 2.3  Dataset yang dihasilkan dan relasi"),
  p("Relasi antarberkas memakai kunci: ecommerce_sales_customer_analytics_150k.csv.order_id → order_items.csv.order_id (satu order memiliki 1–18 item; rata-rata 2,88 item); ecommerce_sales_customer_analytics_150k.csv.customer_id → customer_master.csv.customer_id (24.911 dari 25.000 pelanggan master pernah bertransaksi; 89 tidak); order_items.csv.product_id → product_catalog.csv.product_id (seluruh 1.175 produk muncul di transaksi). dataset_statistics.csv tidak memiliki kunci dan hanya dipakai sebagai pembanding agregat."),

  h2("2.4 Kamus Data"),
  p("Kamus data mencantumkan seluruh kolom per berkas. Kolom yang tidak dipakai pada pemodelan diberi tanda “(tidak dipakai)”; kolom berisiko data leakage ditandai “(leakage)”. Detail persentase terisi tersedia di Lampiran A."),
  table(
    ["Kolom", "Tipe", "Keterangan"],
    [
      ["order_id", "str", "Kunci transaksi; unik 138.116; ORD-######"],
      ["order_date", "str (tanggal)", "Tanggal order; 2021-01-01 s.d. 2025-12-31; 1.826 nilai unik"],
      ["order_time", "str", "Jam order (HH:MM:SS); (tidak dipakai)"],
      ["order_status", "str", "Completed 113.559 (82,22%), Returned 9.462 (6,85%), Cancelled 8.398 (6,08%), Pending 6.697 (4,85%)"],
      ["sales_channel", "str", "Kanal penjualan (Marketplace/Website/Mobile App/Social Media); (tidak dipakai)"],
      ["customer_id", "str", "Kunci pelanggan; CUST-######; 24.911 unik; kunci RFM dan churn"],
      ["customer_name", "str", "Nama (sintetis); (tidak dipakai — identitas tidak diperlukan model)"],
      ["customer_age", "int64", "Usia 18–74; fitur opsional segmentasi"],
      ["gender", "str", "Female 66.439, Male 66.284, Non-Binary 5.393; opsional"],
      ["customer_segment", "str", "Consumer 75.636, Premium 34.746, VIP 13.957, Business 13.777"],
      ["customer_type", "str", "Loyal 129.447, Returning 8.335, New 334; opsional"],
      ["customer_city / state / country / region", "str", "15.516 kota; 38 state; 7 negara; 5 region; country/region opsional"],
      ["customer_postal_code", "int64", "Kode pos; (tidak dipakai)"],
      ["payment_method / payment_status / currency", "str", "7 metode; 4 status; 7 mata uang; (tidak dipakai)"],
      ["shipping_method / warehouse", "str", "4 metode; 19 gudang; (tidak dipakai)"],
      ["delivery_days / estimated_delivery_days", "float64", "Terisi 113.559 (82,2%) — kosong persis pada order non-Completed"],
      ["delivery_status", "str", "On Time/Delayed/Cancelled/Returned; opsional (anomali)"],
      ["return_status / return_reason", "str", "Terisi 9.462 (6,85%) — hanya order Returned; 8 alasan"],
      ["customer_rating", "float64", "Rating 1,6–5,0; terisi 82,2% (hanya Completed); rata-rata 3,68"],
      ["review_sentiment", "str", "Positive 78.083 (68,76%), Neutral 34.684 (30,54%), Negative 792 (0,7%)"],
      ["customer_review", "str", "Ulasan singkat; median 5 kata; (tidak dipakai — fitur teks kompleks)"],
      ["marketing_channel / campaign_name", "str", "10 channel; campaign terisi 54.883 (39,74%); (tidak dipakai)"],
      ["coupon_code", "str", "Terisi 27.614 (19,99%); (tidak dipakai)"],
      ["loyalty_points_earned / redeemed", "int64", "Poin loyalitas; (tidak dipakai)"],
      ["quantity", "int64", "Jumlah item per order, 1–24; dipakai anomaly (volume)"],
      ["gross_sales / discount_amount / tax_amount / shipping_cost / product_cost", "float64", "Komponen nilai; (tidak dipakai — net_sales mewakili)"],
      ["net_sales", "float64", "Nilai penjualan bersih per order; sum = $177.134.263,74; inti forecasting/RFM/anomaly"],
      ["profit", "float64", "Profit per order; sum = $76.146.395,76; opsional"],
      ["profit_margin_percentage", "float64", "-59,55 s.d. 77,59; (tidak dipakai)"],
      ["customer_lifetime_value", "float64", "(leakage) dihitung dari seluruh histori; dilarang jadi fitur churn"],
      ["is_repeat_customer", "bool", "(leakage) diturunkan dari histori lengkap"],
      ["customer_order_count", "int64", "(leakage) diturunkan dari histori lengkap; rentang 1–20"]
    ],
    [2650, 1250, 5460],
    17
  ),
  spacing(60),
  caption("Tabel 2.4  Kamus data ecommerce_sales_customer_analytics_150k.csv (46 kolom)"),
  spacing(80),
  table(
    ["Kolom", "Tipe", "Keterangan"],
    [
      ["order_id", "str", "Kunci ke order; 138.116 unik; dipakai market basket"],
      ["product_id", "str", "Kunci ke katalog; 1.175 unik; dipakai market basket"],
      ["quantity", "int64", "1–5; opsional (Apriori biner tidak memakai bobot)"],
      ["unit_price", "float64", "6,31–1.482,95; (tidak dipakai)"],
      ["discount_percentage", "float64", "0–0,6; (tidak dipakai)"],
      ["discount_amount", "float64", "(tidak dipakai)"],
      ["gross_sales / tax_amount / shipping_cost / product_cost / profit", "float64", "(tidak dipakai)"],
      ["net_sales", "float64", "Nilai item; opsional (bukan kebutuhan asosiasi)"]
    ],
    [2650, 1250, 5460],
    17
  ),
  spacing(60),
  caption("Tabel 2.5  Kamus data order_items.csv (12 kolom)"),
  spacing(80),
  table(
    ["Kolom", "Tipe", "Keterangan"],
    [
      ["customer_id", "str", "Kunci; 25.000 unik (CUST-000001 s.d. CUST-025000)"],
      ["customer_name", "str", "Nama sintetis; (tidak dipakai)"],
      ["customer_age", "int64", "18–74"],
      ["gender", "str", "Female/Male/Non-Binary (3 nilai)"],
      ["customer_segment", "str", "Consumer 13.638, Premium 6.301, VIP 2.542, Business 2.519 (di master)"],
      ["customer_city / state / country / region", "str", "Geografi; country/region opsional"],
      ["customer_postal_code", "int64", "516–99.950; (tidak dipakai)"],
      ["customer_acquisition_cost", "float64", "5,01–79,99; opsional (fitur risiko churn, bukan label)"]
    ],
    [2650, 1250, 5460],
    17
  ),
  spacing(60),
  caption("Tabel 2.6  Kamus data customer_master.csv (11 kolom)"),
  spacing(80),
  table(
    ["Kolom", "Tipe", "Keterangan"],
    [
      ["product_id", "str", "Kunci; 1.175 unik (PROD-000001 s.d. PROD-001175)"],
      ["product_name", "str", "Nama produk sintetis; (tidak dipakai)"],
      ["product_category", "str", "15 kategori seimbang (68–91 produk); opsional (aturan per kategori)"],
      ["product_subcategory", "str", "117 subkategori; (tidak dipakai)"],
      ["brand", "str", "144 brand; (tidak dipakai)"],
      ["supplier", "str", "10 supplier; (tidak dipakai)"],
      ["unit_price", "float64", "6,31–1.482,95; (tidak dipakai — harga tidak dipakai Apriori)"],
      ["product_cost", "float64", "(tidak dipakai)"],
      ["product_rating", "float64", "2,5–4,9; (tidak dipakai)"]
    ],
    [2650, 1250, 5460],
    17
  ),
  spacing(60),
  caption("Tabel 2.7  Kamus data product_catalog.csv (9 kolom)"),
  spacing(80),
  table(
    ["Kolom", "Tipe", "Keterangan"],
    [
      ["Total Transactions", "int64", "138.116"],
      ["Total Columns", "int64", "46"],
      ["Total Customers", "int64", "24.911"],
      ["Total Products Used", "int64", "138.116 (seluruh baris memakai produk)"],
      ["Date Range", "str", "2021-01-01 to 2025-12-31"],
      ["Total Revenue", "str", "$177.134.263,74 — cocok dengan SUM(net_sales)"],
      ["Total Profit", "str", "$76.146.395,76 — cocok dengan SUM(profit)"],
      ["Average Order Value", "str", "$1.282,50 — cocok dengan AVG(net_sales)"],
      ["Average Rating", "float64", "3,68"],
      ["Return Rate", "str", "6,85% — cocok dengan 9.462/138.116"],
      ["Cancellation Rate", "str", "6,08% — cocok dengan 8.398/138.116"]
    ],
    [2650, 1250, 5460],
    17
  ),
  spacing(60),
  caption("Tabel 2.8  Kamus data dataset_statistics.csv (ringkasan agregat; tidak dipakai training)"),
  p("Seluruh agregat pada dataset_statistics.csv terbukti konsisten dengan perhitungan langsung dari berkas transaksi; berkas ini dipakai untuk memverifikasi integritas, bukan sebagai bahan training. Inkonsistensi kecil tidak ditemukan."),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= BAB III =================
const bab3 = [
  h1("BAB III. AKUISISI DATA"),
  h2("3.1 Perangkat yang Digunakan"),
  table(
    ["Perangkat", "Fungsi"],
    [
      ["Peramban (browser) + Kaggle", "Mengakses halaman dataset dan mengunduh 5 berkas CSV secara manual"],
      ["Python 3.13 + pandas 2.3.3", "Profiling otomatis: pemeriksaan null/duplikat/unik"],
      ["Matplotlib", "Pembuatan grafik profiling dan grafik makalah"],
      ["Script khusus projek", "Matriks kecocokan kolom × model"],
      ["Laporan profiling", "Statistik deskriptif kolom, hasil profiling otomatis"]
    ],
    [2800, 6960]
  ),
  spacing(60),
  caption("Tabel 3.1  Perangkat yang digunakan dalam akuisisi"),

  h2("3.2 Tahapan Akuisisi"),
  p("Akuisisi dilakukan dalam dua tahap. Tahap 1 adalah pengambilan berkas dari Kaggle dan verifikasi integritas. Tahap 2 adalah profiling dan pemeriksaan kecocokan terhadap rencana pemodelan. Pemisahan tahap ini membuat kesalahan sumber (berkas salah/rusak) ketahuan sebelum analisis berjalan."),
  image("fig_corong_akuisisi.png", 6.0),
  caption("Gambar 3.1  Corong akuisisi data"),

  h2("3.2.1 Tahap 1 — Pengambilan dan Verifikasi Berkas"),
  p("Kelima berkas diunduh manual pada 10 Oktober 2026 ke folder data/raw/. Berkas terbesar adalah ecommerce_sales_customer_analytics_150k.csv (48,7 MB), diikuti order_items.csv (37,5 MB); total ±88,6 MB. Tidak ada proses scraping: data memang disediakan sebagai berkas unduhan oleh pengunggah di Kaggle."),
  p("Verifikasi dilakukan dengan membaca setiap berkas memakai pandas dengan encoding UTF-8 dan encoding_errors=\"replace\". Hasilnya: seluruh berkas terbaca, 0 karakter rusak (U+FFFD) ditemukan pada pemeriksaan isi, dan 0 baris duplikat penuh. Kolom yang diduga sensitif (nama, kota) tetap disimpan apa adanya karena bersifat publik, namun tidak ditampilkan di makalah."),

  h2("3.2.2 Tahap 2 — Profiling dan Gerbang Kesesuaian"),
  p("Profiling otomatis mencakup seluruh 89 kolom (46 + 12 + 11 + 9 + 11). Hasil utama: tidak ada null pada kolom inti; kolom pasca-transaksi (delivery_days, customer_rating, review_sentiment, customer_review) terisi 113.559 (82,2%) dan kosong pada order non-Completed; campaign_name terisi 54.883 (39,74%); coupon_code 27.614 (19,99%); return_status/return_reason 9.462 (6,85%)."),
  p("Tahap ini ditutup dengan matriks kecocokan kolom terhadap kelima model. Tiga kolom ditandai berisiko data leakage dan dilarang menjadi fitur: customer_lifetime_value, customer_order_count, is_repeat_customer (ketiganya dihitung dari seluruh histori, termasuk informasi masa depan relatif terhadap label churn). File dataset_statistics.csv dinyatakan tidak dipakai sebagai bahan training."),

  h2("3.3 Kendala dan Penanganan"),
  table(
    ["Kendala", "Dampak", "Penanganan"],
    [
      ["Encoding campuran (sel ‘Baden-Württemberg’ tampil rusak di laporan profiling)", "Sebagian karakter non-ASCII hilang/berubah pada tampilan laporan", "Membaca berkas dengan encoding_errors=\"replace\"; pemeriksaan isi menunjukkan 0 karakter rusak; nilai dicatat apa adanya, tidak dinormalkan manual"],
      ["24.557 order (17,78%) tidak punya rating/ulasan", "Model berbasis sentimen/rating tidak bisa dilatih dari seluruh data", "Filter order_status = Completed untuk tugas berbasis rating; analisis lain tetap memakai semua baris"],
      ["Sparsity customer × product 98,65% (394.787 pasangan unik dari 24.911 × 1.175)", "Collaborative filtering tidak layak", "Market basket dihitung per transaksi (order_items), bukan matriks pengguna–item"],
      ["Sentimen sangat timpang (Negative 792; 0,7%)", "Model klasifikasi bias ke kelas mayoritas", "F1-macro / PR-AUC; class weighting; atau anotasi manual untuk subset negatif"],
      ["Kupon & campaign jarang diisi (19,99% / 39,74%)", "Fitur marketing lemah bila dipakai", "Ditandai opsional; tidak dipakai pada model inti"],
      ["524 pelanggan hanya bertransaksi 1 kali", "Label churn ambigu (baru vs kabur)", "Dikecualikan dari label churn; diprediksi terpisah sebagai “pelanggan baru”"]
    ],
    [2900, 2600, 4260],
    17
  ),
  spacing(60),
  caption("Tabel 3.2  Kendala akuisisi dan penanganannya"),

  h2("3.4 Etika dan Keamanan Data"),
  p("Dataset bersifat publik dan diunduh manual; tidak ada bypass akses, scraping terselubung, atau pelanggaran ketentuan layanan. Data memuat nama pelanggan, tetapi nama tersebut sintetis — tidak merujuk individu nyata — dan tidak ditampilkan di makalah ini. Penggunaan dibatasi untuk kepentingan akademik projek; data tidak didistribusikan ulang. Kepatuhan terhadap UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) tetap relevan sebagai prinsip: minimisasi data, tujuan jelas, dan larangan menautkan ke identitas asli. Berkas mentah disimpan lokal dan hanya dipakai untuk profiling serta pelatihan model global."),

  h2("3.5 Reprodusibilitas"),
  p("Lingkungan: Windows, Python 3.13, pandas 2.3.3, matplotlib; Node 26 untuk dokumen; tanggal unduh 10 Oktober 2026; periode data 2021-01-01 s.d. 2025-12-31. Perintah profiling dan grafik tercantum pada Lampiran B. Hasil profiling menjadi sumber angka pada BAB II–V."),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= BAB IV =================
const bab4 = [
  h1("BAB IV. PROFIL DAN KUALITAS DATA"),
  p("Profil di bawah dihitung dari berkas mentah dengan script profiling otomatis dan pandas. Angka yang disebut adalah hasil perhitungan langsung, bukan perkiraan. Dataset akhir yang dipakai pemodelan adalah ecommerce_sales_customer_analytics_150k.csv (138.116 transaksi); jumlah ini lebih kecil dari master pelanggan (25.000) karena 89 pelanggan di customer_master.csv tidak pernah bertransaksi, dan 24.911 di antaranya tercatat di transaksi."),

  h2("4.1 Ringkasan Statistik"),
  table(
    ["Ukuran", "Nilai"],
    [
      ["Jumlah transaksi (order)", "138.116"],
      ["Pelanggan unik (transaksi)", "24.911 (dari 25.000 di master; 89 tidak bertransaksi)"],
      ["Produk unik", "1.175 (seluruhnya muncul di transaksi)"],
      ["Baris order_items", "397.569 (rata-rata 2,88 item/order; maksimum 18)"],
      ["Periode data", "1 Januari 2021 – 31 Desember 2025; 1.826 tanggal unik (seluruh hari terisi)"],
      ["Total net_sales", "$177.134.263,74 (persis sama dengan dataset_statistics.csv)"],
      ["Total profit", "$76.146.395,76 (persis sama dengan dataset_statistics.csv)"],
      ["Average order value", "$1.282,50 (persis sama dengan dataset_statistics.csv)"],
      ["Rating rata-rata", "3,68 (n = 113.559; rentang 1,6–5,0)"],
      ["Order dengan rating/ulasan", "113.559 (82,2%); sisanya 24.557 (17,78%) non-Completed"],
      ["Return rate / Cancellation rate", "6,85% / 6,08% (persis sama dengan dataset_statistics.csv)"],
      ["Kuantitas per order", "rata-rata 2,88; rentang 1–24"]
    ],
    [3600, 5760],
    19
  ),
  spacing(60),
  caption("Tabel 4.1  Ringkasan statistik utama"),
  p("Konsistensi internal berkas sangat baik: seluruh agregat pada dataset_statistics.csv cocok persis dengan perhitungan dari baris mentah. Ini berarti berkas transaksi tidak korup dan tidak mengalami pengurangan/penambahan baris sejak dataset dirilis. Selisih 89 pelanggan master tanpa transaksi wajar secara bisnis (profil terdaftar, belum pernah membeli)."),

  h2("4.2 Sebaran Transaksi dan Negara"),
  image("fig_negara.png", 6.0),
  caption("Gambar 4.1  Sebaran transaksi per negara"),
  p("USA mendominasi dengan 82.600 transaksi (59,8%), diikuti UK 20.235 (14,7%), Germany 11.593 (8,4%), Canada 7.015 (5,1%), Australia 6.794 (4,9%), India 5.707 (4,1%), dan UAE 4.172 (3,0%). Ketidakseimbangan geografis tajam: 74,5% transaksi berasal dari dua negara berbahasa Inggris. Implikasi: model yang belajar pola lintas negara akan sangat bias ke USA; untuk kebutuhan projek, negara dipakai sebagai fitur opsional, bukan pembatas populasi, dan evaluasi perlu dibaca dengan kesadaran dominasi USA."),
  p("Distribusi segmen pelanggan pada transaksi: Consumer 75.636 (54,7%), Premium 34.746 (25,2%), VIP 13.957 (10,1%), Business 13.777 (10,0%). Sebaran region: South 43.990, sisanya menyebar ke East, West, Central, dan North (North terkecil, 16.624). Keempat segmen sama-sama memiliki cukup sampel untuk analisis RFM."),

  h2("4.3 Karakteristik Status Order dan Produk"),
  image("fig_order_status.png", 6.0),
  caption("Gambar 4.2  Komposisi status order"),
  p("Komposisi order_status: Completed 113.559 (82,22%), Returned 9.462 (6,85%), Cancelled 8.398 (6,08%), Pending 6.697 (4,85%). Pola ini penting: seluruh kolom pasca-transaksi (delivery_days, estimated_delivery_days, customer_rating, review_sentiment, customer_review) kosong persis pada 24.557 order non-Completed — bukan hilang acak. Kolom-kolom itu terisi 82,2% karena desain data, bukan cacat pengumpulan."),
  image("fig_kategori.png", 6.0),
  caption("Gambar 4.3  Sebaran kategori produk"),
  p("Katalog 1.175 produk terbagi ke 15 kategori yang seimbang (68–91 produk per kategori; Sports & Outdoors 91 terbanyak, Fashion 68 paling sedikit) dan 117 subkategori. Keseimbangan kategori berarti tidak perlu tindakan penyeimbangan untuk analisis tingkat kategori. order_items memuat 397.569 baris dengan rata-rata 2,88 item per order dan maksimum 18; seluruh 1.175 produk muncul pada transaksi. Ditemukan 87 pasangan ganda (order_id, product_id) pada order_items — kemungkinan entri duplikat yang harus dideduplicasi sebelum market basket analysis."),

  h2("4.4 Distribusi Rating dan Sentimen"),
  image("fig_rating.png", 6.0),
  caption("Gambar 4.4  Distribusi rating pelanggan"),
  p("Rating mengumpul di kisaran 3,3–3,9 dengan puncak 3,7 (9.362 ulasan, 8,2% dari yang ber-rating) dan rata-rata 3,68. Ekor bawah tipis: rating di bawah 2,5 jarang muncul. Pola ini wajar untuk e-commerce, tetapi berarti model klasifikasi berbasis rating akan hidup dengan kelas mayoritas; jangan menafsirkan akurasi tinggi sebagai keberhasilan — gunakan metrik seimbang."),
  image("fig_sentimen.png", 6.0),
  caption("Gambar 4.5  Komposisi sentimen ulasan"),
  p("Sentimen: Positive 78.083 (68,76%), Neutral 34.684 (30,54%), Negative 792 (0,7%). Kelas negatif adalah minoritas ekstrem — rasio hampir 1 : 100 : 99 terhadap Neutral. Konsekuensi langsung: model klasifikasi sentimen tanpa penanganan imbalance akan mengabaikan Negative sepenuhnya. Strategi wajib: F1-macro atau PR-AUC, class weighting, atau oversampling (SMOTE) dan evaluasi pada test set berstratifikasi."),

  h2("4.5 Distribusi Temporal"),
  image("fig_bulanan.png", 6.2),
  caption("Gambar 4.6  Jumlah transaksi per bulan (2021–2025)"),
  p("Seluruh 1.826 tanggal dalam rentang 2021-01-01 s.d. 2025-12-31 terisi — tidak ada hari kosong. Volume bulanan stabil di kisaran ±1.600–2.500 transaksi dengan puncak yang berulang setiap November–Desember (musim liburan/akhir tahun, ditandai batang gelap pada grafik). Tren jangka panjang datar tanpa structural break. Implikasi untuk forecasting: komponen seasonality tahunan tersedia dan perlu dieksplisitkan (mis. model additive seasonal atau fitur bulan); data cukup untuk split train/validasi berbasis waktu."),

  h2("4.6 Kelengkapan Atribut"),
  image("fig_keterisian.png", 6.0),
  caption("Gambar 4.7  Keterisian atribut pasca-transaksi dan marketing"),
  p("Kolom inti (order_id, order_date, customer_id, quantity, net_sales, profit) terisi 100%. Kolom pasca-transaksi (delivery_days, estimated_delivery_days, customer_rating, review_sentiment, customer_review) terisi 82,2% — kosong persis pada order non-Completed. Kolom retur (return_status, return_reason) hanya terisi 9.462 (6,85%) — hanya untuk order Returned; return_reason tertinggi null 93,15%. Kolom marketing opsional: campaign_name 39,74% terisi, coupon_code 19,99%. Untuk pemodelan, kolom-kolom ini ditandai opsional dan tidak boleh menjadi fitur wajib."),

  h2("4.7 Pemeriksaan Kualitas Data"),
  table(
    ["Dimensi", "Hasil pemeriksaan", "Status"],
    [
      ["Keunikan", "0 duplikat baris penuh pada kelima berkas; 0 duplikat order_id (138.116 unik); 0 duplikat customer_id di master (25.000); 87 pasangan ganda (order_id, product_id) di order_items → deduplicasi sebelum Apriori", "Baik (dengan catatan 87 pasang)"],
      ["Kelengkapan", "Kolom inti 100%; pasca-transaksi 82,2% (Order non-Completed); campaign 39,74%; coupon 19,99%; return 6,85%", "Cukup"],
      ["Validitas", "Rating dalam 1,6–5,0; tanggal ISO 8601 valid dan kontinyu 1.826 hari; quantity 1–24; harga positif; 0 karakter rusak (U+FFFD)", "Baik"],
      ["Konsistensi", "Agregat net_sales, profit, AOV, return 6,85%, cancellation 6,08% persis sama dengan dataset_statistics.csv; seluruh 1.175 produk muncul di transaksi; 24.911 dari 25.000 pelanggan master bertransaksi", "Baik"],
      ["Ketepatan waktu", "Rentang penuh 2021-01-01 s.d. 2025-12-31; 1.826 tanggal unik = seluruh hari terisi; timeliness layak untuk analisis tren", "Baik"],
      ["Keseimbangan", "Sentimen Negative 0,7% (792); order_status didominasi Completed (82,2%); negara didominasi USA (59,8%)", "Perlu penanganan"]
    ],
    [1750, 6100, 1510],
    17
  ),
  spacing(60),
  caption("Tabel 4.2  Matriks kualitas data (enam dimensi)"),
  p("Kesimpulan kualitas: data layak dipakai dengan catatan — (1) kelas Negative dan order non-Completed perlu penanganan eksplisit; (2) 87 pasangan ganda order_items harus dideduplicasi; (3) kolom marketing opsional jangan dijadikan fitur wajib; (4) analisis lintas negara perlu kesadaran bias USA. Tidak ditemukan cacat struktural yang membatalkan pemakaian data."),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= BAB V =================
const bab5 = [
  h1("BAB V. KESIAPTERAPAN DATA PADA PROJEK"),
  p("Bab ini menjembatani data dengan projek. Isinya rencana dan penilaian kelayakan berbasis angka pada BAB IV — bukan hasil pelatihan model. Kelima modul di bawah adalah modul yang disepakati pada desain projek (lihat docs/superpowers/specs/2026-10-31-toko-analitik-ai-design.md)."),

  h2("5.1 Arsitektur Sistem (Rencana)"),
  image("fig_arsitektur.png", 6.2),
  caption("Gambar 5.1  Arsitektur data–model–aplikasi (rencana)"),
  p("Alur data dirancang dua jalur. Jalur pelatihan (selesai sampai profiling): berkas Kaggle → data/raw/ → profiling dan matriks kecocokan. Jalur layanan (rencana): pemilik toko memasukkan transaksi lewat impor CSV, formulir, atau chatbot (dengan konfirmasi) ke MySQL toko_analitik_ai per tenant; FastAPI (port 8001) memuat artefak model global yang dilatih dari dataset 150k dan melayani prediksi per toko; Next.js menampilkan dashboard dan chatbot. Pemisahan ini penting: dataset publik dipakai hanya untuk melatih artefak global; data tenant tidak pernah dipakai melatih ulang tanpa alur validasi eksplisit, dan tenant A tidak pernah melihat data tenant B (isolasi lewat kunci X-Tenant-Id)."),
  p("Model global versi pertama dilatih dari dataset publik; setelah tenant nyata menumpuk data tervalidasi, evaluasi ulang dilakukan sebelum mempertimbangkan personalisasi per tenant. Keputusan ini konservatif dan sesuai UU PDP: tujuan pemrosesan jelas, data diminimalkan, dan akses dibatasi."),

  h2("5.2 Pemetaan Data ke Tahap Pemodelan"),
  table(
    ["Tahap / modul", "Data yang dipakai", "Jumlah tersedia", "Kesiapan"],
    [
      ["Forecasting penjualan", "order_date (agregasi harian), net_sales", "1.826 hari kontinyu (2021–2025); 138.116 transaksi", "Siap"],
      ["RFM + K-Means", "customer_id, order_date, net_sales", "24.911 pelanggan; frekuensi rata-rata ≈ 5,5 transaksi", "Siap"],
      ["Market basket (Apriori)", "order_id, product_id dari order_items (dedupe 87 pasangan ganda)", "138.116 order; 397.569 baris item; 1.175 produk", "Siap dengan catatan"],
      ["Churn (365 hari sebelum 2025-12-31)", "customer_id + fitur jendela 365 hari (frekuensi, moneter, recency, acquisition_cost opsional)", "24.911 pelanggan: 8.156 churn (32,8%) / 16.755 aktif (67,2%); 524 single-transaction (404 di antaranya churn) — opsional dikecualikan → 7.752 / 16.635", "Siap dengan catatan"],
      ["Anomaly detection", "order_date, net_sales, quantity (deret/indikator per bulan)", "138.116 transaksi; 60 titik bulanan", "Siap"],
      ["Collaborative filtering (ditolak)", "Matriks user × item", "Sparsity 98,65% (394.787 pasangan unik dari 24.911 × 1.175)", "Tidak layak — ditolak"]
    ],
    [2100, 2900, 2350, 1760],
    17
  ),
  spacing(60),
  caption("Tabel 5.1  Pemetaan data ke tahap pemodelan"),
  p("Pendekatan yang ditolak: collaborative filtering berbasis matriks pengguna–produk. Sparsity 98,65% membuat kemiripan pengguna tidak terukur; Apriori per transaksi jauh lebih tepat karena struktur data memang relasional (order → item), bukan klik/rating matrix."),

  h2("5.3 Forecasting Penjualan (Modul 1)"),
  p("Label/ground truth: tidak ada — ini masalah deret waktu. Target: net_sales harian/bulanan. Pembagian data wajib berbasis waktu (train 2021–2024, validasi 2025, atau rolling-origin cross-validation), bukan acak. Pendekatan layak: (1) naïve + moving average sebagai baseline; (2) Prophet atau ARIMA/SARIMA untuk seasonality tahunan (puncak Nov–Des terbukti pada Gambar 4.6); (3) regresi dengan fitur kalender bila dibutuhkan. Metrik: MAE, RMSE, MAPE; laporkan juga MASE agar sebanding dengan naïve. Data 1.826 titik harian cukup; agregasi bulanan (60 titik) hanya untuk eksplorasi, terlalu sedikit untuk training model kompleks."),
  p("Kesiapan: Siap. Risiko utama bukan data, melainkan salah memilih horizon dan evaluasi — horizon 1–3 bulan realistis untuk keputusan stok UMKM."),

  h2("5.4 RFM + K-Means (Modul 2)"),
  p("Label: tidak ada (unsupervised). Fitur: Recency (hari sejak order terakhir terhadap 2025-12-31), Frequency (jumlah order per pelanggan, 1–20), Monetary (sum net_sales per pelanggan). Standardisasi wajib (StandardScaler) karena skala berbeda jauh. Pemilihan k: elbow dan silhouette pada rentang 3–8; pilih k terendah dengan silhouette stabil. Output: label segmen per pelanggan + profil median R/F/M + usulan aksi bisnis (mis. win-back untuk high-F low-R). Evaluasi: silhouette, stabilitas antar-seed, dan keterbacaan segmen oleh pemilik toko."),
  p("Kesiapan: Siap. Catatan: frequency sangat timpang (mayoritas rendah), jadi pertimbangkan transformasi log pada Frequency dan Monetary sebelum clustering; anomali ekstrim (whale customer) dapat dipotong pada persentil 99 atau diberi label terpisah."),

  h2("5.5 Market Basket Analysis (Modul 3)"),
  p("Ground truth: tidak ada; hasil berupa aturan asosiasi. Input: setiap order sebagai transaksi itemset dari order_items setelah deduplicasi 87 pasangan (order_id, product_id). Apriori dengan min_support 1% (≈1.381 order) dan min_confidence 50%; metrik utama lift (aturan dengan lift > 1 menarik). Jangan gunakan matriks pengguna–item (sparsity 98,65%). Filter aturan yang hanya mengulang best-seller; utamakan aturan lintas kategori untuk peluang bundling."),
  p("Kesiapan: Siap dengan catatan — (1) dedupe wajib; (2) aturan dari order non-Completed sebaiknya dikeluarkan (pesanan dibatalkan/dikembalikan bukan preferensi pembelian); (3) jumlah aturan bisa besar — laporkan top-N terkurasi, bukan seluruh aturan."),

  h2("5.6 Prediksi Churn (Modul 4)"),
  p("Definisi label (dari desain projek): pelanggan disebut churn bila tidak ada pembelian dalam 365 hari sebelum 2025-12-31. Hasil label pada 24.911 pelanggan: 8.156 churn (32,8%) dan 16.755 aktif (67,2%). Sebanyak 524 pelanggan dengan tepat satu transaksi ambigu (404 tergolong churn, 120 aktif); dua perlakuan sah — (a) training pada seluruh 24.911 dengan single-transaction ditandai, atau (b) keluarkan 524 tersebut sehingga tersisa 24.387 berlabel (7.752 churn / 16.635 aktif). Dipilih opsi (b) untuk label bersih; kelompok itu dilaporkan terpisah sebagai “pelanggan baru”."),
  p("Fitur (jendela 365 hari sebelum referensi, bukan seluruh histori): recency, frequency, monetary, rata-rata nilai order, jumlah kategori berbeda, acquisition_cost (opsional). Kolom customer_lifetime_value, customer_order_count, dan is_repeat_customer DILARANG masuk fitur — ketiganya dihitung dari seluruh histori dan memuat informasi “masa depan” terhadap label. Pembagian data: stratified train/test 80/20 atau stratified k-fold (k=5). Model: Logistic Regression (baseline, interpretabilitas) dan Random Forest (non-linear). Metrik: Precision, Recall, F1, dan PR-AUC — bukan accuracy, karena kelas tidak seimbang dan biaya salah klasifikasi asimetris (kehilangan pelanggan aktif lebih mahal daripada mengejar yang sudah churn)."),
  p("Kesiapan: Siap dengan catatan — (1) label sah hanya untuk jendela 365 hari; jangan ubah referensi tanggal tanpa menghitung ulang label; (2) 524 pelanggan single-transaction dikeluarkan dari training; (3) validasi bahwa tidak ada fitur bocor dari periode label."),

  h2("5.7 Deteksi Anomali (Modul 5)"),
  p("Ground truth: tidak ada (unsupervised). Dua lapis: (1) statistik per bulan — z-score atau IQR pada net_sales dan quantity; (2) Isolation Forest (contamination ±0,5%) pada fitur net_sales, quantity, dan deviasi harga terhadap normal. Output: skor anomali per order dan daftar tinjauan untuk pemilik toko (bukan blokir otomatis — keputusan tetap manusia). Estimasi: ±690 order dari 138.116 akan ter-flag pada kontaminasi 0,5%; jumlah pasti menunggu training."),
  p("Kesiapan: Siap. Catatan: anotasi manual pada sampel ter-flag tetap dibutuhkan untuk membedakan penipuan, salah input, atau lonjakan wajar (promo)."),

  h2("5.8 Mitigasi Keterbatasan Data"),
  table(
    ["Keterbatasan", "Dampak pada model", "Mitigasi"],
    [
      ["Sentimen Negative 0,7% (792)", "Klasifikasi sentimen mengabaikan kelas minoritas", "F1-macro/PR-AUC; class weighting; oversampling; anotasi manual 500–1.000 sampel negatif bila sentimen dipakai"],
      ["Order non-Completed 17,78% (24.557)", "Rating/review kosong; bias ke pembelian sukses", "Filter Completed untuk tugas berbasis rating/sentimen; analisis lain pakai semua baris"],
      ["Dominasi USA 59,8%", "Model bias pola USA", "Negara sebagai fitur, bukan filter; laporan evaluasi per negara; generalisasi ke tenant Indonesia perlu validasi ulang"],
      ["Sparsity user×item 98,65%", "Collaborative filtering gagal", "Apriori per transaksi; evaluasi aturan via lift"],
      ["87 pasangan ganda order_items", "Aturan asosiasi melebih-hitung item", "Dedupe (order_id, product_id) sebelum Apriori; catat jumlahnya di laporan"],
      ["Data leakage (CLV, order_count, is_repeat)", "Churn accuracy palsu", "Daftar hitam fitur di ml/; review fitur sebelum training; audit di code review"],
      ["524 pelanggan single-transaction", "Label churn ambigu", "Keluarkan dari training; laporkan terpisah"],
      ["campaign 39,74% / coupon 19,99% terisi", "Fitur marketing lemah/bias", "Opsional saja; jangan wajib; imputasi atau drop"],
      ["Dataset sintetis multi-negara", "Pola belum tentu berlaku untuk tenant Indonesia", "Model global hanya baseline; kalibrasi ulang dengan data tenant saat tersedia; jangan klaim performa untuk toko nyata"]
    ],
    [3000, 2850, 3560],
    17
  ),
  spacing(60),
  caption("Tabel 5.2  Mitigasi keterbatasan data"),

  h2("5.9 Rencana Tahap Selanjutnya"),
  numbered("Pra-pemrosesan: deduplikasi order_items; filter Completed untuk tugas rating/sentimen; standardisasi RFM; agregasi harian net_sales."),
  numbered("EDA lanjutan: cek seasonality (dekomposisi), korelasi fitur churn, dan stabilitas segmen dari waktu ke waktu."),
  numbered("Pelatihan modul 1–5 dengan pembagian data yang disebut di 5.3–5.7; simpan artefak ke /artifacts/global/<model>/<versi>/."),
  numbered("Evaluasi: MAE/RMSE/MAPE (forecasting), silhouette (K-Means), lift/confidence (Apriori), PR-AUC (churn), manual review sampel anomali."),
  numbered("Integrasi: FastAPI menyimpan artefak; NestJS memanggil endpoint prediksi; hasil disajikan di dashboard Next.js dan lewat chatbot dengan konfirmasi tindakan."),
  numbered("Pemantauan: log prediksi; hitung ulang statistik kualitas bulanan (duplikat baru, null rate, drift); retrain per 3 bulan atau saat drift terdeteksi."),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= BAB VI =================
const bab6 = [
  h1("BAB VI. PENUTUP"),
  h2("6.1 Kesimpulan"),
  numbered("Data yang digunakan projek adalah dataset publik E-Commerce Sales Analytics (Kaggle, datascikhan), diunduh manual 10 Oktober 2026: lima berkas CSV, 46 kolom inti, 138.116 transaksi, 24.911 pelanggan unik, 1.175 produk, periode 2021–2025."),
  numbered("Akuisisi dua tahap (pengambilan + verifikasi, lalu profiling) berhasil: 0 karakter rusak, 0 duplikat baris penuh, 0 duplikat order_id, seluruh 1.826 tanggal terisi, dan agregat net_sales/profit/AOV/return/cancellation persis sama dengan dataset_statistics.csv."),
  numbered("Kualitas enam dimensi: keunikan, validitas, konsistensi, ketepatan waktu = Baik; kelengkapan = Cukup (inti 100%, pasca-transaksi 82,2%, marketing 19,99–39,74%); keseimbangan = Perlu penanganan (Sentimen Negative 0,7%; Completed 82,2%; USA 59,8%)."),
  numbered("Tiga kolom berisiko data leakage (customer_lifetime_value, customer_order_count, is_repeat_customer) dilarang menjadi fitur; collaborative filtering ditolak karena sparsity 98,65%."),
  numbered("Kesiapterapan kelima modul: Forecasting (Siap), RFM + K-Means (Siap), Market Basket (Siap dengan catatan — dedupe 87 pasangan, filter Completed), Churn (Siap dengan catatan — label 8.156/16.755, 524 single-transaction dikecualikan), Anomaly Detection (Siap). Pelatihan model adalah tahap berikutnya, belum termasuk makalah ini."),
  numbered("Arsitektur direncanakan: Kaggle/150k → profiling → artefak global FastAPI → MySQL tenant (per toko, isolasi X-Tenant-Id) → Next.js + chatbot; data tenant tidak dipakai melatih ulang tanpa validasi."),

  h2("6.2 Saran"),
  numbered("Tangani imbalance eksplisit: F1-macro/PR-AUC, class weighting, dan anotasi manual 500–1.000 sampel ulasan Negative sebelum model sentimen dipakai."),
  numbered("Dedup order_items (87 pasangan order_id–product_id) dan filter order non-Completed untuk analisis rating/sentimen/asosiasi."),
  numbered("Sensitivity analysis jendela churn (180/270/365 hari) dan laporkan jumlah label tiap varian."),
  numbered("Kalibrasi ulang seluruh model dengan data tenant Indonesia saat tersedia; jangan klaim performa dataset sintetis untuk toko nyata."),
  numbered("Pemantauan kualitas bulanan (duplikat baru, drift, null rate) dan retrain per 3 bulan atau saat drift terdeteksi."),
  numbered("Perkaya data dengan sumber tenant (impor CSV/form chatbot) dan tetapkan tata kelola: enkripsi at rest, kontrol akses per peran, dan retensi sesuai UU PDP."),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= DAFTAR PUSTAKA =================
const pustaka = [
  h1("DAFTAR PUSTAKA"),
  p("[1]  R. Agrawal and R. Srikant, “Fast algorithms for mining association rules,” in Proc. 20th Int. Conf. Very Large Data Bases (VLDB), Santiago, Chile, Sep. 1994, pp. 487–499.", { after: 90 }),
  p("[2]  P. Chapman, J. Clinton, R. Kerber, T. Khabaza, T. Reinartz, C. Shearer, and R. Wirth, “CRISP-DM 1.0: Step-by-step data mining guide,” NCR Systems Engineering Copenhagen, 2000.", { after: 90 }),
  p("[3]  C. Shearer, “The CRISP-DM model: The new blueprint for data mining,” Journal of Data Warehousing, vol. 5, no. 4, pp. 13–22, 2000.", { after: 90 }),
  p("[4]  Y. Wand and R. Y. Wang, “Anchoring data quality dimensions in ontological foundations,” Communications of the ACM, vol. 39, no. 11, pp. 86–95, 1996.", { after: 90 }),
  p("[5]  ISO 8000-1:2022, Data quality — Part 1: Overview, Geneva, Switzerland: International Organization for Standardization, 2022.", { after: 90 }),
  p("[6]  J. MacQueen, “Some methods for classification and analysis of multivariate observations,” in Proc. 5th Berkeley Symp. Math. Statistics and Probability, vol. 1, Berkeley, CA, USA, 1967, pp. 281–297.", { after: 90 }),
  p("[7]  L. Breiman, “Random forests,” Machine Learning, vol. 45, no. 1, pp. 5–32, 2001.", { after: 90 }),
  p("[8]  T. Hastie, R. Tibshirani, and J. Friedman, The Elements of Statistical Learning: Data Mining, Inference, and Prediction, 2nd ed. New York, NY, USA: Springer, 2009.", { after: 90 }),
  p("[9]  J. Han, J. Pei, and M. Kamber, Data Mining: Concepts and Techniques, 3rd ed. Waltham, MA, USA: Morgan Kaufmann, 2011.", { after: 90 }),
  p("[10] F. Pedregosa et al., “Scikit-learn: Machine learning in Python,” Journal of Machine Learning Research, vol. 12, pp. 2825–2830, 2011.", { after: 90 }),
  p("[11] Republik Indonesia, Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Lembaran Negara RI Tahun 2022 No. 196, 2022.", { after: 90 }),
  p("[12] datascikhan, “E-Commerce Sales Analytics Dataset,” Kaggle. Tersedia: https://www.kaggle.com/datasets/datascikhan/e-commerce-sales-and-customer-analytics (diakses 10 Oktober 2026).", { after: 90 }),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= LAMPIRAN =================
const lampiranA = [
  h1("LAMPIRAN A. Statistik Deskriptif Per Kolom"),
  p("Ringkasan per kolom kunci. “Terisi %” = proporsi non-null; “Unik” = jumlah nilai berbeda; peran: id / atribut / nilai_uang / tanggal. Sumber: ml/src/profiling/profile_datasets.py; rincian lengkap di data/reports/data_dictionary.csv dan profiling.md."),
  table(
    ["Kolom", "Tipe", "Terisi %", "Unik", "Peran"],
    [
      ["order_id", "str", "100", "138.116", "id"],
      ["order_date", "str", "100", "1.826", "tanggal"],
      ["customer_id", "str", "100", "24.911", "id"],
      ["customer_segment", "str", "100", "4", "atribut"],
      ["customer_country", "str", "100", "7", "atribut"],
      ["region", "str", "100", "5", "atribut"],
      ["payment_method", "str", "100", "7", "atribut"],
      ["order_status", "str", "100", "4", "atribut"],
      ["delivery_days", "float64", "82,2", "15", "atribut"],
      ["customer_rating", "float64", "82,2", "35", "nilai_uang (skor)"],
      ["review_sentiment", "str", "82,2", "3", "atribut"],
      ["return_reason", "str", "6,85", "8", "atribut"],
      ["campaign_name", "str", "39,74", "17", "atribut"],
      ["coupon_code", "str", "19,99", "40", "atribut"],
      ["quantity", "int64", "100", "24", "kuantitas"],
      ["net_sales", "float64", "100", "115.457", "nilai_uang"],
      ["profit", "float64", "100", "96.545", "nilai_uang"],
      ["profit_margin_percentage", "float64", "100", "7.947", "nilai_uang"],
      ["customer_lifetime_value", "float64", "100", "24.769", "nilai_uang (leakage)"],
      ["customer_order_count", "int64", "100", "19", "atribut (leakage)"],
      ["is_repeat_customer", "bool", "100", "2", "atribut (leakage)"]
    ],
    [2950, 1150, 1150, 1350, 2960],
    17
  ),
  spacing(80),
  p("customer_master.csv (25.000 × 11): customer_id unik penuh (25.000), customer_age 18–74, gender 3 nilai, customer_segment 4 nilai (Consumer 13.638 / Premium 6.301 / VIP 2.542 / Business 2.519 di master), customer_acquisition_cost $5,01–$79,99; 0 null. 89 pelanggan tanpa transaksi."),
  p("order_items.csv (397.569 × 12): order_id 138.116 unik; product_id 1.175 unik; quantity 1–5 (≤5 unik); net_sales, profit per item; 87 pasangan (order_id, product_id) ganda → dedupe sebelum Apriori."),
  p("product_catalog.csv (1.175 × 9): product_id unik penuh; 15 kategori seimbang (68–91); 117 subkategori; 144 brand; 10 supplier; unit_price $6,31–$1.482,95; product_rating 2,5–4,9."),
  p("dataset_statistics.csv (1 × 11): agregat yang terverifikasi persis cocok dengan perhitungan baris mentah (net_sales $177.134.263,74; profit $76.146.395,76; AOV $1.282,50; return 6,85%; cancellation 6,08%; rating 3,68). Dipakai sebagai pemeriksaan integritas, bukan bahan training."),
  new Paragraph({ children: [new PageBreak()] })
];

const lampiranB = [
  h1("LAMPIRAN B. Perintah Reprodusibilitas"),
  p("Lingkungan: Windows; Python 3.13; pandas 2.3.3; matplotlib; Node.js 26; tanggal unduh dataset 10 Oktober 2026."),
  p("Mengunduh ulang: buka https://www.kaggle.com/datasets/datascikhan/e-commerce-sales-and-customer-analytics → Download (perlu login Kaggle) → ekstrak lima CSV ke data/raw/.", { after: 90 }),
  p("Profiling:", { after: 20, bold: true }),
  p("python ml/src/profiling/profile_datasets.py", { after: 90, font: undefined }),
  p("Matriks kecocokan kolom × model:", { after: 20, bold: true }),
  p("python ml/src/profiling/column_suitability.py", { after: 90 }),
  p("Grafik makalah (matplotlib, backend Agg):", { after: 20, bold: true }),
  p("python docs/makalah/assets/charts.py", { after: 90 }),
  p("Hasil tertulis: data/reports/profiling.md, data/reports/data_dictionary.csv, data/reports/column_suitability.md/.csv. Dokumen Word ini dibangun dengan: node docs/makalah/gen_makalah.js (modul docx 9.15.2).", { after: 90 }),
  p("Berkas mentah tidak di-commit ke Git (lihat .gitignore); makalah dapat diverifikasi ulang dari berkas yang sama di data/raw/.", { after: 0 }),
  new Paragraph({ children: [new PageBreak()] })
];
// ================= DOKUMEN =================
const NAVY = "0f172a";
const doc = new Document({
  creator: "Kelompok 3",
  title: "Makalah Akuisisi dan Kesiapterapan Data - Chatbot Analitik UMKM",
  styles: {
    default: {
      document: { run: { font: TNR, size: BODY, color: TEXT } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: TNR, color: NAVY },
        paragraph: { spacing: { before: 40, after: 220, line: 340 }, alignment: "center", outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: TNR, color: NAVY },
        paragraph: { spacing: { before: 170, after: 110, line: 320 }, outlineLevel: 1 } }
    ]
  },
  sections: [
    {
      properties: { page: { margin: MARGIN, pageNumbers: { start: 1, formatType: "lowerRoman" } } },
      footers: { default: footer() },
      children: [...front, ...abstract, ...frontLists]
    },
    {
      properties: { page: { margin: MARGIN, pageNumbers: { start: 1, formatType: "decimal" } } },
      footers: { default: footer() },
      children: [...bab1, ...bab2, ...bab3, ...bab4, ...bab5, ...bab6, ...pustaka, ...lampiranA, ...lampiranB]
    }
  ]
});

Packer.toBuffer(doc).then((buffer) => {
  const out = path.join(__dirname, "Makalah_Chatbot_UMKM_Kelompok3_2026.docx");
  fs.writeFileSync(out, buffer);
  console.log("OK:", out, buffer.length, "bytes");
}).catch((err) => { console.error("FAILED:", err); process.exit(1); });
