"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { DataPagination } from "@/components/data-pagination";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Customer = { id: string; externalRef: string; name: string; phone: string | null; email: string | null };
type Sale = { id: string; occurredAt: string; total: string };
type FormState = { externalRef: string; name: string; phone: string; email: string };

const PAGE_SIZE = 20;
const emptyForm: FormState = { externalRef: "", name: "", phone: "", email: "" };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{ customer: Customer; sales: Sale[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (q) query.set("q", q);
      const res = await apiFetch<{ items: Customer[]; total: number }>(`/customers?${query.toString()}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pelanggan.");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const body = {
      externalRef: form.externalRef,
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
    };
    try {
      if (editingId) {
        await apiFetch(`/customers/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/customers", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pelanggan.");
    }
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      externalRef: customer.externalRef,
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    });
  }

  async function showDetail(customer: Customer) {
    setDetail({ customer, sales: [] });
    try {
      const res = await apiFetch<{ sales: Sale[]; total: number }>(`/sales?customerId=${customer.id}&limit=10`);
      setDetail({ customer, sales: res.sales });
    } catch {
      setDetail({ customer, sales: [] });
    }
  }

  async function remove(customer: Customer) {
    if (!confirm(`Hapus pelanggan "${customer.name}"?`)) return;
    try {
      await apiFetch(`/customers/${customer.id}`, { method: "DELETE" });
      if (detail?.customer.id === customer.id) setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus pelanggan.");
    }
  }

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <Card>
        <CardHeader><CardTitle>Pelanggan ({total})</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <form className="grid gap-2 md:grid-cols-5" onSubmit={submit}>
            <Input placeholder="Referensi" value={form.externalRef} onChange={(e) => setForm({ ...form, externalRef: e.target.value })} required />
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="flex gap-1">
              <Button type="submit" className="flex-1">{editingId ? "Simpan" : "Tambah"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>}
            </div>
          </form>

          <Input
            placeholder="Cari pelanggan (nama/referensi/telepon)..."
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}

          {loading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Belum ada pelanggan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2">Referensi</th>
                    <th>Nama</th>
                    <th>Telepon</th>
                    <th>Email</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((customer) => (
                    <tr key={customer.id} className="border-b">
                      <td className="py-2">{customer.externalRef}</td>
                      <td>{customer.name}</td>
                      <td>{customer.phone ?? "-"}</td>
                      <td>{customer.email ?? "-"}</td>
                      <td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => showDetail(customer)}>Detail</Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(customer)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(customer)}>Hapus</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DataPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {detail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detail: {detail.customer.name}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Tutup</Button>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>Referensi {detail.customer.externalRef} · Telepon {detail.customer.phone ?? "-"} · Email {detail.customer.email ?? "-"}</p>
            <p className="text-muted-foreground text-xs">Riwayat transaksi terakhir:</p>
            {detail.sales.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada transaksi untuk pelanggan ini.</p>
            ) : (
              <ul className="grid gap-1">
                {detail.sales.map((sale) => (
                  <li key={sale.id} className="flex justify-between border-b py-1">
                    <span>{formatDateTime(sale.occurredAt)}</span>
                    <span>{formatRupiah(sale.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
