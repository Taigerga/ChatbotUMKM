"use client";

import { Bot, MessageSquareText } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

const SUGGESTIONS = [
  "Catat penjualan 27 Oktober 2026 sebesar Rp1.250.000 dari 18 item",
  "Berapa total penjualan bulan ini?",
  "Cari produk kopi",
];

export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <Bot className="size-6" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Halo, saya asisten toko Anda</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tanyakan analitik penjualan atau minta saya mencatat transaksi. Saya tidak akan menyimpan data sebelum Anda setujui.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Button key={s} variant="outline" size="sm" onClick={() => onPick(s)}>
            <MessageSquareText className="size-4" aria-hidden />
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
