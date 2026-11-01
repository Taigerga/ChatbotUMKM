"use client";

import { ActionCard } from "./action-card";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    id: string;
    tool: string;
    preview: {
      occurredAt: string;
      items: { description: string; qty: number; unitPrice: string; lineTotal: string }[];
      subtotal: string;
      discount: string;
      tax: string;
      total: string;
      warnings?: string[];
    };
    expiresAt: string;
    status?: "proposed" | "executed" | "cancelled";
    result?: { saleId: string; total: string };
  };
};

export function MessageList({
  messages,
  onResolved,
}: {
  messages: ChatMessage[];
  onResolved: (actionId: string, status: "executed" | "cancelled", result?: { saleId: string; total: string }) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {message.content}
            {message.action && (
              <div className="mt-3">
                <ActionCard action={message.action} onResolved={onResolved} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
