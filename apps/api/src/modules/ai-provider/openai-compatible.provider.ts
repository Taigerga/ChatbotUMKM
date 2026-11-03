import { mapHttpError, ProviderError, type AiProvider, type CompletionRequest, type CompletionResult } from "./provider.interface.js";

const DEFAULT_TIMEOUT_MS = 120_000;

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    this.name = `openai-compatible:${model}`;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.baseUrl || !this.model) throw new ProviderError("AUTH", "OPENAI_COMPAT_BASE_URL / OPENAI_COMPAT_MODEL belum diisi");

    const body = {
      model: this.model,
      messages: [{ role: "system", content: request.system }, ...request.messages],
      ...(request.tools.length > 0
        ? {
            tools: request.tools.map((tool) => ({
              type: "function",
              function: { name: tool.name, description: tool.description, parameters: tool.parameters },
            })),
          }
        : {}),
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new ProviderError("TIMEOUT", `Provider timeout ${this.timeoutMs}ms (${this.model})`);
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      throw new ProviderError(mapHttpError(response.status), `Provider HTTP ${response.status} (${this.model}): ${detail}`);
    }

    const rawBody = await response.text();
    let message: Message;
    try {
      message = parseMessage(rawBody, response.headers.get("content-type") ?? "");
    } catch (error) {
      throw new ProviderError("SERVER_ERROR", `Respons provider tidak valid (${this.model}): ${(error as Error).message}`);
    }
    const toolCalls = (message.tool_calls ?? []).map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: safeParse(call.function.arguments),
    }));

    return { provider: this.name, text: message.content || undefined, toolCalls };
  }
}

type Message = {
  content?: string;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
};

// 9router/Kiro kadang balas SSE walau stream tidak diminta → parse dua-duanya.
export function parseMessage(raw: string, contentType: string): Message {
  if (!contentType.includes("text/event-stream") && !raw.trimStart().startsWith("data:")) {
    const data = JSON.parse(raw) as { choices?: { message?: Message }[] };
    return data.choices?.[0]?.message ?? {};
  }

  const chunks: string[] = [];
  const calls = new Map<number, { id: string; name: string; arguments: string }>();
  for (const line of raw.split(/\r?\n/)) {
    const payload = line.trim();
    if (!payload.startsWith("data:")) continue;
    const json = payload.slice(5).trim();
    if (!json || json === "[DONE]") continue;
    let chunk: { choices?: { delta?: Delta; message?: Message }[] };
    try {
      chunk = JSON.parse(json);
    } catch {
      continue;
    }
    const delta = chunk.choices?.[0]?.delta ?? chunk.choices?.[0]?.message;
    if (typeof delta?.content === "string") chunks.push(delta.content);
    for (const [index, call] of ((delta as Delta | undefined)?.tool_calls ?? []).entries()) {
      const key = call.index ?? index;
      const current = calls.get(key) ?? { id: "", name: "", arguments: "" };
      calls.set(key, {
        id: call.id ?? current.id,
        name: call.function?.name ?? current.name,
        arguments: current.arguments + (call.function?.arguments ?? ""),
      });
    }
  }

  return {
    content: chunks.join(""),
    tool_calls: [...calls.values()].map((call) => ({ id: call.id, function: { name: call.name, arguments: call.arguments } })),
  };
}

type Delta = {
  content?: string;
  tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
};

function safeParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
