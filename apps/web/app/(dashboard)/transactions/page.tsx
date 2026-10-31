"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

type Sale = { id: string; occurredAt: string; total: string; items: { description: string; qty: number }[] };

export default function TransactionsPage() {
  const [items, setItems] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    const res = await apiFetch<{ sales: Sale[]; total: number }>("/sales?limit=50");
    setItems(res.sales);
    setTotal(res.total);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    await apiFetch(`/sales/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Transaksi ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2">Tanggal</th>
                  <th>Item</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2">{new Date(s.occurredAt).toLocaleString("id-ID")}</td>
                    <td>{s.items.map((i) => `${i.description}×${i.qty}`).join(", ")}</td>
                    <td>Rp{Number(s.total).toLocaleString("id-ID")}</td>
                    <td className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>
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
