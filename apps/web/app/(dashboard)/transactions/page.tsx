"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { DataPagination } from "@/components/data-pagination";
import { SaleEditor, type SaleForEdit } from "@/components/sales/sale-editor";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

type SaleItem = { id: string; productId: string | null; description: string; qty: number; unitPrice: string; lineTotal: string };
type Sale = {
  id: string;
  code: string;
  occurredAt: string;
  customerId: string | null;
  customerName: string | null;
  notes: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  source: string;
  status: string;
  items: SaleItem[];
};

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState("posted");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SaleForEdit | null | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        status: statusFilter,
      });
      if (range.from) query.set("from", range.from);
      if (range.to) query.set("to", `${range.to}T23:59:59.999Z`);
      const res = await apiFetch<{ sales: Sale[]; total: number }>(`/sales?${query.toString()}`);
      setSales(res.sales);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat transaksi.");
    } finally {
      setLoading(false);
    }
  }, [page, range, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmVoid() {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/sales/${deleteTargetId}`, { method: "DELETE" });
      await load();
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan transaksi.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Batalkan transaksi"
        description="Transaksi akan ditandai void dan tetap tersimpan di riwayat. Data ini tidak dihitung pada ringkasan dan model ML."
        onConfirm={confirmVoid}
        confirmLabel="Batalkan transaksi"
        cancelLabel="Tutup"
        loading={deleteLoading}
        variant="destructive"
      />
      <div className="grid gap-4 p-4 dash-stagger">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Transaksi ({total})</CardTitle>
            <Button size="sm" onClick={() => setEditing(null)}>Tambah transaksi</Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {editing !== undefined && (
              <SaleEditor
                sale={editing}
                onSaved={() => {
                  setEditing(undefined);
                  load();
                }}
                onCancel={() => setEditing(undefined)}
              />
            )}

            <div className="flex flex-wrap items-end gap-2">
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
              <Button size="sm" variant="outline" onClick={() => { setPage(1); setRange({ from: "", to: "" }); setStatusFilter("posted"); }}>
                Reset filter
              </Button>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            {loading ? (
              <p className="text-muted-foreground text-sm">Memuat...</p>
            ) : sales.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Belum ada transaksi pada filter ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="py-2">Kode</th>
                      <th>Tanggal</th>
                      <th>Pelanggan</th>
                      <th>Item</th>
                      <th>Total</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <SaleRow
                        key={sale.id}
                        sale={sale}
                        expanded={detailId === sale.id}
                        onToggle={() => setDetailId(detailId === sale.id ? null : sale.id)}
                        onEdit={() => setEditing(sale)}
                        onDelete={() => { setDeleteTargetId(sale.id); setDeleteDialogOpen(true); }}
                      />
                    ))}
                  </tbody>
                </table>
                <DataPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SaleRow({
  sale,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  sale: Sale;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const voided = sale.status === "void";
  return (
    <>
      <tr className={`border-b align-top ${voided ? "text-muted-foreground line-through" : ""}`}>
        <td className="py-2">{sale.code}</td>
        <td>{formatDateTime(sale.occurredAt)}</td>
        <td>{sale.customerName ?? "-"}</td>
        <td>{sale.items.map((item) => `${item.description} ×${item.qty}`).join(", ")}</td>
        <td>{formatRupiah(sale.total)}</td>
        <td className="text-right whitespace-nowrap">
          <Button size="sm" variant="ghost" onClick={onToggle}>{expanded ? "Tutup" : "Detail"}</Button>
          {!voided && <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>}
          {!voided && <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>Batalkan</Button>}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/30">
          <td colSpan={6} className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th>Deskripsi</th>
                  <th>Qty</th>
                  <th>Harga satuan</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.qty}</td>
                    <td>{formatRupiah(item.unitPrice)}</td>
                    <td>{formatRupiah(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-muted-foreground mt-2">
              Subtotal {formatRupiah(sale.subtotal)} · Diskon {formatRupiah(sale.discount)} · Pajak {formatRupiah(sale.tax)} · Sumber {sale.source} · Status {voided ? "dibatalkan" : "aktif"}
            </p>
            {sale.notes && <p className="mt-1">Catatan: {sale.notes}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
