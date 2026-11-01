"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { DataPagination } from "@/components/data-pagination";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Product = { id: string; sku: string; name: string; category: string | null; price: string; cost: string | null };
type FormState = { sku: string; name: string; category: string; price: string; cost: string };

const PAGE_SIZE = 20;
const emptyForm: FormState = { sku: "", name: "", category: "", price: "", cost: "" };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (q) query.set("q", q);
      const res = await apiFetch<{ items: Product[]; total: number }>(`/products?${query.toString()}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat produk.");
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
      sku: form.sku,
      name: form.name,
      category: form.category || undefined,
      price: Number(form.price),
      cost: form.cost ? Number(form.cost) : undefined,
    };
    try {
      if (editingId) {
        await apiFetch(`/products/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category ?? "",
      price: product.price,
      cost: product.cost ?? "",
    });
  }

  async function remove(product: Product) {
    if (!confirm(`Hapus produk "${product.name}"?`)) return;
    try {
      await apiFetch(`/products/${product.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus produk.");
    }
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader><CardTitle>Produk ({total})</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <form className="grid gap-2 md:grid-cols-6" onSubmit={submit}>
            <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder="Harga" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Biaya" type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <div className="flex gap-1">
              <Button type="submit" className="flex-1">{editingId ? "Simpan" : "Tambah"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>}
            </div>
          </form>

          <Input
            placeholder="Cari produk (nama/SKU)..."
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}

          {loading ? (
            <p className="text-muted-foreground text-sm">Memuat...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Belum ada produk. Tambah lewat form atau impor CSV.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2">SKU</th>
                    <th>Nama</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="py-2">{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.category ?? "-"}</td>
                      <td>{formatRupiah(product.price)}</td>
                      <td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(product)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(product)}>Hapus</Button>
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
    </div>
  );
}
