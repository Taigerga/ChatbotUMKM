"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type ProductFields = {
  sku: string;
  name: string;
  category: string;
  price: string;
  cost: string;
};

type CustomerFields = {
  externalRef: string;
  name: string;
  phone: string;
  email: string;
};

type SaleItem = { description: string; qty: string; unitPrice: string };

type SaleFields = {
  occurredAt: string;
  notes: string;
  items: SaleItem[];
};

const emptyProduct: ProductFields = { sku: "", name: "", category: "", price: "", cost: "" };
const emptyCustomer: CustomerFields = { externalRef: "", name: "", phone: "", email: "" };
const emptySaleItem: SaleItem = { description: "", qty: "1", unitPrice: "" };
const emptySale: SaleFields = {
  occurredAt: new Date().toISOString().slice(0, 16),
  notes: "",
  items: [emptySaleItem],
};

export default function QuickInputPage() {
  const [product, setProduct] = useState(emptyProduct);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [sale, setSale] = useState(emptySale);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateProduct(field: keyof ProductFields, value: string) {
    setProduct((p) => ({ ...p, [field]: value }));
  }

  function updateCustomer(field: keyof CustomerFields, value: string) {
    setCustomer((c) => ({ ...c, [field]: value }));
  }

  function updateSaleItem(index: number, field: keyof SaleItem, value: string) {
    setSale((s) => ({
      ...s,
      items: s.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
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
      let productId: string | undefined;
      const productFilled = product.sku || product.name || product.category || product.price || product.cost;
      if (productFilled) {
        if (!product.sku || !product.name || !product.price) {
          throw new Error("Produk: SKU, nama, dan harga wajib diisi jika bagian produk diisi.");
        }
        const createdProduct = await apiFetch<{ id: string }>("/products", {
          method: "POST",
          body: JSON.stringify({
            sku: product.sku,
            name: product.name,
            category: product.category || undefined,
            price: Number(product.price),
            cost: product.cost ? Number(product.cost) : undefined,
          }),
        });
        productId = createdProduct.id;
      }

      let customerId: string | undefined;
      const customerFilled = customer.externalRef || customer.name || customer.phone || customer.email;
      if (customerFilled) {
        if (!customer.externalRef || !customer.name) {
          throw new Error("Pelanggan: referensi dan nama wajib diisi jika bagian pelanggan diisi.");
        }
        const createdCustomer = await apiFetch<{ id: string }>("/customers", {
          method: "POST",
          body: JSON.stringify({
            externalRef: customer.externalRef,
            name: customer.name,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
          }),
        });
        customerId = createdCustomer.id;
      }

      const items = sale.items.map((item, index) => ({
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        productId: index === 0 ? productId : undefined,
      }));

      if (items.length === 0) {
        throw new Error("Transaksi minimal punya satu item.");
      }
      for (const item of items) {
        if (!item.description || !Number.isInteger(item.qty) || item.qty < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
          throw new Error("Setiap item transaksi wajib punya deskripsi, qty >= 1, dan harga valid.");
        }
      }

      const createdSale = await apiFetch<{ sale: { id: string } }>("/sales", {
        method: "POST",
        body: JSON.stringify({
          occurredAt: new Date(sale.occurredAt).toISOString(),
          customerId,
          notes: sale.notes || undefined,
          items,
        }),
      });

      setMessage(
        [
          productFilled ? "Produk dibuat." : null,
          customerFilled ? "Pelanggan dibuat." : null,
          `Transaksi ${createdSale.sale.id} disimpan.`,
        ]
          .filter(Boolean)
          .join(" "),
      );
      setProduct(emptyProduct);
      setCustomer(emptyCustomer);
      setSale(emptySale);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Input Cepat</CardTitle>
          <p className="text-muted-foreground text-xs">
            Isi produk dan pelanggan jika baru. Transaksi wajib diisi. Semua tersimpan dalam satu kali submit.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={submitForm}>
            <section className="grid gap-2">
              <h2 className="font-medium">Produk (opsional)</h2>
              <div className="grid gap-2 md:grid-cols-5">
                <Input placeholder="SKU" value={product.sku} onChange={(e) => updateProduct("sku", e.target.value)} />
                <Input placeholder="Nama produk" value={product.name} onChange={(e) => updateProduct("name", e.target.value)} />
                <Input placeholder="Kategori" value={product.category} onChange={(e) => updateProduct("category", e.target.value)} />
                <Input type="number" min="0" placeholder="Harga" value={product.price} onChange={(e) => updateProduct("price", e.target.value)} />
                <Input type="number" min="0" placeholder="Biaya" value={product.cost} onChange={(e) => updateProduct("cost", e.target.value)} />
              </div>
            </section>

            <section className="grid gap-2">
              <h2 className="font-medium">Pelanggan (opsional)</h2>
              <div className="grid gap-2 md:grid-cols-4">
                <Input placeholder="Referensi" value={customer.externalRef} onChange={(e) => updateCustomer("externalRef", e.target.value)} />
                <Input placeholder="Nama pelanggan" value={customer.name} onChange={(e) => updateCustomer("name", e.target.value)} />
                <Input placeholder="Telepon" value={customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} />
                <Input type="email" placeholder="Email" value={customer.email} onChange={(e) => updateCustomer("email", e.target.value)} />
              </div>
            </section>

            <section className="grid gap-2">
              <h2 className="font-medium">Transaksi</h2>
              <div className="grid gap-2 md:grid-cols-3">
                <Input type="datetime-local" value={sale.occurredAt} onChange={(e) => setSale((s) => ({ ...s, occurredAt: e.target.value }))} required />
                <Input className="md:col-span-2" placeholder="Catatan (opsional)" value={sale.notes} onChange={(e) => setSale((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                {sale.items.map((item, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-4">
                    <Input placeholder="Deskripsi item" value={item.description} onChange={(e) => updateSaleItem(index, "description", e.target.value)} required />
                    <Input type="number" min="1" placeholder="Qty" value={item.qty} onChange={(e) => updateSaleItem(index, "qty", e.target.value)} required />
                    <Input type="number" min="0" placeholder="Harga satuan" value={item.unitPrice} onChange={(e) => updateSaleItem(index, "unitPrice", e.target.value)} required />
                    <Button type="button" variant="outline" onClick={() => removeSaleItem(index)} disabled={sale.items.length === 1}>
                      Hapus item
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addSaleItem}>
                  Tambah item
                </Button>
              </div>
            </section>

            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan Semua"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}