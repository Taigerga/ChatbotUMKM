"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatEmptyState } from "@/components/chat/empty-state";
import { ChatComposer } from "@/components/chat/composer";
import { MessageList, type ChatMessage } from "@/components/chat/message-list";
import { HistoryPanel, type ConversationSummary } from "@/components/chat/history-panel";

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

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: ConversationSummary[] }>("/chat/conversations?limit=40");
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
    loadConversations().then(() => {
      const tenantId = typeof window === "undefined" ? null : window.localStorage.getItem("tenantId");
      const saved = tenantId ? window.localStorage.getItem(lastKey(tenantId)) : null;
      if (saved) loadConversation(saved);
    });
  }, [loadConversations, loadConversation]);

  function startNew() {
    setConversationId(undefined);
    setMessages([]);
    const tenantId = typeof window === "undefined" ? null : window.localStorage.getItem("tenantId");
    if (tenantId) window.localStorage.removeItem(lastKey(tenantId));
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
        body: JSON.stringify({ message: trimmed, conversationId }),
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
      await loadConversations();
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

  async function handleDelete(id: string) {
    if (!confirm("Hapus percakapan ini?")) return;
    try {
      await apiFetch(`/chat/conversations/${id}`, { method: "DELETE" });
      if (id === conversationId) startNew();
      await loadConversations();
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      <div className={`${panelOpen ? "block" : "hidden"} w-72 shrink-0 md:block`}>
        <HistoryPanel
          conversations={conversations}
          activeId={conversationId}
          onSelect={(id) => {
            loadConversation(id);
            setPanelOpen(false);
          }}
          onNew={() => {
            startNew();
            setPanelOpen(false);
          }}
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
          <span className="text-muted-foreground text-xs">Panel chat</span>
        </div>
        {messages.length === 0 ? (
          <ChatEmptyState onPick={send} />
        ) : (
          <MessageList messages={messages} onResolved={resolveAction} />
        )}
        <ChatComposer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} />
      </div>
    </div>
  );
}
