"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatEmptyState } from "@/components/chat/empty-state";
import { ChatComposer } from "@/components/chat/composer";
import { MessageList, type ChatMessage } from "@/components/chat/message-list";

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

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

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
    <div className="flex h-[calc(100vh-57px)] flex-col">
      {messages.length === 0 ? (
        <ChatEmptyState onPick={send} />
      ) : (
        <MessageList messages={messages} onResolved={resolveAction} />
      )}
      <ChatComposer value={input} onChange={setInput} onSend={() => send(input)} busy={busy} />
    </div>
  );
}
