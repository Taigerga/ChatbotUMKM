"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReceiptText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate, formatRupiah, toDateInput } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SectionHeader } from "@/components/warung/section-header";
import { StatStrip } from "@/components/warung/stat-strip";
import { EmptyState } from "@/components/warung/empty-state";

type Summary = {
  period: { from: string; to: string };
  saleCount: number;
  total: string;
  itemCount: number;
  averageOrder: string;
  daily: { date: string; value: string }[];
  topProducts: { name: string; qty: number; total: string }[];
  topCustomers: { name: string; total: string; count: number }[];
};

function rangeDays(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  return { from: toDateInput(from), to: toDateInput(to) };
}

export default function OverviewPage() {
  const [range, setRange] = useState(() => rangeDays(30));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ from: range.from, to: `${range.to}T23:59:59.999Z` });
      setSummary(await apiFetch<Summary>(`/overview/summary?${query.toString()}`));
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "Gagal memuat ringkasan.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <SectionHeader
        eyebrow="Ringkasan toko"
        title="Papan hari ini"
        description={`Penjualan ${formatDate(range.from)} sampai ${formatDate(range.to)}.`}
        action={
          <div className="flex flex-wrap items-end gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                size="sm"
                variant={range.from === rangeDays(days).from && range.to === rangeDays(days).to ? "default" : "outline"}
                onClick={() => setRange(rangeDays(days))}
              >
                {days} hari
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs">
          Dari
          <Input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </label>
        <label className="grid gap-1 text-xs">
          Sampai
          <Input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </label>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Terapkan"}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading && !summary && (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-20 rounded-[10px]" />
          ))}
        </div>
      )}

      {!loading && summary && summary.saleCount === 0 && (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada catatan penjualan"
          description={`Tidak ada transaksi pada ${formatDate(range.from)} – ${formatDate(range.to)}. Catat lewat Chatbot, form Transaksi, atau impor CSV.`}
        />
      )}

      {summary && summary.saleCount > 0 && (
        <>
          <Card>
            <CardContent className="pt-4">
              <StatStrip
                items={[
                  { label: "Transaksi", value: summary.saleCount, hint: "nota tercatat" },
                  { label: "Omzet", value: formatRupiah(summary.total), hint: "total masuk" },
                  { label: "Item terjual", value: summary.itemCount, hint: "barang keluar" },
                  { label: "Rata-rata transaksi", value: formatRupiah(summary.averageOrder), hint: "per nota" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="warung-title text-lg">Tren penjualan harian</CardTitle>
              <p className="text-muted-foreground text-xs">
                {formatDate(range.from)} – {formatDate(range.to)}
              </p>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.daily.map((d) => ({ ...d, value: Number(d.value) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)}rb`} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    formatter={(value) => formatRupiah(Number(value))}
                    labelFormatter={(label) => formatDate(String(label))}
                  />
                  <Line type="monotone" dataKey="value" name="Omzet" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="warung-title text-lg">Produk terlaris</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm">
                  {summary.topProducts.map((p) => (
                    <li key={p.name} className="flex justify-between gap-2 border-b border-dashed py-1 last:border-0">
                      <span className="truncate">{p.name} ({p.qty})</span>
                      <span className="warung-price shrink-0">{formatRupiah(p.total)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="warung-title text-lg">Pelanggan teratas</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm">
                  {summary.topCustomers.map((c) => (
                    <li key={c.name} className="flex justify-between gap-2 border-b border-dashed py-1 last:border-0">
                      <span className="truncate">{c.name} ({c.count}x)</span>
                      <span className="warung-price shrink-0">{formatRupiah(c.total)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
