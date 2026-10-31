# ML

Modul Python untuk profiling dataset dan (Milestone 3) layanan FastAPI internal.

- `src/profiling/` — profiling 5 CSV dan matriks kesesuaian kolom×model.
- `tests/` — pytest.
- `artifacts/` — model terlatih (tidak di-commit).

Jalankan:

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pytest
```

Layanan FastAPI internal dan artifact model akan ditambahkan pada Milestone 3.
