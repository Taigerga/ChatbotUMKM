"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

type Summary = {
  saleCount: number;
  total: string;
  itemCount: number;
  averageOrder: string;
  topProducts: { name: string; qty: number; total: string }[];
  topCustomers: { name: string; total: string; count: number }[];
};

export default function OverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    apiFetch<Summary>("/overview/summary").then(setSummary).catch(() => setSummary(null));
  }, []);

  if (!summary) return <div className="p-4 text-sm">Memuat...</div>;

  return (
    <div className="grid gap-4 p-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Transaksi</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.saleCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Omzet</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rp{Number(summary.total).toLocaleString("id-ID")}</CardContent></Card>
        <Card><CardHeader><CardTitle>Item</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.itemCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Rata-rata</CardTitle></CardHeader><CardContent className="text-2xl font-bold">Rp{Number(summary.averageOrder).toLocaleString("id-ID")}</CardContent></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Produk terlaris</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {summary.topProducts.map((p, i) => (
                <li key={i} className="flex justify-between">
                  <span>{p.name} ({p.qty})</span>
                  <span>Rp{Number(p.total).toLocaleString("id-ID")}</span>
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
                <li key={i} className="flex justify-between">
                  <span>{c.name} ({c.count}x)</span>
                  <span>Rp{Number(c.total).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
