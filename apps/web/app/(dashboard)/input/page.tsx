"use client";

import { useState } from "react";
import { SaleEditor } from "@/components/sales/sale-editor";
import { Card, CardContent } from "@workspace/ui/components/card";
import { SectionHeader } from "@/components/warung/section-header";

export default function QuickInputPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <Card>
        <CardContent className="grid gap-3">
          <SectionHeader
            eyebrow="Catat cepat"
            title="Input cepat"
            description="Satu formulir untuk transaksi, pelanggan baru, dan produk baru. Semua tersimpan sekaligus."
          />
          {message && <p className="text-chart-2 text-sm">{message}</p>}
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
