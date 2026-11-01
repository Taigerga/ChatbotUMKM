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
import { apiFetch } from "@/lib/api";
import { formatDate, formatRupiah, toDateInput } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

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
    <div className="grid gap-4 p-4">
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

      {!loading && summary && summary.saleCount === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Belum ada transaksi pada {formatDate(range.from)} – {formatDate(range.to)}. Catat lewat Chatbot, form
            Transaksi, atau impor CSV.
          </CardContent>
        </Card>
      )}

      {summary && summary.saleCount > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader><CardTitle>Transaksi</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{summary.saleCount}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Omzet</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{formatRupiah(summary.total)}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Item terjual</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{summary.itemCount}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Rata-rata transaksi</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{formatRupiah(summary.averageOrder)}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tren penjualan harian</CardTitle>
              <p className="text-muted-foreground text-xs">
                {formatDate(range.from)} – {formatDate(range.to)}
              </p>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.daily.map((d) => ({ ...d, value: Number(d.value) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value: number) => `${Math.round(value / 1000)}rb`} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => formatRupiah(Number(value))}
                    labelFormatter={(label) => formatDate(String(label))}
                  />
                  <Line type="monotone" dataKey="value" name="Omzet" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Produk terlaris</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm">
                  {summary.topProducts.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{p.name} ({p.qty})</span>
                      <span className="shrink-0">{formatRupiah(p.total)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pelanggan teratas</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm">
                  {summary.topCustomers.map((c, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{c.name} ({c.count}x)</span>
                      <span className="shrink-0">{formatRupiah(c.total)}</span>
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
