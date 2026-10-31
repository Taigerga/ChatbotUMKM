import { mapHttpError, ProviderError, type AiProvider, type CompletionRequest, type CompletionResult } from "./provider.interface.js";

const TIMEOUT_MS = 25_000;

export class OpenAiCompatibleProvider implements AiProvider {
  readonly name = "openai-compatible";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

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
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ProviderError("TIMEOUT", "Provider timeout");
    }

    if (!response.ok) throw new ProviderError(mapHttpError(response.status), `Provider HTTP ${response.status}`);

    const data = (await response.json()) as {
      choices?: {
        message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] };
      }[];
    };
    const message = data.choices?.[0]?.message;
    const toolCalls = (message?.tool_calls ?? []).map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: safeParse(call.function.arguments),
    }));

    return { provider: this.name, text: message?.content || undefined, toolCalls };
  }
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
