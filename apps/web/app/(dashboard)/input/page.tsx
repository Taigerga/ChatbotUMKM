"use client";

import { useState } from "react";
import { SaleEditor } from "@/components/sales/sale-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function QuickInputPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <Card>
        <CardHeader>
          <CardTitle>Input Cepat</CardTitle>
          <p className="text-muted-foreground text-xs">
            Satu formulir untuk transaksi, pelanggan baru, dan produk baru. Semua tersimpan sekaligus.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {message && <p className="text-sm text-green-600">{message}</p>}
          <SaleEditor
            key={editorKey}
            onSaved={() => {
              setMessage("Transaksi tersimpan.");
              setEditorKey((value) => value + 1);
            }}
            onCancel={() => {
              setMessage(null);
              setEditorKey((value) => value + 1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
