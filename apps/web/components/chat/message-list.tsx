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
        <div key={message.id} className={`dash-enter flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-[10px] px-4 py-2 text-sm whitespace-pre-wrap ${
              message.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-card-foreground rounded-bl-sm border shadow-sm"
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
