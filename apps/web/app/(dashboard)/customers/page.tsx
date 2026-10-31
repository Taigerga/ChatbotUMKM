"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Customer = { id: string; externalRef: string; name: string; phone: string | null; email: string | null };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ externalRef: "", name: "", phone: "", email: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch<{ items: Customer[]; total: number }>(`/customers?q=${encodeURIComponent(q)}`);
    setItems(res.items);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [q]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/customers", { method: "POST", body: JSON.stringify({ externalRef: form.externalRef, name: form.name, phone: form.phone || undefined, email: form.email || undefined }) });
      setForm({ externalRef: "", name: "", phone: "", email: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus pelanggan ini?")) return;
    await apiFetch(`/customers/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-2 md:grid-cols-5" onSubmit={create}>
            <Input placeholder="Referensi" value={form.externalRef} onChange={(e) => setForm({ ...form, externalRef: e.target.value })} required />
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Button type="submit">Tambah</Button>
          </form>
          <Input className="mb-3" placeholder="Cari pelanggan..." value={q} onChange={(e) => setQ(e.target.value)} />
          {error && <p className="text-destructive mb-2 text-sm">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2">Referensi</th>
                  <th>Nama</th>
                  <th>Telepon</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{c.externalRef}</td>
                    <td>{c.name}</td>
                    <td>{c.phone ?? "-"}</td>
                    <td>{c.email ?? "-"}</td>
                    <td className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>
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
