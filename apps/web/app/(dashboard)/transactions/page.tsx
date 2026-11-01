"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { DataPagination } from "@/components/data-pagination";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type SaleItem = { id: string; description: string; qty: number; unitPrice: string; lineTotal: string };
type Sale = {
  id: string;
  occurredAt: string;
  customerId: string | null;
  notes: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  source: string;
  items: SaleItem[];
};
type Customer = { id: string; name: string };
type FormItem = { description: string; qty: string; unitPrice: string };

const PAGE_SIZE = 20;
const emptyItem: FormItem = { description: "", qty: "1", unitPrice: "" };

function toLocalInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function TransactionsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: "", to: "" });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    occurredAt: toLocalInput(new Date().toISOString()),
    customerId: "",
    notes: "",
    items: [{ ...emptyItem }] as FormItem[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
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
  }, [page, range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch<{ items: Customer[] }>("/customers?limit=100")
      .then((res) => setCustomers(res.items))
      .catch(() => setCustomers([]));
  }, []);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({
      occurredAt: toLocalInput(new Date().toISOString()),
      customerId: "",
      notes: "",
      items: [{ ...emptyItem }],
    });
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(sale: Sale) {
    setEditingId(sale.id);
    setShowForm(true);
    setForm({
      occurredAt: toLocalInput(sale.occurredAt),
      customerId: sale.customerId ?? "",
      notes: sale.notes ?? "",
      items: sale.items.map((item) => ({
        description: item.description,
        qty: String(item.qty),
        unitPrice: item.unitPrice,
      })),
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const body = {
      occurredAt: new Date(form.occurredAt).toISOString(),
      customerId: form.customerId || undefined,
      notes: form.notes || undefined,
      items: form.items.map((item) => ({
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
    };
    try {
      if (editingId) {
        await apiFetch(`/sales/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/sales", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan transaksi.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus transaksi ini? Tindakan tidak bisa dibatalkan.")) return;
    try {
      await apiFetch(`/sales/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus transaksi.");
    }
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Transaksi ({total})</CardTitle>
          <Button size="sm" onClick={startCreate}>Tambah transaksi</Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs">
              Dari
              <Input type="date" value={range.from} onChange={(e) => { setPage(1); setRange({ ...range, from: e.target.value }); }} />
            </label>
            <label className="grid gap-1 text-xs">
              Sampai
              <Input type="date" value={range.to} onChange={(e) => { setPage(1); setRange({ ...range, to: e.target.value }); }} />
            </label>
            <Button size="sm" variant="outline" onClick={() => { setPage(1); setRange({ from: "", to: "" }); }}>
              Reset filter
            </Button>
            <span className="text-muted-foreground text-xs">Zona waktu input: UTC</span>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {showForm && (
            <form className="bg-muted/40 grid gap-3 rounded-md border p-3" onSubmit={submit}>
              <div className="grid gap-2 md:grid-cols-3">
                <label className="grid gap-1 text-xs">
                  Tanggal & jam (UTC)
                  <Input type="datetime-local" required value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
                </label>
                <label className="grid gap-1 text-xs md:col-span-2">
                  Pelanggan (opsional)
                  <select
                    className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  >
                    <option value="">Tanpa pelanggan</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-2">
                <Label>Item</Label>
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_100px_140px_auto]">
                    <Input
                      placeholder="Deskripsi produk"
                      required
                      value={item.description}
                      onChange={(e) => setForm({ ...form, items: form.items.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)) })}
                    />
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => setForm({ ...form, items: form.items.map((it, i) => (i === index ? { ...it, qty: e.target.value } : it)) })}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Harga satuan"
                      value={item.unitPrice}
                      onChange={(e) => setForm({ ...form, items: form.items.map((it, i) => (i === index ? { ...it, unitPrice: e.target.value } : it)) })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={form.items.length === 1}
                      onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}>
                  Tambah item
                </Button>
              </div>

              <label className="grid gap-1 text-xs">
                Catatan (opsional)
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>

              <div className="flex gap-2">
                <Button type="submit" size="sm">{editingId ? "Simpan perubahan" : "Simpan transaksi"}</Button>
                <Button type="button" size="sm" variant="outline" onClick={resetForm}>Batal</Button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : sales.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Belum ada transaksi pada filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2">Tanggal</th>
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
                      onEdit={() => startEdit(sale)}
                      onDelete={() => remove(sale.id)}
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
  return (
    <>
      <tr className="border-b align-top">
        <td className="py-2">{formatDateTime(sale.occurredAt)}</td>
        <td>
          {sale.items.map((item) => `${item.description} ×${item.qty}`).join(", ")}
        </td>
        <td>{formatRupiah(sale.total)}</td>
        <td className="text-right whitespace-nowrap">
          <Button size="sm" variant="ghost" onClick={onToggle}>{expanded ? "Tutup" : "Detail"}</Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>Hapus</Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/30">
          <td colSpan={4} className="p-3">
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
              Subtotal {formatRupiah(sale.subtotal)} · Diskon {formatRupiah(sale.discount)} · Pajak {formatRupiah(sale.tax)} · Sumber {sale.source}
            </p>
            {sale.notes && <p className="mt-1">Catatan: {sale.notes}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
