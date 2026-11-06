"use client";

import { ActionCard, type ActionResult, type PendingAction } from "./action-card";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: PendingAction;
};

export function MessageList({
  messages,
  onResolved,
}: {
  messages: ChatMessage[];
  onResolved: (actionId: string, status: "executed" | "cancelled", result?: ActionResult) => void;
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
