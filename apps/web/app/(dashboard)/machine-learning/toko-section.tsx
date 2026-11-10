"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion";
import { EmptyState } from "@/components/warung/empty-state";
import { MODEL_LABELS, MODEL_PURPOSE, statusBadge } from "./status-section";

type TenantModel = {
  model: string;
  status: "ready" | "limited" | "not_ready";
  reason: string;
  samples: number;
  metrics: Record<string, unknown>;
  data_range: string[];
  trained_at?: string;
  limitations: string[];
};

type Results = { models: Record<string, TenantModel | null> };

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
            Tab ini hanya memeriksa kesiapan model. Semua angka hasil analisis ada di tab Analisis cerdas,
            supaya tidak ada dua versi angka untuk hal yang sama.
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
          description="Latih sekali untuk memastikan kelima model siap dipakai pada data toko Anda."
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
            <TechnicalDetails model={model} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
