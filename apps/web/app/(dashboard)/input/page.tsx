"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type Tab = "product" | "customer" | "sale";

type ProductFields = {
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number | null;
};

type CustomerFields = {
  externalRef: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type SaleItem = { description: string; qty: number; unitPrice: number };

type SaleFields = {
  occurredAt: string;
  customerId: string | null;
  notes: string | null;
  items: SaleItem[];
};

const emptyProduct: ProductFields = { sku: "", name: "", category: "", price: 0, cost: 0 };
const emptyCustomer: CustomerFields = { externalRef: "", name: "", phone: null, email: null };
const emptySaleItem: SaleItem = { description: "", qty: 1, unitPrice: 0 };
const emptySale: SaleFields = {
  occurredAt: new Date().toISOString().slice(0, 16),
  customerId: "",
  notes: "",
  items: [emptySaleItem],
};

export default function QuickInputPage() {
  const [tab, setTab] = useState<Tab>("product");
  const [product, setProduct] = useState(emptyProduct);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [sale, setSale] = useState(emptySale);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateProduct(field: keyof ProductFields, value: ProductFields[typeof field]) {
    setProduct((p) => ({ ...p, [field]: value }));
  }

  function updateCustomer(field: keyof CustomerFields, value: CustomerFields[typeof field]) {
    setCustomer((c) => ({ ...c, [field]: value }));
  }

  function updateSaleItem(index: number, field: keyof SaleItem, value: string | number) {
    setSale((s) => {
      const newItems = s.items.map((item, i) => {
        if (i === index) {
          const itemCopy = { ...item } as SaleItem;
          if (field === "qty" || field === "unitPrice") {
            itemCopy[field] = Number(value) as SaleItem[typeof field];
          } else {
            itemCopy[field] = value as string;
          }
          return itemCopy;
        }
        return item;
      });
      return { ...s, items: newItems };
    });
  }

  function addSaleItem() {
    setSale((s) => ({ ...s, items: [...s.items, { ...emptySaleItem }] }));
  }

  function removeSaleItem(index: number) {
    setSale((s) => ({ ...s, items: s.items.filter((_, i) => i !== index) }));
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload: any = {};

      if (product.sku || product.name) {
        const prod = await apiFetch<{ id: string }>("/products", {
          method: "POST",
          body: JSON.stringify({
            sku: product.sku,
            name: product.name,
            category: product.category || undefined,
            price: product.price,
            cost: product.cost || undefined,
          }),
        });
        payload.productId = prod.id;
        setMessage(`Produk ${product.name ?? product.sku} dibuat baru`);
      } else {
        payload.productId = undefined;
      }

      if (customer.name || customer.externalRef) {
        const cust = await apiFetch<{ id: string }>("/customers", {
          method: "POST",
          body: JSON.stringify({
            externalRef: customer.externalRef || undefined,
            name: customer.name,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
          }),
        });
        payload.customerId = cust.id;
        setMessage(`Pelanggan ${customer.name} dibuat baru`);
      } else {
        payload.customerId = undefined;
      }

      const items = sale.items.map((item) => ({
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
      }));

      const body: any = {
        occurredAt: new Date(sale.occurredAt).toISOString(),
        customerId: payload.customerId,
        notes: sale.notes || undefined,
        items,
      };

      if (payload.productId) {
        body.productId = payload.productId;
      }

      const res = await apiFetch<{ saleId: string }>("/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage(`Transaksi ${res.saleId} berhasil disimpan`);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setTab("product");
    setProduct(emptyProduct);
    setCustomer(emptyCustomer);
    setSale(emptySale);
    setMessage(null);
    setError(null);
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Input Cepat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col md:flex-row gap-2">
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
                onClick={() => setTab(item.value as Tab)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {message && <p className="text-sm text-green-600 mb-2">{message}</p>}
          {error && <p className="text-destructive text-sm mb-2">{error}</p>}

          {tab === "product" && (
            <Card className="border-primary/20">
              <CardContent className="grid gap-3">
                <Input placeholder="SKU" value={product.sku} onChange={(e) => updateProduct("sku", e.target.value)} required />
                <Input placeholder="Nama" value={product.name} onChange={(e) => updateProduct("name", e.target.value)} required />
                <Input placeholder="Kategori" value={product.category} onChange={(e) => updateProduct("category", e.target.value)} />
                <Input type="number" min="0" placeholder="Harga" value={product.price} onChange={(e) => updateProduct("price", Number(e.target.value))} required />
                <Input type="number" min="0" placeholder="Biaya" value={product.cost ?? ""} onChange={(e) => updateProduct("cost", e.target.value === "" ? null : Number(e.target.value))} />
                <Button type="button" onClick={resetForm} className="mt-2 w-full" disabled={busy}>
                  {busy ? "Menyimpan..." : "Batal"}
                </Button>
              </CardContent>
            </Card>
          )}

          {tab === "customer" && (
            <Card className="border-primary/20">
              <CardContent className="grid gap-3">
                <Input placeholder="Referensi" value={customer.externalRef} onChange={(e) => updateCustomer("externalRef", e.target.value)} required />
                <Input placeholder="Nama" value={customer.name} onChange={(e) => updateCustomer("name", e.target.value)} required />
                <Input placeholder="Telepon" value={customer.phone ?? ""} onChange={(e) => updateCustomer("phone", e.target.value || null)} />
                <Input type="email" placeholder="Email" value={customer.email ?? ""} onChange={(e) => updateCustomer("email", e.target.value || null)} />
                <Button type="button" onClick={resetForm} className="mt-2 w-full" disabled={busy}>
                  {busy ? "Menyimpan..." : "Batal"}
                </Button>
              </CardContent>
            </Card>
          )}

          {tab === "sale" && (
            <Card className="border-primary/20">
              <CardContent className="grid gap-4">
                <div className="grid gap-2 md:grid-cols-3">
                  <Input type="datetime-local" placeholder="Tanggal & jam" value={sale.occurredAt} onChange={(e) => setSale((s) => ({ ...s, occurredAt: e.target.value }))} required />
                  <Input placeholder="ID pelanggan (opsional)" value={sale.customerId ?? ""} onChange={(e) => setSale((s) => ({ ...s, customerId: e.target.value || null }))} />
                  <Input placeholder="Catatan (opsional)" value={sale.notes ?? ""} onChange={(e) => setSale((s) => ({ ...s, notes: e.target.value || null }))} />
                </div>

                <div className="grid gap-2">
                  {sale.items.map((item, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-4 border rounded p-2">
                      <Input placeholder="Deskripsi" value={item.description} onChange={(e) => updateSaleItem(index, "description", e.target.value)} required />
                      <Input type="number" min="1" placeholder="Qty" value={item.qty} onChange={(e) => updateSaleItem(index, "qty", e.target.value)} required />
                      <Input type="number" min="0" placeholder="Harga satuan" value={item.unitPrice} onChange={(e) => updateSaleItem(index, "unitPrice", e.target.value)} required />
                      <Button variant="outline" size="sm" onClick={() => removeSaleItem(index)}>Hapus</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSaleItem} className="mt-2">Tambah item</Button>
                </div>

                <Button type="submit" onClick={submitForm} disabled={busy} className="mt-3 w-full">
                  {busy ? "Menyimpan..." : "Simpan Transaksi"}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}