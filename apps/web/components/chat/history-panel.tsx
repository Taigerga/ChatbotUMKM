"use client";

import { formatDateTime } from "@/lib/format";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

export function HistoryPanel({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  busy,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2 border-r bg-background p-3">
      <Button size="sm" onClick={onNew} disabled={busy}>
        Percakapan baru
      </Button>
      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.length === 0 && (
          <p className="text-muted-foreground px-2 py-3 text-xs">Belum ada riwayat percakapan.</p>
        )}
        {conversations.map((conversation) => (
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
              <div className="truncate font-medium">{conversation.title}</div>
              <div className="text-muted-foreground text-xs">
                {formatDateTime(conversation.updatedAt)} · {conversation.messageCount} pesan
              </div>
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
        ))}
      </div>
    </div>
  );
}
