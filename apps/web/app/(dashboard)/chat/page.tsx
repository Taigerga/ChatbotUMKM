"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ChatEmptyState } from "@/components/chat/empty-state";
import { ChatComposer } from "@/components/chat/composer";
import { MessageList, type ChatMessage } from "@/components/chat/message-list";
import { HistoryPanel, type ConversationSummary } from "@/components/chat/history-panel";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

type SendMessageResponse = {
  conversationId: string;
  reply: string;
  action?: {
    id: string;
    tool: string;
    preview: ChatMessage["action"] extends infer T ? (T extends { preview: infer P } ? P : never) : never;
    expiresAt: string;
  };
};

type ConversationDetail = {
  conversation: { id: string; title: string };
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    action?: ChatMessage["action"];
  }[];
};

type AiConfigSummary = { configured: boolean };

function lastKey(tenantId: string) {
  return `chat:last:${tenantId}`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [aiMode, setAiMode] = useState<"default" | "personal">("default");
  const [personalConfigured, setPersonalConfigured] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadConversations = useCallback(async (q?: string) => {
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (q?.trim()) params.set("q", q.trim());
      const res = await apiFetch<{ items: ConversationSummary[] }>(`/chat/conversations?${params.toString()}`);
      setConversations(res.items);
    } catch {
      setConversations([]);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await apiFetch<ConversationDetail>(`/chat/conversations/${id}`);
      setConversationId(res.conversation.id);
      setMessages(
        res.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          action: m.action,
        })),
      );
      const tenantId = typeof window === "undefined" ? null : window.localStorage.getItem("tenantId");
      if (tenantId) window.localStorage.setItem(lastKey(tenantId), id);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem("chat:aiMode");
      if (savedMode === "personal" || savedMode === "default") setAiMode(savedMode);
    } catch {
      // ignore
    }
    apiFetch<AiConfigSummary>("/ai-config")
      .then((data) => setPersonalConfigured(data.configured))
      .catch(() => setPersonalConfigured(false));

    loadConversations().then(() => {
      const tenantId = typeof window === "undefined" ? null : window.localStorage.getItem("tenantId");
      const saved = tenantId ? window.localStorage.getItem(lastKey(tenantId)) : null;
      if (saved) loadConversation(saved);
    });
  }, [loadConversations, loadConversation]);

  useEffect(() => {
    const timer = setTimeout(() => loadConversations(search), 300);
    return () => clearTimeout(timer);
  }, [search, loadConversations]);

  useEffect(() => {
    try {
      window.localStorage.setItem("chat:aiMode", aiMode);
    } catch {
      // ignore
    }
  }, [aiMode]);

  function startNew() {
    setConversationId(undefined);
    setMessages([]);
    const tenantId = typeof window === "undefined" ? null : window.localStorage.getItem("tenantId");
    if (tenantId) window.localStorage.removeItem(lastKey(tenantId));
  }

  async function handlePin(id: string, pinned: boolean) {
    try {
      await apiFetch(`/chat/conversations/${id}/pin`, { method: "PATCH", body: JSON.stringify({ pinned }) });
      await loadConversations(search);
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/chat/conversations/${deleteTargetId}`, { method: "DELETE" });
      if (deleteTargetId === conversationId) startNew();
      await loadConversations(search);
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    } catch (err) {
      // error handled by apiFetch, silently fail for now
    } finally {
      setDeleteLoading(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setBusy(true);
    try {
      const result = await apiFetch<SendMessageResponse>("/chat/messages", {
        method: "POST",
        body: JSON.stringify({ message: trimmed, conversationId, aiMode }),
      });
      setConversationId(result.conversationId);
      const tenantId = typeof window === "undefined" ? null : window.localStorage.getItem("tenantId");
      if (tenantId) window.localStorage.setItem(lastKey(tenantId), result.conversationId);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        action: result.action
          ? {
              id: result.action.id,
              tool: result.action.tool,
              preview: result.action.preview,
              expiresAt: result.action.expiresAt,
              status: "proposed",
            }
          : undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await loadConversations(search);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Terjadi kesalahan.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function resolveAction(actionId: string, status: "executed" | "cancelled", result?: { saleId: string; total: string }) {
    setMessages((prev) =>
      prev.map((message) =>
        message.action?.id === actionId
          ? { ...message, action: { ...message.action, status, result } }
          : message,
      ),
    );
  }

  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus percakapan"
        description="Percakapan ini akan dihapus permanen. Tindakan tidak bisa dibatalkan."
        onConfirm={confirmDelete}
        confirmLabel="Hapus"
        cancelLabel="Batalkan"
        loading={deleteLoading}
        variant="destructive"
      />
      <div className="flex h-[calc(100vh-57px)]">
      <div className={`${panelOpen ? "block" : "hidden"} w-72 shrink-0 md:block`}>
        <HistoryPanel
          conversations={conversations}
          activeId={conversationId}
          query={search}
          onQueryChange={setSearch}
          onSelect={(id) => {
            loadConversation(id);
            setPanelOpen(false);
          }}
          onNew={() => {
            startNew();
            setPanelOpen(false);
          }}
          onPin={handlePin}
          onDelete={handleDelete}
          busy={busy}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => setPanelOpen((value) => !value)}
          >
            {panelOpen ? "Tutup riwayat" : "Riwayat chat"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <span className="text-muted-foreground text-xs">Model:</span>
          <select
            value={aiMode}
            onChange={(e) => setAiMode(e.target.value as "default" | "personal")}
            disabled={aiMode === "personal" ? false : false}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            <option value="default">Default aplikasi</option>
            <option value="personal" disabled={!personalConfigured}>
              AI pribadi{personalConfigured ? "" : " (belum diatur)"}
            </option>
          </select>
          {!personalConfigured && (
            <Link href="/settings" className="text-primary text-xs underline">
              Atur AI pribadi
            </Link>
          )}
        </div>
        {messages.length === 0 ? (
          <ChatEmptyState onPick={send} />
        ) : (
          <MessageList messages={messages} onResolved={resolveAction} />
        )}
        <ChatComposer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} />
      </div>
    </div>
    </>
  );
}