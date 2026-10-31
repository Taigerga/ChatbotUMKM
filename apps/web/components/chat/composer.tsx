"use client";

import { useRef } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";

export function ChatComposer({
  value,
  onChange,
  onSend,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim() && !busy) onSend();
    }
  }

  return (
    <form
      className="border-t bg-background p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() && !busy) onSend();
      }}
    >
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pertanyaan atau minta saya mencatat transaksi…"
          rows={2}
          disabled={busy}
          className="min-h-[56px] resize-none"
          aria-label="Pesan"
        />
        <Button type="submit" size="icon" disabled={busy || !value.trim()} aria-label="Kirim">
          <ArrowUp className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
