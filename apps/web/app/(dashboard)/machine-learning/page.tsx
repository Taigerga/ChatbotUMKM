"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

type MlModel = {
  model: string;
  status: "ready" | "limited" | "not_ready";
  scope: string;
  available: boolean;
  samples: number;
  metrics: Record<string, unknown>;
  data_range: string[];
  limitations: string[];
  trained_at?: string;
  reason: string;
};

type Job = { id: string; status: string; result?: unknown; error?: string | null };

const LABELS: Record<string, string> = {
  forecasting: "Ramalan Penjualan",
  rfm: "Segmentasi RFM + K-Means",
  mba: "Market Basket",
  churn: "Risiko Churn",
  anomaly: "Deteksi Anomali",
};

function statusBadge(status: MlModel["status"]) {
  if (status === "ready") return <Badge className="bg-emerald-600 text-white">siap</Badge>;
  if (status === "limited") return <Badge className="bg-amber-500 text-white">siap dengan keterbatasan</Badge>;
  return <Badge variant="secondary">belum siap</Badge>;
}

function flatten(value: unknown, prefix = ""): [string, string][] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return [[prefix, String(value)]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    flatten(item, prefix ? `${prefix}.${key}` : key),
  );
}

export default function MachineLearningPage() {
  const [models, setModels] = useState<Record<string, MlModel> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ scope: string; models: Record<string, MlModel> }>("/ml/models");
      setModels(res.models);
      setError(null);
    } catch (err) {
      setModels(null);
      setError(err instanceof Error ? err.message : "Layanan ML tidak tersedia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pollJob(jobId: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const job = await apiFetch<Job>(`/ml/jobs/${jobId}`);
      if (job.status === "done") return job;
      if (job.status === "failed") throw new Error(job.error ?? "Pelatihan gagal.");
    }
    throw new Error("Pelatihan melewati batas waktu.");
  }

  async function train(model: string) {
    setBusy(model);
    setMessage(`Melatih ${LABELS[model] ?? model}...`);
    try {
      const start = await apiFetch<{ job_id: string }>(`/ml/train/${model}`, { method: "POST" });
      await pollJob(start.job_id);
      setMessage(`${LABELS[model] ?? model} selesai dilatih.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Pelatihan gagal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Machine Learning</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Semua model dilatih dari dataset publik 150k (global), bukan data toko Anda. Hasil adalah referensi,
              bukan jaminan.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "Memuat..." : "Muat ulang"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error && (
            <p className="text-destructive text-sm">
              {error} — pastikan layanan ML (port 8001) berjalan, lalu muat ulang.
            </p>
          )}
          {message && <p className="text-sm">{message}</p>}
          {!models && !error && <p className="text-muted-foreground text-sm">Memuat status model...</p>}
          {models &&
            Object.entries(models).map(([name, model]) => (
              <div key={name} className="grid gap-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{LABELS[name] ?? name}</span>
                  {statusBadge(model.status)}
                  <span className="text-muted-foreground text-xs">{model.reason}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    disabled={busy !== null}
                    onClick={() => train(name)}
                  >
                    {busy === name ? "Melatih..." : model.available ? "Latih ulang" : "Latih"}
                  </Button>
                </div>
                <div className="text-muted-foreground grid gap-1 text-xs md:grid-cols-2">
                  <span>Sampel: {model.samples.toLocaleString("id-ID")}</span>
                  <span>
                    Rentang data: {model.data_range.length === 2 ? `${model.data_range[0]} – ${model.data_range[1]}` : "-"}
                  </span>
                  <span>
                    Dilatih: {model.trained_at ? new Date(model.trained_at).toLocaleString("id-ID") : "-"}
                  </span>
                  <span>Scope: {model.scope === "global" ? "global (dataset publik)" : model.scope}</span>
                </div>
                {Object.keys(model.metrics).length > 0 && (
                  <div className="grid gap-1 text-xs md:grid-cols-2">
                    {flatten(model.metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2 border-b py-0.5">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <ul className="text-muted-foreground list-disc pl-4 text-xs">
                  {model.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
