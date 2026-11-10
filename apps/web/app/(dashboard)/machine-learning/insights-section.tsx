"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate, formatRupiah } from "@/lib/format";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@workspace/ui/components/accordion";
import { HumanNote } from "@/components/warung/human-note";
import { PriceTag } from "@/components/warung/price-tag";
import { DailySeriesChart, ForecastChart, withAnomalyFlags, type SeriesPoint } from "./ml-charts";

type Forecast = {
  horizon: number;
  predictions: { date: string; value: number }[];
  calibration?: { factor: number; target_daily: number | null; anchored_to: string };
  summary?: { dailyAverage: number; weeklyTotal: number; trendPct: number; last30Daily: number };
  calibrated?: boolean;
  warning: string;
  error?: string;
  message?: string;
};

type Segment = {
  customer_id: string;
  name: string;
  cluster: number;
  segment: string;
  segmentLabel: string;
  label: string;
  recency: number;
  frequency: number;
  monetary: number;
};

type SegmentGroup = {
  segment: string;
  label: string;
  action: string;
  customers: number;
  monetary: number;
  avgMonetary: number;
};

type Rfm = { customerCount: number; segments: Segment[]; groups: SegmentGroup[]; warning: string; error?: string; message?: string };

type Risk = { customer_id: string; name: string; churn_risk: number; score: number; lastPurchaseDays: number; band: "high" | "medium" | "low" };
type Churn = {
  customerCount: number;
  risks: Risk[];
  counts: { high: number; medium: number; low: number };
  limited?: boolean;
  warning: string;
  error?: string;
  message?: string;
};

type Anomaly = {
  days: number;
  anomalyCount: number;
  series: SeriesPoint[];
  anomalies: { date: string; value: number; baseline: number; direction: "high" | "low" }[];
  warning: string;
  error?: string;
  message?: string;
};

type GlobalRule = { antecedent: string; consequent: string; support: number; confidence: number; lift: number };
type TenantPair = { a: string; b: string; count: number; total: number; confidence: number; lift: number };
type Mba = { transactionCount: number; tenantPairs: TenantPair[]; globalReference: GlobalRule[]; warning: string; error?: string };

const BAND_LABEL: Record<Risk["band"], string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
const BAND_TEXT: Record<Risk["band"], string> = {
  high: "Hubungi lewat WhatsApp hari ini, tawarkan barang yang biasa dibeli.",
  medium: "Sapa saat lewat atau kirim promo singkat minggu ini.",
  low: "Belum perlu dikejar; cukup pantau.",
};

function ErrorNote({ result }: { result: { error?: string; message?: string } }) {
  if (result.error) return <p className="text-destructive text-sm">{result.error}</p>;
  if (result.message) return <p className="text-muted-foreground text-sm">{result.message}</p>;
  return null;
}

function PanelSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((n) => (
        <Skeleton key={n} className="h-28 rounded-[10px]" />
      ))}
    </div>
  );
}

export default function InsightsSection() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [rfm, setRfm] = useState<Rfm | null>(null);
  const [churn, setChurn] = useState<Churn | null>(null);
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [mba, setMba] = useState<Mba | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setForecast(null);
    setRfm(null);
    setChurn(null);
    setAnomaly(null);
    setMba(null);
    const [f, r, c, a, m] = await Promise.allSettled([
      apiFetch<Forecast>("/ml/insights/forecast?horizon=7"),
      apiFetch<Rfm>("/ml/insights/rfm"),
      apiFetch<Churn>("/ml/insights/churn"),
      apiFetch<Anomaly>("/ml/insights/anomaly"),
      apiFetch<Mba>("/ml/insights/mba", { method: "POST", body: JSON.stringify({ topN: 5 }) }),
    ]);
    setForecast(f.status === "fulfilled" ? f.value : { horizon: 7, predictions: [], warning: "", error: "Gagal memuat perkiraan penjualan." });
    setRfm(r.status === "fulfilled" ? r.value : { customerCount: 0, segments: [], groups: [], warning: "", error: "Gagal memuat kelompok pelanggan." });
    setChurn(c.status === "fulfilled" ? c.value : { customerCount: 0, risks: [], counts: { high: 0, medium: 0, low: 0 }, warning: "", error: "Gagal memuat risiko berhenti." });
    setAnomaly(a.status === "fulfilled" ? a.value : { days: 0, anomalyCount: 0, series: [], anomalies: [], warning: "", error: "Gagal memuat hari tidak wajar." });
    setMba(m.status === "fulfilled" ? m.value : { transactionCount: 0, tenantPairs: [], globalReference: [], warning: "", error: "Gagal memuat pasangan barang." });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const maxGroup = Math.max(1, ...(rfm?.groups ?? []).map((group) => group.customers));
  const topRisks = churn && !churn.error && !churn.message ? churn.risks.slice(0, 10) : [];
  const trend = forecast?.summary?.trendPct ?? 0;
  const flat = Math.abs(trend) < 1;
  const TrendIcon = flat ? Minus : trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Hasil langsung dari model umum, sudah disesuaikan dengan data toko. Tidak perlu menunggu pelatihan.
        </p>
        <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
          <RefreshCw className="size-4" aria-hidden />
          {loading ? "Memuat..." : "Muat ulang"}
        </Button>
      </div>

      {loading && <PanelSkeleton />}

      {!loading && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <p className="warung-eyebrow">Ramalan</p>
              <CardTitle className="warung-title text-xl">Perkiraan penjualan {forecast?.horizon ?? 7} hari ke depan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {forecast && <ErrorNote result={forecast} />}
              {forecast?.predictions?.length ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <PriceTag label="Rata-rata per hari" value={formatRupiah(forecast.summary?.dailyAverage ?? 0)} />
                    <PriceTag label="Total seminggu" value={formatRupiah(forecast.summary?.weeklyTotal ?? 0)} />
                    <div className="border-l-4 border-border pl-3">
                      <p className="warung-eyebrow">Arah</p>
                      <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold">
                        <TrendIcon className={`size-5 ${flat ? "text-muted-foreground" : trend > 0 ? "text-chart-2" : "text-destructive"}`} aria-hidden />
                        {flat ? "Stabil" : `${Math.abs(trend).toFixed(0)}% ${trend > 0 ? "lebih ramai" : "lebih sepi"}`}
                      </p>
                      <p className="text-muted-foreground text-xs">dibanding rata-rata 30 hari terakhir</p>
                    </div>
                  </div>
                  <ForecastChart data={forecast.predictions} />
                  <HumanNote>
                    {forecast.calibrated
                      ? `Kalau pola belanja tidak berubah, sehari kira-kira masuk ${formatRupiah(forecast.summary?.dailyAverage ?? 0)}. Siapkan stok barang laris sedikit lebih banyak pada hari ramai.`
                      : "Belum ada penjualan 30 hari terakhir, jadi angkanya masih kasar. Catat beberapa transaksi agar ramalan lebih dekat ke toko Anda."}
                  </HumanNote>
                  <p className="text-muted-foreground text-xs">{forecast.warning}</p>
                  <Accordion>
                    <AccordionItem value="detail">
                      <AccordionTrigger>Lihat detail teknis</AccordionTrigger>
                      <AccordionContent>
                        <div className="text-muted-foreground grid gap-1 text-xs">
                          <span>Model: regresi linear global dataset 150k.</span>
                          <span>Faktor skala: {forecast.calibration?.factor ?? 1}.</span>
                          <span>Rata-rata 30 hari toko: {formatRupiah(forecast.summary?.last30Daily ?? 0)} per hari kalender.</span>
                          <span>Tanggal di-anchor ke hari ini, bukan tanggal akhir dataset.</span>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="warung-eyebrow">Pelanggan</p>
              <CardTitle className="warung-title text-xl">Kelompok pelanggan toko</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {rfm && <ErrorNote result={rfm} />}
              {rfm?.groups?.length ? (
                <>
                  <div className="grid gap-3">
                    {rfm.groups.map((group) => (
                      <div key={group.label} className="grid gap-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{group.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {group.customers} pelanggan · rata-rata {formatRupiah(group.avgMonetary)}
                          </span>
                        </div>
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${Math.max(3, Math.round((group.customers / maxGroup) * 100))}%` }} />
                        </div>
                        <p className="text-muted-foreground text-xs">{group.action}</p>
                      </div>
                    ))}
                  </div>
                  <HumanNote>
                    Mulai dari kelompok yang paling perlu ditebus. Satu pesan WhatsApp ke pelanggan yang sudah lama tidak datang biasanya lebih murah daripada mencari pelanggan baru.
                  </HumanNote>
                  <Accordion>
                    <AccordionItem value="detail">
                      <AccordionTrigger>Lihat detail teknis</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground mb-2 text-xs">{rfm.warning}</p>
                        <div className="grid gap-1">
                          {rfm.segments
                            .slice()
                            .sort((a, b) => b.monetary - a.monetary)
                            .slice(0, 30)
                            .map((segment) => (
                              <div key={segment.customer_id} className="flex items-center justify-between gap-2 border-b py-0.5 text-xs">
                                <span className="truncate">{segment.name}</span>
                                <span className="text-muted-foreground shrink-0">
                                  {segment.label} · {segment.frequency}x · {formatRupiah(segment.monetary)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="warung-eyebrow">Risiko berhenti</p>
              <CardTitle className="warung-title text-xl">Pelanggan yang mulai jarang datang</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {churn && <ErrorNote result={churn} />}
              {topRisks.length > 0 ? (
                <>
                  <div className="grid gap-2">
                    {topRisks.map((risk) => (
                      <div key={risk.customer_id} className="grid gap-1 border-b py-1 last:border-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{risk.name}</span>
                          <Badge variant={risk.band === "high" ? "destructive" : risk.band === "medium" ? "default" : "outline"}>
                            {BAND_LABEL[risk.band]}
                          </Badge>
                          <span className="text-muted-foreground text-xs">terakhir belanja {risk.lastPurchaseDays} hari lalu</span>
                        </div>
                        <p className="text-muted-foreground text-xs">{BAND_TEXT[risk.band]}</p>
                      </div>
                    ))}
                  </div>
                  <HumanNote title="Artinya buat toko Anda">
                    {churn?.limited
                      ? "Pelanggan yang pernah membeli masih sedikit, jadi tingkat ini hanya perkiraan kasar."
                      : `Ada ${churn?.counts.high ?? 0} pelanggan tingkat tinggi dan ${churn?.counts.medium ?? 0} tingkat sedang. Hubungi yang tingkat tinggi lebih dulu.`}
                  </HumanNote>
                  <Accordion>
                    <AccordionItem value="detail">
                      <AccordionTrigger>Lihat detail teknis</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground text-xs">
                          Tingkat ditentukan dari peringkat skor model logistik global, bukan peluang pasti. Hanya pelanggan yang pernah bertransaksi yang dihitung.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="warung-eyebrow">Hari tidak wajar</p>
              <CardTitle className="warung-title text-xl">Hari yang jauh dari kebiasaan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {anomaly && <ErrorNote result={anomaly} />}
              {anomaly?.series?.length ? (
                <>
                  <p className="text-sm">
                    {anomaly.anomalyCount > 0
                      ? `${anomaly.anomalyCount} hari penjualan jauh di atas atau di bawah kebiasaan.`
                      : "Semua hari masih dalam kebiasaan. Tidak ada yang mencolok."}
                  </p>
                  <DailySeriesChart data={withAnomalyFlags(anomaly.series)} />
                  {anomaly.anomalies.length > 0 && (
                    <ul className="grid gap-1 text-sm">
                      {anomaly.anomalies.slice(0, 8).map((row) => (
                        <li key={row.date} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 last:border-0">
                          <span>{formatDate(row.date)}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatRupiah(row.value)} · {row.direction === "high" ? "lebih ramai" : "lebih sepi"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <HumanNote>
                    Hari ramai bisa jadi momen promosi; hari sepi bisa jadi waktu cek stok dan biaya. Anomali hanya tanda, bukan bukti kesalahan.
                  </HumanNote>
                  <p className="text-muted-foreground text-xs">{anomaly.warning}</p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="warung-eyebrow">Pasangan barang</p>
              <CardTitle className="warung-title text-xl">Sering dibeli bersama</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Sering dibeli bersama di toko Anda</p>
                  <Badge variant="outline" className="border-primary/60 bg-primary/10 text-foreground">Dari nota toko</Badge>
                </div>
                {mba?.tenantPairs?.length ? (
                  <ul className="grid gap-1">
                    {mba.tenantPairs.map((pair) => (
                      <li key={`${pair.a}-${pair.b}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                        <span>
                          Pembeli <span className="font-medium">{pair.a}</span> juga beli <span className="font-medium">{pair.b}</span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {pair.count} dari {pair.total} nota ({Math.round(pair.confidence * 100)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {mba?.warning || "Belum ada transaksi dengan dua barang atau lebih. Catat penjualan beberapa barang sekaligus agar pasangan muncul."}
                  </p>
                )}
              </div>

              <div className="grid gap-2 border-t pt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Contoh dari dataset umum</p>
                  <Badge variant="secondary">Produk dataset umum, bukan toko</Badge>
                </div>
                {mba?.globalReference?.length ? (
                  <ul className="grid gap-1">
                    {mba.globalReference.map((rule) => (
                      <li key={`${rule.antecedent}-${rule.consequent}`} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                        <span className="flex items-center gap-1.5">
                          {rule.antecedent} <ArrowRight className="size-3.5" aria-hidden /> {rule.consequent}
                        </span>
                        <span className="text-muted-foreground text-xs">{Math.round(rule.confidence * 100)}% pembeli lanjut beli</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">Contoh dataset umum belum tersedia.</p>
                )}
                <p className="text-muted-foreground text-xs">{mba?.warning}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
