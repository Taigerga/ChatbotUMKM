"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { DataPagination } from "@/components/data-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Line = {
  id: string;
  saleCode: string;
  occurredAt: string;
  status: string;
  customerName: string | null;
  productName: string;
  sku: string | null;
  category: string | null;
  qty: number;
  unitPrice: string;
  lineTotal: string;
};

const PAGE_SIZE = 25;

export default function SalesBookPage() {
  const [items, setItems] = useState<Line[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState("posted");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        status: statusFilter,
      });
      if (q) query.set("q", q);
      if (range.from) query.set("from", range.from);
      if (range.to) query.set("to", `${range.to}T23:59:59.999Z`);
      const res = await apiFetch<{ items: Line[]; total: number }>(`/sales/lines?${query.toString()}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat buku penjualan.");
    } finally {
      setLoading(false);
    }
  }, [page, q, range, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <Card>
        <CardHeader>
          <CardTitle>Buku Penjualan ({total} baris)</CardTitle>
          <p className="text-muted-foreground text-xs">Satu baris per item terjual, menggabungkan pelanggan, transaksi, dan produk.</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <Input className="max-w-xs" placeholder="Cari kode, pelanggan, produk, SKU..." value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
            <label className="grid gap-1 text-xs">
              Dari
              <Input type="date" value={range.from} onChange={(e) => { setPage(1); setRange({ ...range, from: e.target.value }); }} />
            </label>
            <label className="grid gap-1 text-xs">
              Sampai
              <Input type="date" value={range.to} onChange={(e) => { setPage(1); setRange({ ...range, to: e.target.value }); }} />
            </label>
            <label className="grid gap-1 text-xs">
              Status
              <select
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={statusFilter}
                onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
              >
                <option value="posted">Aktif</option>
                <option value="void">Dibatalkan</option>
                <option value="all">Semua</option>
              </select>
            </label>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {loading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Belum ada baris penjualan pada filter ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2">Kode</th>
                    <th>Tanggal</th>
                    <th>Pelanggan</th>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Kategori</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Harga</th>
                    <th className="text-right">Total baris</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((line) => (
                    <tr key={line.id} className={`border-b ${line.status === "void" ? "text-muted-foreground line-through" : ""}`}>
                      <td className="py-2">{line.saleCode}</td>
                      <td>{formatDateTime(line.occurredAt)}</td>
                      <td>{line.customerName ?? "-"}</td>
                      <td>{line.productName}</td>
                      <td>{line.sku ?? "-"}</td>
                      <td>{line.category ?? "-"}</td>
                      <td className="text-right tabular-nums">{line.qty}</td>
                      <td className="text-right tabular-nums">{formatRupiah(line.unitPrice)}</td>
                      <td className="text-right tabular-nums">{formatRupiah(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DataPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
