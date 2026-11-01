"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Tab = "product" | "customer" | "sale";

type SaleItem = { description: string; qty: string; unitPrice: string };

const emptyProduct = { sku: "", name: "", category: "", price: "", cost: "" };
const emptyCustomer = { externalRef: "", name: "", phone: "", email: "" };
const emptySale = {
  occurredAt: new Date().toISOString().slice(0, 16),
  customerId: "",
  notes: "",
  items: [{ description: "", qty: "1", unitPrice: "" }] as SaleItem[],
};

export default function QuickInputPage() {
  const [tab, setTab] = useState<Tab>("product");
  const [product, setProduct] = useState(emptyProduct);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [sale, setSale] = useState(emptySale);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitProduct(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          sku: product.sku,
          name: product.name,
          category: product.category || undefined,
          price: Number(product.price),
          cost: product.cost ? Number(product.cost) : undefined,
        }),
      });
      setProduct(emptyProduct);
      setMessage("Produk berhasil ditambahkan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCustomer(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          externalRef: customer.externalRef,
          name: customer.name,
          phone: customer.phone || undefined,
          email: customer.email || undefined,
        }),
      });
      setCustomer(emptyCustomer);
      setMessage("Pelanggan berhasil ditambahkan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pelanggan.");
    } finally {
      setBusy(false);
    }
  }

  async function submitSale(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify({
          occurredAt: new Date(sale.occurredAt).toISOString(),
          customerId: sale.customerId || undefined,
          notes: sale.notes || undefined,
          items: sale.items.map((item) => ({
            description: item.description,
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice),
          })),
        }),
      });
      setSale(emptySale);
      setMessage("Transaksi berhasil ditambahkan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan transaksi.");
    } finally {
      setBusy(false);
    }
  }

  function updateSaleItem(index: number, field: keyof SaleItem, value: string) {
    setSale((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Input Cepat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "product", label: "Produk" },
              { value: "customer", label: "Pelanggan" },
              { value: "sale", label: "Transaksi" },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={tab === item.value ? "default" : "outline"}
                onClick={() => {
                  setTab(item.value as Tab);
                  setMessage(null);
                  setError(null);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}

          {tab === "product" && (
            <form className="grid gap-2 md:grid-cols-6" onSubmit={submitProduct}>
              <Input placeholder="SKU" value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })} required />
              <Input placeholder="Nama" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} required />
              <Input placeholder="Kategori" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
              <Input placeholder="Harga" type="number" min="0" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} required />
              <Input placeholder="Biaya" type="number" min="0" value={product.cost} onChange={(e) => setProduct({ ...product, cost: e.target.value })} />
              <Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Tambah produk"}</Button>
            </form>
          )}

          {tab === "customer" && (
            <form className="grid gap-2 md:grid-cols-5" onSubmit={submitCustomer}>
              <Input placeholder="Referensi" value={customer.externalRef} onChange={(e) => setCustomer({ ...customer, externalRef: e.target.value })} required />
              <Input placeholder="Nama" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
              <Input placeholder="Telepon" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              <Input placeholder="Email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              <Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Tambah pelanggan"}</Button>
            </form>
          )}

          {tab === "sale" && (
            <form className="grid gap-3" onSubmit={submitSale}>
              <div className="grid gap-2 md:grid-cols-3">
                <Input type="datetime-local" value={sale.occurredAt} onChange={(e) => setSale({ ...sale, occurredAt: e.target.value })} required />
                <Input placeholder="ID pelanggan (opsional)" value={sale.customerId} onChange={(e) => setSale({ ...sale, customerId: e.target.value })} />
                <Input placeholder="Catatan (opsional)" value={sale.notes} onChange={(e) => setSale({ ...sale, notes: e.target.value })} />
              </div>
              <div className="grid gap-2">
                {sale.items.map((item, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-4">
                    <Input placeholder="Deskripsi item" value={item.description} onChange={(e) => updateSaleItem(index, "description", e.target.value)} required />
                    <Input type="number" min="1" placeholder="Qty" value={item.qty} onChange={(e) => updateSaleItem(index, "qty", e.target.value)} required />
                    <Input type="number" min="0" placeholder="Harga satuan" value={item.unitPrice} onChange={(e) => updateSaleItem(index, "unitPrice", e.target.value)} required />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSale((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}
                      disabled={sale.items.length === 1}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSale((current) => ({ ...current, items: [...current.items, { description: "", qty: "1", unitPrice: "" }] }))}
                >
                  Tambah item
                </Button>
              </div>
              <Button type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Tambah transaksi"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}