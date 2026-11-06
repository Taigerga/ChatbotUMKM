"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { DailySeriesChart, ForecastChart, withAnomalyFlags, type SeriesPoint } from "./ml-charts";

type Forecast = { horizon: number; predictions: { date: string; value: number }[]; warning: string; error?: string; message?: string };
type Segment = { customer_id: string; name: string; segment: string; recency: number; frequency: number; monetary: number };
type Rfm = { customerCount: number; segments: Segment[]; warning: string; error?: string; message?: string };
type Risk = { customer_id: string; name: string; churn_risk: number };
type Churn = { customerCount: number; risks: Risk[]; warning: string; error?: string; message?: string };
type Anomaly = { days: number; anomalyCount: number; series: SeriesPoint[]; anomalies: SeriesPoint[]; warning: string; error?: string; message?: string };
type Recommendation = { antecedent: string; consequent: string; support: number; confidence: number; lift: number };
type Mba = { basket: string[]; recommendations: Recommendation[]; warning: string; error?: string };

function ErrorNote({ result }: { result: { error?: string; message?: string } }) {
  if (result.error) return <p className="text-destructive text-sm">{result.error}</p>;
  if (result.message) return <p className="text-muted-foreground text-sm">{result.message}</p>;
  return null;
}

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

export default function InsightsSection() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [rfm, setRfm] = useState<Rfm | null>(null);
  const [churn, setChurn] = useState<Churn | null>(null);
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [products, setProducts] = useState<{ name: string }[]>([]);
  const [basket, setBasket] = useState<string[]>([]);
  const [basketInput, setBasketInput] = useState("");
  const [mba, setMba] = useState<Mba | null>(null);
  const [mbaLoading, setMbaLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMba(null);
    const [f, r, c, a, p] = await Promise.allSettled([
      apiFetch<Forecast>("/ml/insights/forecast?horizon=7"),
      apiFetch<Rfm>("/ml/insights/rfm"),
      apiFetch<Churn>("/ml/insights/churn"),
      apiFetch<Anomaly>("/ml/insights/anomaly"),
      apiFetch<{ items: { name: string }[] }>("/products?limit=100"),
    ]);
    setForecast(f.status === "fulfilled" ? f.value : { horizon: 7, predictions: [], warning: "", error: "Gagal memuat ramalan." });
    setRfm(r.status === "fulfilled" ? r.value : { customerCount: 0, segments: [], warning: "", error: "Gagal memuat segmentasi." });
    setChurn(c.status === "fulfilled" ? c.value : { customerCount: 0, risks: [], warning: "", error: "Gagal memuat risiko churn." });
    setAnomaly(a.status === "fulfilled" ? a.value : { days: 0, anomalyCount: 0, series: [], anomalies: [], warning: "", error: "Gagal memuat anomali." });
    setProducts(p.status === "fulfilled" ? p.value.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addToBasket = () => {
    const name = basketInput.trim();
    if (name && !basket.includes(name)) setBasket([...basket, name]);
    setBasketInput("");
  };

  const runMba = async () => {
    if (basket.length === 0) return;
    setMbaLoading(true);
    try {
      setMba(await apiFetch<Mba>("/ml/insights/mba", { method: "POST", body: JSON.stringify({ basket, topN: 5 }) }));
    } catch (err) {
      setMba({ basket, recommendations: [], warning: "", error: err instanceof Error ? err.message : "Gagal." });
    } finally {
      setMbaLoading(false);
    }
  };

  const segmentCounts = rfm && !rfm.error && !rfm.message
    ? Object.entries(
        rfm.segments.reduce<Record<string, number>>((acc, s) => {
          acc[s.segment] = (acc[s.segment] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : [];
  const maxSegment = Math.max(1, ...segmentCounts.map(([, n]) => n));
  const topRisks = churn && !churn.error && !churn.message ? churn.risks.slice(0, 10) : [];
  const maxRisk = Math.max(0.01, ...topRisks.map((r) => r.churn_risk));

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Model global (dataset publik 150k) diterapkan pada fitur data toko Anda. Instan, tanpa perlu melatih ulang.
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Muat ulang"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ramalan Penjualan (7 hari ke depan)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {forecast && <ErrorNote result={forecast} />}
          {forecast?.predictions?.length ? (
            <>
              <ForecastChart data={forecast.predictions} />
              <p className="text-muted-foreground text-xs">{forecast.warning}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segmentasi Pelanggan (RFM + K-Means)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {rfm && <ErrorNote result={rfm} />}
          {segmentCounts.length > 0 && (
            <>
              <div className="grid gap-2">
                {segmentCounts.map(([segment, count]) => (
                  <Bar key={segment} value={count} max={maxSegment} label={segment} right={`${count} pelanggan`} color="bg-blue-600" />
                ))}
              </div>
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer">Detail {rfm!.customerCount} pelanggan</summary>
                <div className="mt-2 grid gap-1">
                  {rfm!.segments
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
              <p className="text-muted-foreground text-xs">{rfm!.warning}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risiko Churn Pelanggan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {churn && <ErrorNote result={churn} />}
          {topRisks.length > 0 && (
            <>
              <div className="grid gap-2">
                {topRisks.map((r) => (
                  <Bar
                    key={r.customer_id}
                    value={r.churn_risk}
                    max={maxRisk}
                    label={r.name}
                    right={`${Math.round(r.churn_risk * 100)}% risiko`}
                    color="bg-red-600"
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                10 dari {churn!.customerCount} pelanggan dengan skor risiko tertinggi. {churn!.warning}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deteksi Anomali Penjualan Harian</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {anomaly && <ErrorNote result={anomaly} />}
          {anomaly?.series?.length ? (
            <>
              <p className="text-muted-foreground text-xs">
                {anomaly.anomalyCount} hari anomali dari {anomaly.days} hari (titik merah).
              </p>
              <DailySeriesChart data={withAnomalyFlags(anomaly.series)} />
              <p className="text-muted-foreground text-xs">{anomaly.warning}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekomendasi Market Basket</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs">
              Produk (pilih dari daftar)
              <Input
                list="ml-product-list"
                value={basketInput}
                placeholder="Ketik nama produk..."
                className="w-64"
                onChange={(e) => setBasketInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToBasket();
                  }
                }}
              />
            </label>
            <datalist id="ml-product-list">
              {products.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            <Button size="sm" variant="outline" onClick={addToBasket} disabled={!basketInput.trim()}>
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
          <div>
            <Button size="sm" onClick={runMba} disabled={basket.length === 0 || mbaLoading}>
              {mbaLoading ? "Menganalisis..." : "Minta rekomendasi"}
            </Button>
          </div>
          {mba && (
            <div className="grid gap-1">
              <ErrorNote result={mba} />
              {mba.recommendations?.length ? (
                <>
                  {mba.recommendations.map((rec, i) => (
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
                  <p className="text-muted-foreground text-xs">{mba.warning}</p>
                </>
              ) : (
                !mba.error && <p className="text-muted-foreground text-xs">Tidak ada rekomendasi untuk kombinasi ini.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
