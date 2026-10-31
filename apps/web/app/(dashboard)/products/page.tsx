"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Product = { id: string; sku: string; name: string; category: string | null; price: string; cost: string | null };

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ sku: "", name: "", category: "", price: "", cost: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch<{ items: Product[]; total: number }>(`/products?q=${encodeURIComponent(q)}`);
    setItems(res.items);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [q]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/products", { method: "POST", body: JSON.stringify({ sku: form.sku, name: form.name, category: form.category || undefined, price: Number(form.price), cost: form.cost ? Number(form.cost) : undefined }) });
      setForm({ sku: "", name: "", category: "", price: "", cost: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus produk ini?")) return;
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-2 md:grid-cols-6" onSubmit={create}>
            <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder="Harga" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Biaya" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <Button type="submit">Tambah</Button>
          </form>
          <Input className="mb-3" placeholder="Cari produk..." value={q} onChange={(e) => setQ(e.target.value)} />
          {error && <p className="text-destructive mb-2 text-sm">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2">SKU</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category ?? "-"}</td>
                    <td>Rp{Number(p.price).toLocaleString("id-ID")}</td>
                    <td className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
