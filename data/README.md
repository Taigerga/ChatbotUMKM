# Data

Folder `data/` berisi dataset mentah dan artefak analisis. Dataset 150.000 baris adalah data pelatihan untuk Milestone 3, bukan data tenant.

- `raw/` — CSV sumber (tidak di-commit, lihat `.gitignore`).
- `interim/` — hasil pembersihan sementara.
- `processed/` — dataset siap latih.
- `reports/` — profiling, data dictionary, matriks kesesuaian kolom.

Laporan yang sudah ada:
- `data/reports/profiling.md`
- `data/reports/data_dictionary.csv`
- `data/reports/column_suitability.md`
- `data/reports/column_suitability.csv`

Milestone 1 hanya memakai dataset untuk profiling. Preprocessing dan training dimulai Milestone 3.
