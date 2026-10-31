"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { apiFetch } from "@/lib/api";

type PreviewItem = {
  description: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
};

type Preview = {
  occurredAt: string;
  items: PreviewItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
};

type Action = {
  id: string;
  tool: string;
  preview: Preview;
  expiresAt: string;
  status?: "proposed" | "executed" | "cancelled";
  result?: { saleId: string; total: string };
};

export function ActionCard({
  action,
  onResolved,
}: {
  action: Action;
  onResolved: (actionId: string, status: "executed" | "cancelled", result?: { saleId: string; total: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ status: string; result: { saleId: string; total: string } }>(
        `/chat/actions/${action.id}/confirm`,
        { method: "POST" },
      );
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

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">Usulan penjualan</CardTitle>
          {resolved && (
            <Badge variant={action.status === "executed" ? "default" : "secondary"}>
              {action.status === "executed" ? "Disimpan" : "Dibatalkan"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="text-muted-foreground">
          Tanggal: <span className="text-foreground">{new Date(action.preview.occurredAt).toLocaleString("id-ID")}</span>
        </div>
        <ul className="grid gap-1">
          {action.preview.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-2">
              <span>
                {item.description} × {item.qty}
              </span>
              <span className="tabular-nums">Rp{Number(item.lineTotal).toLocaleString("id-ID")}</span>
            </li>
          ))}
        </ul>
        <div className="grid gap-1 border-t pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">Rp{Number(action.preview.subtotal).toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="tabular-nums">Rp{Number(action.preview.total).toLocaleString("id-ID")}</span>
          </div>
        </div>
        {action.result && (
          <p className="text-muted-foreground text-xs">ID transaksi: {action.result.saleId}</p>
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
