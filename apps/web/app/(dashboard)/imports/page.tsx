"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type PreviewRow = { row: number; data: any; errors: { field: string; message: string }[]; warnings?: string[] };
type Job = { id: string; entity: string; filename: string; status: string; rowCount: number; validCount: number; errorCount: number; createdAt: string };

const ENTITIES = [
  { value: "products", label: "Produk" },
  { value: "customers", label: "Pelanggan" },
  { value: "sales", label: "Penjualan" },
];

export default function ImportsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [entity, setEntity] = useState("products");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [preview, setPreview] = useState<{ jobId: string; total: number; valid: number; invalid: number; rows: PreviewRow[] } | null>(null);
  const [createMissing, setCreateMissing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: Job[] }>("/imports?limit=20");
      setJobs(res.items);
    } catch {
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  async function handlePreview() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("entity", entity);
      form.append("mapping", JSON.stringify(mapping));
      form.append("createMissing", String(createMissing));
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
      const tenantId = window.localStorage.getItem("tenantId") ?? "";
      const res = await fetch(`${base}/imports/preview`, {
        method: "POST",
        credentials: "include",
        headers: { "x-tenant-id": tenantId },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Preview gagal");
      setHeaders(data.headers ?? []);
      setMapping(data.mapping ?? {});
      setPreview({ jobId: data.jobId, total: data.total, valid: data.valid, invalid: data.invalid, rows: data.rows ?? [] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Preview gagal");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await apiFetch<any>(`/imports/${preview.jobId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ mapping, createMissing }),
      });
      setMessage(
        `Berhasil: ${res.inserted ?? 0} ditambahkan, ${res.skipped ?? 0} dilewati${res.errors?.length ? `, ${res.errors.length} error` : ""}.`,
      );
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadJobs();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Konfirmasi gagal");
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    const res = await apiFetch<{ csv: string }>(`/imports/template?entity=${entity}`);
    const blob = new Blob([res.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Impor Data</CardTitle>
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            Unduh template
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <select className="rounded border px-2 py-1" value={entity} onChange={(e) => { setEntity(e.target.value); setPreview(null); setMapping({}); }}>
              {ENTITIES.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <Input type="file" accept=".csv,.xlsx" ref={fileRef} />
            <Button onClick={handlePreview} disabled={busy}>
              {busy ? "Memproses..." : "Preview"}
            </Button>
          </div>

          {entity === "sales" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
              Buat produk/pelanggan baru otomatis bila tidak ditemukan
            </label>
          )}

          {headers.length > 0 && (
            <div className="grid gap-2 rounded border p-3">
              <p className="text-sm font-medium">Pemetaan kolom</p>
              <div className="grid gap-2 md:grid-cols-3">
                {Object.keys(mapping).map((field) => (
                  <label key={field} className="grid gap-1 text-xs">
                    {field}
                    <select
                      className="rounded border px-2 py-1"
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
                    >
                      <option value="">— tidak dipakai —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={handlePreview} disabled={busy}>
                Terapkan mapping
              </Button>
            </div>
          )}

          {message && <p className="text-sm text-green-600">{message}</p>}

          {preview && (
            <>
              <p className="text-sm">
                Total {preview.total}, valid {preview.valid}, tidak valid {preview.invalid}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="py-2">Baris</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.row} className="border-b align-top">
                        <td className="py-2">{r.row}</td>
                        <td>
                          {r.errors.length === 0 ? (
                            <span className="text-green-600">Valid{r.warnings?.length ? ` (${r.warnings.join(", ")})` : ""}</span>
                          ) : (
                            <span className="text-destructive">{r.errors.map((e) => e.message).join("; ")}</span>
                          )}
                        </td>
                        <td className="text-xs">{JSON.stringify(r.data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConfirm} disabled={busy || preview.valid === 0}>
                  {busy ? "Menyimpan..." : `Konfirmasi (${preview.valid} baris)`}
                </Button>
                <Button variant="outline" onClick={() => setPreview(null)}>Batal</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Riwayat Impor</CardTitle></CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada riwayat impor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2">Waktu</th>
                    <th>File</th>
                    <th>Jenis</th>
                    <th>Status</th>
                    <th>Valid/Total</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b">
                      <td className="py-2 text-xs">{new Date(job.createdAt).toLocaleString("id-ID")}</td>
                      <td className="truncate">{job.filename}</td>
                      <td>{job.entity}</td>
                      <td>{job.status}</td>
                      <td>{job.validCount}/{job.rowCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
