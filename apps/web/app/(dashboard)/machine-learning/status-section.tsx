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

type ReadinessModel = {
  status: "ready" | "limited" | "not_ready";
  reason: string;
  steps: string[];
};

export type Readiness = {
  counts: {
    sales: number;
    distinctDays: number;
    customers: number;
    products: number;
    multiItemSales: number;
    distinctCustomers: number;
    spanDays: number;
  };
  models: Record<string, ReadinessModel>;
};

export const MODEL_LABELS: Record<string, string> = {
  forecasting: "Ramalan Penjualan",
  rfm: "Segmentasi RFM + K-Means",
  mba: "Market Basket",
  churn: "Risiko Churn",
  anomaly: "Deteksi Anomali",
};

export function statusBadge(status: "ready" | "limited" | "not_ready") {
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

export default function StatusSection() {
  const [models, setModels] = useState<Record<string, MlModel> | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [modelRes, readinessRes] = await Promise.all([
        apiFetch<{ scope: string; models: Record<string, MlModel> }>("/ml/models"),
        apiFetch<Readiness>("/ml/data-readiness"),
      ]);
      setModels(modelRes.models);
      setReadiness(readinessRes);
      setError(null);
    } catch (err) {
      setModels(null);
      setReadiness(null);
      setError(err instanceof Error ? err.message : "Layanan ML tidak tersedia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Status kesiapan data toko dan model global (dataset publik 150k).
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Muat ulang"}
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm">{error} — pastikan layanan ML (port 8001) berjalan, lalu muat ulang.</p>
      )}

      {readiness && (
        <div className="grid gap-3 rounded-md border p-3">
          <div>
            <p className="font-medium text-sm">Kesiapan data toko</p>
            <p className="text-muted-foreground text-xs">
              {readiness.counts.sales} penjualan, {readiness.counts.distinctDays} hari transaksi,{" "}
              {readiness.counts.distinctCustomers} pelanggan bertransaksi, {readiness.counts.multiItemSales} transaksi
              multi-item.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(readiness.models).map(([name, model]) => (
              <div key={name} className="rounded border p-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{MODEL_LABELS[name] ?? name}</span>
                  {statusBadge(model.status)}
                </div>
                <p className="text-muted-foreground text-xs">{model.reason}</p>
                {model.steps.length > 0 && (
                  <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
                    {model.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!models && !error && <p className="text-muted-foreground text-sm">Memuat status model...</p>}
      {models &&
        Object.entries(models).map(([name, model]) => (
          <div key={name} className="grid gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{MODEL_LABELS[name] ?? name}</span>
              {statusBadge(model.status)}
              <span className="text-muted-foreground text-xs">{model.reason}</span>
            </div>
            <div className="text-muted-foreground grid gap-1 text-xs md:grid-cols-2">
              <span>Sampel: {model.samples.toLocaleString("id-ID")}</span>
              <span>
                Rentang data: {model.data_range.length === 2 ? `${model.data_range[0]} — ${model.data_range[1]}` : "-"}
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
    </div>
  );
}
