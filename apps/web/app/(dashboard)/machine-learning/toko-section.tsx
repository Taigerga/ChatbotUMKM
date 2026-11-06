"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { statusBadge, MODEL_LABELS } from "./status-section";
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

function Bar({ value, max, label, right, color }: { value: number; max: number; label: string; right: string; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium">{label}</span>
        <span className="text-muted-foreground shrink-0">{right}</span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 border-b py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
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
      setError(err instanceof Error ? err.message : "Layanan ML tidak tersedia.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const train = async () => {
    setTraining(true);
    setStatus("Mengumpulkan data toko dan melatih 5 model...");
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
  const forecasting = models.forecasting;
  const rfm = models.rfm;
  const mba = models.mba;
  const churn = models.churn;
  const anomaly = models.anomaly;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Lima model dilatih langsung dari data toko Anda: regresi penjualan, K-Means RFM, aturan asosiasi, regresi
          logistik churn, dan z-score anomali.
        </p>
        <Button size="sm" onClick={train} disabled={training}>
          {training ? "Melatih..." : trained.length > 0 ? "Latih ulang semua" : "Latih semua model"}
        </Button>
      </div>
      {status && <p className="text-sm">{status}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {!results && !error && <p className="text-muted-foreground text-sm">Memuat status model toko...</p>}

      {results && trained.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Model toko belum pernah dilatih. Klik <span className="font-medium">Latih semua model</span> untuk menjalankan
            kelima model dari data transaksi toko Anda.
          </CardContent>
        </Card>
      )}

      {forecasting && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Ramalan Penjualan (model toko)</CardTitle>
            {statusBadge(forecasting.status)}
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-xs">{forecasting.reason}</p>
            {forecasting.results.predictions?.length ? <ForecastChart data={forecasting.results.predictions} /> : null}
            {typeof (forecasting.metrics.model as { mape_pct?: number } | undefined)?.mape_pct === "number" && (
              <div className="grid gap-1 md:grid-cols-2">
                <MetricLine label="MAPE model (%)" value={(forecasting.metrics.model as { mape_pct: number }).mape_pct} />
                <MetricLine
                  label="MAPE baseline naive (%)"
                  value={String((forecasting.metrics.baseline_naive as { mape_pct?: number } | undefined)?.mape_pct ?? "-")}
                />
              </div>
            )}
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {forecasting.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {rfm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Segmentasi Pelanggan (model toko)</CardTitle>
            {statusBadge(rfm.status)}
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-xs">{rfm.reason}</p>
            {rfm.results.summary?.length ? (
              <div className="grid gap-2">
                {rfm.results.summary
                  .slice()
                  .sort((a, b) => b.customers - a.customers)
                  .map((s) => (
                    <Bar
                      key={s.segment}
                      value={s.customers}
                      max={Math.max(...rfm.results.summary!.map((x) => x.customers))}
                      label={s.segment}
                      right={`${s.customers} pelanggan · rata-rata ${formatRupiah(s.monetary)}`}
                      color="bg-blue-600"
                    />
                  ))}
              </div>
            ) : null}
            {rfm.results.segments?.length ? (
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">Detail {rfm.results.segments.length} pelanggan</summary>
                <div className="mt-2 grid gap-1">
                  {rfm.results.segments
                    .slice()
                    .sort((a, b) => b.monetary - a.monetary)
                    .slice(0, 30)
                    .map((s) => (
                      <div key={s.customer_id} className="flex items-center justify-between gap-2 border-b py-0.5">
                        <span className="truncate">{s.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          {s.segment} · {s.frequency}x · {formatRupiah(s.monetary)}
                        </span>
                      </div>
                    ))}
                </div>
              </details>
            ) : null}
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {rfm.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {mba && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Aturan Asosiasi Market Basket (model toko)</CardTitle>
            {statusBadge(mba.status)}
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-xs">{mba.reason}</p>
            {mba.results.rules?.length ? <MbaRecommender rules={mba.results.rules} /> : null}
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {mba.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {churn && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Risiko Churn (model toko)</CardTitle>
            {statusBadge(churn.status)}
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-xs">{churn.reason}</p>
            {churn.results.risks?.length ? (
              <div className="grid gap-2">
                {churn.results.risks.slice(0, 10).map((r) => (
                  <Bar
                    key={r.customer_id}
                    value={r.churn_risk}
                    max={Math.max(0.01, ...churn.results.risks!.map((x) => x.churn_risk))}
                    label={r.name}
                    right={`${Math.round(r.churn_risk * 100)}% risiko`}
                    color="bg-red-600"
                  />
                ))}
              </div>
            ) : null}
            {typeof churn.metrics.pr_auc === "number" && (
              <div className="grid gap-1 md:grid-cols-2">
                <MetricLine label="PR-AUC (holdout)" value={churn.metrics.pr_auc} />
                <MetricLine label="Akurasi (holdout)" value={String(churn.metrics.accuracy ?? "-")} />
              </div>
            )}
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {churn.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {anomaly && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Deteksi Anomali (model toko)</CardTitle>
            {statusBadge(anomaly.status)}
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-xs">{anomaly.reason}</p>
            {anomaly.results.series?.length ? (
              <>
                <p className="text-muted-foreground text-xs">
                  {anomaly.results.series.filter((row) => row.is_anomaly).length} hari anomali dari{" "}
                  {anomaly.results.series.length} hari (titik merah).
                </p>
                <DailySeriesChart data={withAnomalyFlags(anomaly.results.series)} />
              </>
            ) : null}
            <ul className="text-muted-foreground list-disc pl-4 text-xs">
              {anomaly.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {results && trained.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {trained.length} dari 5 model terlatih. Dilatih terakhir:{" "}
          {trained.find((m) => m.trained_at)?.trained_at
            ? new Date(trained.find((m) => m.trained_at)!.trained_at!).toLocaleString("id-ID")
            : "-"}
          . {Object.keys(MODEL_LABELS).length - trained.length} model belum terlatih.
        </p>
      )}
    </div>
  );
}

function MbaRecommender({ rules }: { rules: NonNullable<TenantModel["results"]["rules"]> }) {
  const [basket, setBasket] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const options = Array.from(new Set(rules.flatMap((r) => [r.antecedent, r.consequent]))).sort();

  const add = () => {
    const name = input.trim();
    if (name && !basket.includes(name)) setBasket([...basket, name]);
    setInput("");
  };

  const recs = rules
    .filter((r) => basket.includes(r.antecedent) && !basket.includes(r.consequent))
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 8);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs">
          Simulasi keranjang
          <Input
            list="toko-product-list"
            value={input}
            placeholder="Ketik nama produk..."
            className="w-64"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>
        <datalist id="toko-product-list">
          {options.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <Button size="sm" variant="outline" onClick={add} disabled={!input.trim()}>
          Tambah
        </Button>
      </div>
      {basket.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {basket.map((item) => (
            <button
              key={item}
              type="button"
              className="bg-secondary text-secondary-foreground rounded px-2 py-0.5 text-xs"
              onClick={() => setBasket(basket.filter((b) => b !== item))}
            >
              {item} ✕
            </button>
          ))}
        </div>
      )}
      {recs.length > 0 ? (
        <div className="grid gap-1">
          {recs.map((rec, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border-b py-1 text-xs">
              <span>
                Karena <span className="font-medium">{rec.antecedent}</span> → rekomendasi{" "}
                <span className="font-medium">{rec.consequent}</span>
              </span>
              <span className="text-muted-foreground shrink-0">
                confidence {Math.round(rec.confidence * 100)}% · lift {rec.lift}
              </span>
            </div>
          ))}
        </div>
      ) : (
        basket.length > 0 && <p className="text-muted-foreground text-xs">Tidak ada aturan untuk kombinasi keranjang ini.</p>
      )}
      <details className="text-xs">
        <summary className="text-muted-foreground cursor-pointer">Lihat {rules.length} aturan asosiasi</summary>
        <div className="mt-2 grid gap-1">
          {rules.slice(0, 30).map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border-b py-0.5">
              <span>
                {r.antecedent} → {r.consequent}
              </span>
              <span className="text-muted-foreground shrink-0">
                support {r.support} · conf {Math.round(r.confidence * 100)}% · lift {r.lift}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
