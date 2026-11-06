"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRupiah } from "@/lib/format";

export type ActionPreview = {
  occurredAt?: string;
  customerName?: string | null;
  items?: { productName?: string | null; description: string; qty: number; unitPrice: string; lineTotal: string }[];
  subtotal?: string;
  discount?: string;
  tax?: string;
  total?: string;
  warnings?: string[];
  warning?: string;
  sku?: string | null;
  name?: string;
  category?: string | null;
  price?: string;
  cost?: string | null;
  externalRef?: string | null;
  phone?: string | null;
  email?: string | null;
  before?: { sku?: string | null; name?: string; price?: string; externalRef?: string | null };
  after?: { sku?: string | null; name?: string; price?: string; externalRef?: string | null };
  beforeTotal?: string;
  saleId?: string;
  productId?: string;
  customerId?: string;
};

export type ActionResult = {
  saleId?: string;
  saleCode?: string;
  productId?: string;
  customerId?: string;
  total?: string;
};

export type PendingAction = {
  id: string;
  tool: string;
  preview: ActionPreview;
  expiresAt: string;
  status?: "proposed" | "executed" | "cancelled";
  result?: ActionResult;
};

const TITLES: Record<string, string> = {
  createSale: "Usulan penjualan",
  updateSale: "Usulan perubahan penjualan",
  deleteSale: "Usulan pembatalan penjualan",
  createProduct: "Usulan produk baru",
  updateProduct: "Usulan perubahan produk",
  deleteProduct: "Usulan hapus produk",
  createCustomer: "Usulan pelanggan baru",
  updateCustomer: "Usulan perubahan pelanggan",
  deleteCustomer: "Usulan hapus pelanggan",
};

export function ActionCard({
  action,
  onResolved,
}: {
  action: PendingAction;
  onResolved: (actionId: string, status: "executed" | "cancelled", result?: ActionResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ status: string; result: ActionResult }>(`/chat/actions/${action.id}/confirm`, { method: "POST" });
      onResolved(action.id, "executed", result.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/chat/actions/${action.id}/cancel`, { method: "POST" });
      onResolved(action.id, "cancelled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan");
    } finally {
      setBusy(false);
    }
  }

  const resolved = action.status && action.status !== "proposed";
  const preview = action.preview;
  const isSale = action.tool === "createSale" || action.tool === "updateSale" || action.tool === "deleteSale";
  const isProduct = action.tool.includes("Product");
  const isCustomer = action.tool.includes("Customer");

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">{TITLES[action.tool] ?? "Usulan aksi"}</CardTitle>
          {resolved && (
            <Badge variant={action.status === "executed" ? "default" : "secondary"}>
              {action.status === "executed" ? "Disimpan" : "Dibatalkan"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {isSale && (
          <>
            {preview.occurredAt && (
              <div className="text-muted-foreground">
                Tanggal: <span className="text-foreground">{formatDateTime(preview.occurredAt)}</span>
              </div>
            )}
            {preview.customerName && (
              <div className="text-muted-foreground">
                Pelanggan: <span className="text-foreground">{preview.customerName}</span>
              </div>
            )}
            {preview.items && preview.items.length > 0 && (
              <ul className="grid gap-1">
                {preview.items.map((item, index) => (
                  <li key={index} className="flex justify-between gap-2">
                    <span>
                      {item.productName ?? item.description} × {item.qty}
                    </span>
                    <span className="tabular-nums">{formatRupiah(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            )}
            {(preview.subtotal || preview.total) && (
              <div className="grid gap-1 border-t pt-2">
                {preview.beforeTotal && (
                  <div className="text-muted-foreground flex justify-between">
                    <span>Total sebelumnya</span>
                    <span className="tabular-nums">{formatRupiah(preview.beforeTotal)}</span>
                  </div>
                )}
                {preview.subtotal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatRupiah(preview.subtotal)}</span>
                  </div>
                )}
                {preview.total && (
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatRupiah(preview.total)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {isProduct && (
          <div className="grid gap-1">
            {preview.after ? (
              <>
                <div className="text-muted-foreground">
                  Sebelum: <span className="text-foreground">{preview.before?.name ?? "-"}</span>
                </div>
                <div className="text-muted-foreground">
                  Sesudah: <span className="text-foreground">{preview.after.name ?? "-"}</span>
                  {preview.after.price ? ` · ${formatRupiah(preview.after.price)}` : ""}
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">{preview.name}</div>
                <div className="text-muted-foreground">
                  SKU {preview.sku ?? "otomatis"} · Kategori {preview.category ?? "-"} · {formatRupiah(preview.price ?? 0)}
                </div>
              </>
            )}
          </div>
        )}

        {isCustomer && (
          <div className="grid gap-1">
            {preview.after ? (
              <>
                <div className="text-muted-foreground">
                  Sebelum: <span className="text-foreground">{preview.before?.name ?? "-"}</span>
                </div>
                <div className="text-muted-foreground">
                  Sesudah: <span className="text-foreground">{preview.after.name ?? "-"}</span>
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">{preview.name}</div>
                <div className="text-muted-foreground">
                  Referensi {preview.externalRef ?? "otomatis"} · Telepon {preview.phone ?? "-"} · Email {preview.email ?? "-"}
                </div>
              </>
            )}
          </div>
        )}

        {preview.warnings && preview.warnings.length > 0 && (
          <ul className="text-amber-600 list-disc pl-4 text-xs">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        {preview.warning && <p className="text-amber-600 text-xs">{preview.warning}</p>}

        {action.result && (action.result.saleId || action.result.productId || action.result.customerId) && (
          <p className="text-muted-foreground text-xs">
            {action.result.saleId && <>Transaksi {action.result.saleCode ?? action.result.saleId}</>}
            {action.result.productId && <>Produk {action.result.productId}</>}
            {action.result.customerId && <>Pelanggan {action.result.customerId}</>}
          </p>
        )}

        {error && <p className="text-destructive text-xs">{error}</p>}
        {!resolved && (
          <div className="flex gap-2">
            <Button size="sm" onClick={confirm} disabled={busy}>
              <Check className="size-4" aria-hidden />
              {busy ? "Menyimpan…" : "Setujui"}
            </Button>
            <Button size="sm" variant="outline" onClick={cancel} disabled={busy}>
              <X className="size-4" aria-hidden />
              Batalkan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
