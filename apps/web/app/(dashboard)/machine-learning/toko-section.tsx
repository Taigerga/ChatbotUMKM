"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion";
import { HumanNote } from "@/components/warung/human-note";
import { EmptyState } from "@/components/warung/empty-state";
import { MODEL_LABELS, MODEL_PURPOSE, statusBadge } from "./status-section";
import { DailySeriesChart, ForecastChart, withAnomalyFlags, type SeriesPoint } from "./ml-charts";

type TenantModel = {
  model: string;
  status: "ready" | "limited" | "not_ready";
  reason: string;
  samples: number;
  metrics: Record<string, unknown>;
  data_range: string[];
  trained_at?: string;
  limitations: string[];
  results: {
    predictions?: { date: string; value: number }[];
    segments?: { customer_id: string; name: string; segment: string; frequency: number; monetary: number }[];
    summary?: { segment: string; customers: number; recency: number; freq: number; monetary: number }[];
    rules?: { antecedent: string; consequent: string; support: number; confidence: number; lift: number }[];
    risks?: { customer_id: string; name: string; churn_risk: number }[];
    series?: SeriesPoint[];
  };
};

type Results = { models: Record<string, TenantModel | null> };

const SEGMENT_AWAM: Record<string, string> = {
  Champion: "Pelanggan setia",
  Loyal: "Pelanggan rutin",
  "At Risk": "Perlu ditebus",
  Lost: "Hampir hilang",
};

function labelSegmen(segment: string) {
  const match = Object.keys(SEGMENT_AWAM).find((key) => segment.startsWith(key));
  return match ? SEGMENT_AWAM[match] : segment;
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 border-b py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function TechnicalDetails({ model }: { model: TenantModel }) {
  return (
    <Accordion>
      <AccordionItem value="detail">
        <AccordionTrigger>Yang perlu diketahui</AccordionTrigger>
        <AccordionContent>
          <div className="text-muted-foreground grid gap-1 text-xs">
            <span>Sampel latih: {model.samples.toLocaleString("id-ID")}</span>
            <span>Rentang data: {model.data_range.join(" — ") || "-"}</span>
            <span>Dilatih: {model.trained_at ? new Date(model.trained_at).toLocaleString("id-ID") : "-"}</span>
          </div>
          {Object.keys(model.metrics).length > 0 && (
            <div className="mt-2 grid gap-1 md:grid-cols-2">
              {Object.entries(model.metrics)
                .filter(([, value]) => typeof value !== "object")
                .map(([key, value]) => (
                  <MetricLine key={key} label={key} value={String(value)} />
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
  );
}

export default function TokoSection() {
  const [results, setResults] = useState<Results | null>(null);
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setResults(await apiFetch<Results>("/ml/tenant/results"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Layanan analisis tidak tersedia.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const train = async () => {
    setTraining(true);
    setStatus("Mengumpulkan data toko dan melatih lima model...");
    setError(null);
    try {
      const { job_id } = await apiFetch<{ job_id: string; status: string }>("/ml/tenant/train", {
        method: "POST",
        body: JSON.stringify({ horizon: 7 }),
      });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const job = await apiFetch<{ status: string; error?: string | null }>(`/ml/tenant/train/${job_id}`);
          if (job.status === "done") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTraining(false);
            setStatus("Pelatihan selesai.");
            await load();
          } else if (job.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTraining(false);
            setStatus(null);
            setError(job.error ?? "Pelatihan gagal.");
          }
        } catch {
          /* polling error diabaikan; coba lagi pada tick berikutnya */
        }
      }, 2000);
    } catch (err) {
      setTraining(false);
      setStatus(null);
      setError(err instanceof Error ? err.message : "Gagal memulai pelatihan.");
    }
  };

  const models = results?.models ?? {};
  const trained = Object.values(models).filter(Boolean) as TenantModel[];
  const ordered = ["forecasting", "rfm", "mba", "churn", "anomaly"]
    .map((name) => models[name])
    .filter(Boolean) as TenantModel[];
  const lastTrained = trained.find((m) => m.trained_at)?.trained_at;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="pb-2">
          <p className="warung-eyebrow">Model khusus toko</p>
          <CardTitle className="warung-title text-xl">Latih dari data toko sendiri</CardTitle>
          <p className="text-muted-foreground text-xs">
            Ini model terpisah yang belajar langsung dari nota toko. Butuh beberapa saat dan data yang cukup.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={train} disabled={training}>
              <GraduationCap className="size-4" aria-hidden />
              {training ? "Melatih..." : trained.length > 0 ? "Latih ulang model toko" : "Latih model toko"}
            </Button>
            <span className="text-muted-foreground text-xs">
              {trained.length} dari 5 model siap{lastTrained ? ` · terakhir ${new Date(lastTrained).toLocaleString("id-ID")}` : ""}
            </span>
          </div>
          <Progress value={training ? 60 : (trained.length / 5) * 100} aria-label="Progres pelatihan model toko" />
          {status && <p className="text-sm">{status}</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      {!results && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28 rounded-[10px]" />
          ))}
        </div>
      )}

      {results && trained.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Model toko belum dilatih"
          description="Latih sekali untuk melihat ramalan, kelompok pelanggan, pasangan barang, risiko berhenti, dan hari tidak wajar versi toko Anda."
          action={<Button size="sm" onClick={train} disabled={training}>Latih sekarang</Button>}
        />
      )}

      {ordered.map((model) => (
        <Card key={model.model}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="warung-title text-lg">{MODEL_LABELS[model.model] ?? model.model}</CardTitle>
              {statusBadge(model.status)}
            </div>
            <p className="text-muted-foreground text-xs">{MODEL_PURPOSE[model.model]}</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">{model.reason}</p>

            {model.model === "forecasting" && model.results.predictions?.length ? (
              <>
                <ForecastChart data={model.results.predictions} />
                <HumanNote>
                  Rata-rata perkiraan {formatRupiah(
                    model.results.predictions.reduce((sum, point) => sum + point.value, 0) / model.results.predictions.length,
                  )} per hari. Siapkan stok barang laris di hari yang ramai.
                </HumanNote>
              </>
            ) : null}

            {model.model === "rfm" && model.results.summary?.length ? (
              <div className="grid gap-2">
                {model.results.summary
                  .slice()
                  .sort((a, b) => b.customers - a.customers)
                  .map((summary) => (
                    <div key={summary.segment} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                      <span className="font-medium">{labelSegmen(summary.segment)}</span>
                      <span className="text-muted-foreground text-xs">
                        {summary.customers} pelanggan · rata-rata {formatRupiah(summary.monetary)}
                      </span>
                    </div>
                  ))}
                <HumanNote>Rawat kelompok paling ramai lebih dulu; mereka penyumbang omzet terbesar.</HumanNote>
              </div>
            ) : null}

            {model.model === "mba" && model.results.rules?.length ? (
              <div className="grid gap-1">
                {model.results.rules.slice(0, 8).map((rule, index) => (
                  <div key={index} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                    <span>
                      Pembeli {rule.antecedent} juga beli {rule.consequent}
                    </span>
                    <span className="text-muted-foreground text-xs">{Math.round(rule.confidence * 100)}% pembeli lanjut beli</span>
                  </div>
                ))}
                <HumanNote>Tawarkan barang kedua saat pelanggan mengambil barang pertama. Uji sebentar, lihat apakah tambahan terjual.</HumanNote>
              </div>
            ) : null}

            {model.model === "churn" && model.results.risks?.length ? (
              <div className="grid gap-1">
                {model.results.risks.slice(0, 10).map((risk) => (
                  <div key={risk.customer_id} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                    <span className="font-medium">{risk.name}</span>
                    <span className="text-muted-foreground text-xs">skor {risk.churn_risk.toFixed(2)} — hubungi lewat WhatsApp</span>
                  </div>
                ))}
                <HumanNote>Hubungi pelanggan di urutan atas lebih dulu. Tawarkan barang yang biasa mereka beli.</HumanNote>
              </div>
            ) : null}

            {model.model === "anomaly" && model.results.series?.length ? (
              <>
                <DailySeriesChart data={withAnomalyFlags(model.results.series)} />
                <p className="text-muted-foreground text-xs">
                  {model.results.series.filter((row) => row.is_anomaly).length} hari jauh dari kebiasaan dari {model.results.series.length} hari (titik merah).
                </p>
              </>
            ) : null}

            <TechnicalDetails model={model} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
