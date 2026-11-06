"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { fromDatetimeLocal, nowLocal, toDatetimeLocal } from "@/lib/datetime";
import { EntityCombobox, type ComboOption } from "@/components/common/entity-combobox";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

export type SaleForEdit = {
  id: string;
  occurredAt: string;
  customerId: string | null;
  customerName?: string | null;
  notes: string | null;
  discount: string;
  tax: string;
  items: { productId: string | null; description: string; qty: number; unitPrice: string }[];
};

type SaleItemForm = {
  key: string;
  productId: string;
  productName: string;
  description: string;
  qty: string;
  unitPrice: string;
  creating: boolean;
  newName: string;
  newCategory: string;
};

type CustomerForm = {
  enabled: boolean;
  name: string;
  phone: string;
  email: string;
};

type FormState = {
  occurredAt: string;
  customerId: string;
  customerName: string;
  note: string;
  discount: string;
  tax: string;
  items: SaleItemForm[];
  newCustomer: CustomerForm;
};

let keyCounter = 0;
function newKey() {
  return `item-${++keyCounter}`;
}

function emptyItem(): SaleItemForm {
  return {
    key: newKey(),
    productId: "",
    productName: "",
    description: "",
    qty: "1",
    unitPrice: "",
    creating: false,
    newName: "",
    newCategory: "",
  };
}

function emptyForm(): FormState {
  return {
    occurredAt: nowLocal(),
    customerId: "",
    customerName: "",
    note: "",
    discount: "",
    tax: "",
    items: [emptyItem()],
    newCustomer: { enabled: false, name: "", phone: "", email: "" },
  };
}

function formFromSale(sale: SaleForEdit): FormState {
  return {
    occurredAt: toDatetimeLocal(sale.occurredAt),
    customerId: sale.customerId ?? "",
    customerName: sale.customerName ?? "",
    note: sale.notes ?? "",
    discount: Number(sale.discount) ? sale.discount : "",
    tax: Number(sale.tax) ? sale.tax : "",
    items: sale.items.map((item) => ({
      key: newKey(),
      productId: item.productId ?? "",
      productName: item.productId ? item.description : "",
      description: item.description,
      qty: String(item.qty),
      unitPrice: item.unitPrice,
      creating: false,
      newName: "",
      newCategory: "",
    })),
    newCustomer: { enabled: false, name: "", phone: "", email: "" },
  };
}

export function SaleEditor({
  sale,
  onSaved,
  onCancel,
}: {
  sale?: SaleForEdit | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => (sale ? formFromSale(sale) : emptyForm()));
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: string[] }>("/products/categories")
      .then((res) => setCategories(res.items))
      .catch(() => setCategories([]));
  }, []);

  const loadCustomers = useCallback(async (query: string): Promise<ComboOption[]> => {
    const res = await apiFetch<{ items: { id: string; name: string; phone: string | null }[] }>(`/customers?q=${encodeURIComponent(query)}&limit=10`);
    return res.items.map((customer) => ({ id: customer.id, label: customer.name, hint: customer.phone ?? undefined }));
  }, []);

  const loadProducts = useCallback(async (query: string): Promise<ComboOption[]> => {
    const res = await apiFetch<{ items: { id: string; name: string; sku: string | null; price: string }[] }>(`/products?q=${encodeURIComponent(query)}&limit=10`);
    return res.items.map((product) => ({ id: product.id, label: product.name, hint: `${product.sku ?? "-"} · ${formatRupiah(product.price)}`, price: product.price }));
  }, []);

  function updateItem(index: number, patch: Partial<SaleItemForm>) {
    setForm((current) => ({ ...current, items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  }

  function removeItem(index: number) {
    setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.newCustomer.enabled && !form.newCustomer.name.trim()) {
      setError("Nama pelanggan baru wajib diisi.");
      return;
    }
    for (const item of form.items) {
      if (item.creating && !item.newName.trim()) {
        setError("Nama produk baru wajib diisi.");
        return;
      }
      if (!item.productId && !item.creating && !item.description.trim()) {
        setError("Setiap item butuh produk atau deskripsi.");
        return;
      }
      if (!Number.isInteger(Number(item.qty)) || Number(item.qty) < 1) {
        setError("Qty harus bilangan bulat minimal 1.");
        return;
      }
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        setError("Harga satuan tidak valid.");
        return;
      }
    }

    const body = {
      occurredAt: fromDatetimeLocal(form.occurredAt),
      customerId: form.customerId || undefined,
      newCustomer: form.newCustomer.enabled ? { name: form.newCustomer.name, phone: form.newCustomer.phone || undefined, email: form.newCustomer.email || undefined } : undefined,
      notes: form.note || undefined,
      discount: form.discount ? Number(form.discount) : undefined,
      tax: form.tax ? Number(form.tax) : undefined,
      items: form.items.map((item) => ({
        productId: item.productId || undefined,
        newProduct: item.creating ? { name: item.newName, category: item.newCategory || undefined, price: Number(item.unitPrice) } : undefined,
        description: item.description || undefined,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
    };

    setBusy(true);
    try {
      if (sale) {
        await apiFetch(`/sales/${sale.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/sales", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan transaksi.");
    } finally {
      setBusy(false);
    }
  }

  const subtotal = form.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
  const total = subtotal - Number(form.discount || 0) + Number(form.tax || 0);

  return (
    <form className="bg-muted/40 grid gap-3 rounded-md border p-3" onSubmit={submit}>
      <div className="grid gap-2 md:grid-cols-3">
        <label className="grid gap-1 text-xs">
          Tanggal & jam (waktu lokal)
          <Input type="datetime-local" required value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs md:col-span-2">
          Pelanggan (opsional)
          <EntityCombobox
            value={form.customerId}
            initialLabel={form.customerName}
            load={loadCustomers}
            placeholder="Cari pelanggan..."
            onChange={(option) => setForm({ ...form, customerId: option?.id ?? "", customerName: option?.label ?? "", newCustomer: { ...form.newCustomer, enabled: false } })}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setForm({ ...form, newCustomer: { ...form.newCustomer, enabled: !form.newCustomer.enabled }, customerId: "", customerName: "" })}
        >
          {form.newCustomer.enabled ? "Batal pelanggan baru" : "+ Pelanggan baru"}
        </Button>
        {form.newCustomer.enabled && (
          <div className="grid flex-1 gap-2 md:grid-cols-3">
            <Input placeholder="Nama pelanggan" value={form.newCustomer.name} onChange={(event) => setForm({ ...form, newCustomer: { ...form.newCustomer, name: event.target.value } })} />
            <Input placeholder="Telepon (opsional)" value={form.newCustomer.phone} onChange={(event) => setForm({ ...form, newCustomer: { ...form.newCustomer, phone: event.target.value } })} />
            <Input type="email" placeholder="Email (opsional)" value={form.newCustomer.email} onChange={(event) => setForm({ ...form, newCustomer: { ...form.newCustomer, email: event.target.value } })} />
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <span className="text-xs font-medium">Item</span>
        {form.items.map((item, index) => (
          <div key={item.key} className="grid gap-2 rounded-md border p-2">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_90px_130px_auto]">
              <EntityCombobox
                value={item.productId}
                initialLabel={item.productName}
                load={loadProducts}
                placeholder="Pilih produk atau biarkan kosong"
                clearLabel="Tanpa produk (tulis deskripsi)"
                onChange={(option) => {
                  if (!option) {
                    updateItem(index, { productId: "", productName: "" });
                    return;
                  }
                  const nextPrice = option.price ? String(Number(option.price)) : item.unitPrice;
                  updateItem(index, {
                    productId: option.id,
                    productName: option.label,
                    description: option.label,
                    unitPrice: nextPrice,
                  });
                }}
              />
              <Input type="number" min="1" step="1" required placeholder="Qty" value={item.qty} onChange={(event) => updateItem(index, { qty: event.target.value })} />
              <Input type="number" min="0" step="0.01" required placeholder="Harga satuan" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} />
              <Button type="button" size="sm" variant="ghost" disabled={form.items.length === 1} onClick={() => removeItem(index)}>
                Hapus
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                placeholder="Deskripsi item (otomatis dari produk)"
                value={item.description}
                onChange={(event) => updateItem(index, { description: event.target.value })}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => updateItem(index, { creating: !item.creating, productId: item.creating ? item.productId : "", productName: item.creating ? item.productName : "" })}
              >
                {item.creating ? "Batal produk baru" : "+ Produk baru"}
              </Button>
            </div>
            {item.creating && (
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Nama produk baru" value={item.newName} onChange={(event) => updateItem(index, { newName: event.target.value })} />
                <Input
                  list="category-options"
                  placeholder="Kategori (bisa ketik baru)"
                  value={item.newCategory}
                  onChange={(event) => updateItem(index, { newCategory: event.target.value })}
                />
              </div>
            )}
          </div>
        ))}
        <div>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            Tambah item
          </Button>
        </div>
        <datalist id="category-options">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="grid gap-1 text-xs">
          Diskon (opsional)
          <Input type="number" min="0" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs">
          Pajak (opsional)
          <Input type="number" min="0" value={form.tax} onChange={(event) => setForm({ ...form, tax: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs">
          Catatan (opsional)
          <Input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </label>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
        <span>Subtotal {formatRupiah(subtotal)}</span>
        <span>
          Total <span className="text-foreground font-semibold">{formatRupiah(total)}</span>
        </span>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Menyimpan..." : sale ? "Simpan perubahan" : "Simpan transaksi"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
      </div>
    </form>
  );
}
