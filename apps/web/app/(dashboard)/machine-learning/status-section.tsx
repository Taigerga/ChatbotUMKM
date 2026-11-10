"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion";
import { StatStrip } from "@/components/warung/stat-strip";
import { EmptyState } from "@/components/warung/empty-state";

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
  forecasting: "Ramalan penjualan",
  rfm: "Kelompok pelanggan",
  mba: "Barang sering dibeli bersama",
  churn: "Pelanggan berisiko berhenti",
  anomaly: "Hari tidak wajar",
};

export const MODEL_PURPOSE: Record<string, string> = {
  forecasting: "Menaksir omzet beberapa hari ke depan supaya belanja stok tidak terlalu banyak atau kurang.",
  rfm: "Mengelompokkan pelanggan agar tahu siapa yang perlu dirawat dan siapa yang perlu ditebus.",
  mba: "Menemukan barang yang sering dibeli bersamaan untuk tawaran paket.",
  churn: "Menandai pelanggan yang mulai jarang datang sebelum benar-benar berhenti.",
  anomaly: "Menunjukkan hari yang penjualannya jauh dari kebiasaan, bisa ramai atau sepi.",
};

export function statusBadge(status: "ready" | "limited" | "not_ready") {
  if (status === "ready") return <Badge variant="outline" className="border-chart-2/60 bg-chart-2/10 text-foreground">Siap</Badge>;
  if (status === "limited") return <Badge variant="outline" className="border-primary/60 bg-primary/15 text-foreground">Cukup</Badge>;
  return <Badge variant="secondary">Perlu data</Badge>;
}

function flatten(value: unknown, prefix = ""): [string, string][] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return [[prefix, String(value)]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    flatten(item, prefix ? `${prefix}.${key}` : key),
  );
}

function readinessPercent(name: string, counts: Readiness["counts"]) {
  const ratio =
    name === "forecasting"
      ? counts.distinctDays / 30
      : name === "rfm"
        ? counts.distinctCustomers / 50
        : name === "mba"
          ? counts.multiItemSales / 100
          : name === "churn"
            ? Math.min(counts.distinctCustomers / 30, counts.spanDays / 180)
            : counts.distinctDays / 60;
  return Math.min(100, Math.round(Math.max(0, ratio) * 100));
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
      setError(err instanceof Error ? err.message : "Layanan analisis tidak tersedia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Cek dulu apakah data toko sudah cukup. Mesin analisis memakai model umum dataset 150k, lalu menyesuaikan skalanya ke toko Anda.
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="size-4" aria-hidden />
          {loading ? "Memuat..." : "Muat ulang"}
        </Button>
      </div>

      {loading && !readiness && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 rounded-[10px]" />
          ))}
        </div>
      )}

      {error && (
        <EmptyState
          title="Layanan analisis belum menjawab"
          description={`${error} Pastikan layanan ML berjalan di port 8001, lalu muat ulang.`}
          action={<Button size="sm" onClick={load}>Coba lagi</Button>}
        />
      )}

      {readiness && (
        <Card>
          <CardHeader>
            <CardTitle className="warung-title text-lg">Kesiapan data toko</CardTitle>
            <p className="text-muted-foreground text-xs">Semakin penuh bar, semakin percaya diri hasil analisisnya.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <StatStrip
              items={[
                { label: "Penjualan", value: readiness.counts.sales, hint: "nota tercatat" },
                { label: "Hari ada jualan", value: readiness.counts.distinctDays, hint: "hari berbeda" },
                { label: "Pelanggan", value: readiness.counts.distinctCustomers, hint: "pernah membeli" },
                { label: "Transaksi 2+ barang", value: readiness.counts.multiItemSales, hint: "untuk pasangan" },
              ]}
            />
            <div className="grid gap-3">
              {Object.entries(readiness.models).map(([name, model]) => (
                <div key={name} className="grid gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{MODEL_LABELS[name] ?? name}</span>
                    {statusBadge(model.status)}
                  </div>
                  <Progress value={readinessPercent(name, readiness.counts)} aria-label={`Kesiapan ${MODEL_LABELS[name] ?? name}`} />
                  <p className="text-muted-foreground text-xs">{model.reason}</p>
                  {model.steps.length > 0 && (
                    <ul className="text-muted-foreground list-disc pl-4 text-xs">
                      {model.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {models && (
        <div className="grid gap-3">
          <p className="warung-eyebrow">Model umum dataset 150k</p>
          {Object.entries(models).map(([name, model]) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="warung-title text-base">{MODEL_LABELS[name] ?? name}</CardTitle>
                  {statusBadge(model.status)}
                </div>
                <p className="text-muted-foreground text-xs">{MODEL_PURPOSE[name] ?? model.reason}</p>
              </CardHeader>
              <CardContent className="grid gap-2">
                <p className="text-sm">{model.reason}</p>
                <Accordion>
                  <AccordionItem value="detail">
                    <AccordionTrigger>Lihat detail teknis</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-muted-foreground grid gap-1 text-xs md:grid-cols-2">
                        <span>Sampel latih: {model.samples.toLocaleString("id-ID")}</span>
                        <span>
                          Rentang data: {model.data_range.length === 2 ? `${model.data_range[0]} — ${model.data_range[1]}` : "-"}
                        </span>
                        <span>Dilatih: {model.trained_at ? new Date(model.trained_at).toLocaleString("id-ID") : "-"}</span>
                        <span>Cakupan: {model.scope === "global" ? "dataset publik" : model.scope}</span>
                      </div>
                      {Object.keys(model.metrics).length > 0 && (
                        <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                          {flatten(model.metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-2 border-b py-0.5">
                              <span className="text-muted-foreground">{key}</span>
                              <span className="font-mono">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <ul className="text-muted-foreground mt-2 list-disc pl-4 text-xs">
                        {model.limitations.map((limitation) => (
                          <li key={limitation}>{limitation}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
