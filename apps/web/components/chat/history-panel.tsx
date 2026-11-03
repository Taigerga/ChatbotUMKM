"use client";

import { Search, Pin, PinOff } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

export type ConversationSummary = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  messageCount: number;
};

export function HistoryPanel({
  conversations,
  activeId,
  query,
  onQueryChange,
  onSelect,
  onNew,
  onPin,
  onDelete,
  busy,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const pinned = conversations.filter((c) => c.pinned);
  const rest = conversations.filter((c) => !c.pinned);

  function renderList(items: ConversationSummary[]) {
    return items.map((conversation) => (
      <div
        key={conversation.id}
        className={cn(
          "group flex items-start gap-1 rounded-md border px-2 py-2 text-sm",
          activeId === conversation.id ? "bg-muted" : "hover:bg-muted/60",
        )}
      >
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => onSelect(conversation.id)}
          disabled={busy}
        >
          <div className="flex items-center gap-1.5">
            {conversation.pinned && <Pin className="size-3 text-primary" aria-hidden />}
            <div className="truncate font-medium">{conversation.title}</div>
          </div>
          <div className="text-muted-foreground text-xs">
            {formatDateTime(conversation.updatedAt)} · {conversation.messageCount} pesan
          </div>
        </button>
        <button
          type="button"
          aria-label={conversation.pinned ? "Lepas sematan" : "Sematkan"}
          className="text-muted-foreground hover:text-primary text-xs opacity-0 group-hover:opacity-100"
          onClick={() => onPin(conversation.id, !conversation.pinned)}
          disabled={busy}
        >
          {conversation.pinned ? <PinOff className="size-3.5" aria-hidden /> : <Pin className="size-3.5" aria-hidden />}
        </button>
        <button
          type="button"
          aria-label="Hapus percakapan"
          className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100"
          onClick={() => onDelete(conversation.id)}
          disabled={busy}
        >
          ✕
        </button>
      </div>
    ));
  }

  return (
    <div className="flex h-full flex-col gap-2 border-r bg-background p-3">
      <Button size="sm" onClick={onNew} disabled={busy}>
        Percakapan baru
      </Button>
      <div className="relative">
        <Search className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" aria-hidden />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Cari riwayat..."
          className="pl-7 text-xs"
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.length === 0 && (
          <p className="text-muted-foreground px-2 py-3 text-xs">Belum ada riwayat percakapan.</p>
        )}
        {pinned.length > 0 && (
          <>
            <p className="text-muted-foreground px-2 pt-1 text-[10px] uppercase tracking-wide">Disematkan</p>
            {renderList(pinned)}
          </>
        )}
        {rest.length > 0 && (
          <>
            {pinned.length > 0 && <p className="text-muted-foreground px-2 pt-2 text-[10px] uppercase tracking-wide">Terbaru</p>}
            {renderList(rest)}
          </>
        )}
      </div>
    </div>
  );
}