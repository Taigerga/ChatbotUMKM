import { mapHttpError, ProviderError, type AiProvider, type CompletionRequest, type CompletionResult } from "./provider.interface.js";

const TIMEOUT_MS = 25_000;

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) throw new ProviderError("AUTH", "GEMINI_API_KEY belum diisi");

    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: request.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      ...(request.tools.length > 0
        ? { tools: [{ functionDeclarations: request.tools.map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) }] }
        : {}),
    };

    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ProviderError("TIMEOUT", "Gemini timeout");
    }

    if (!response.ok) throw new ProviderError(mapHttpError(response.status), `Gemini HTTP ${response.status}`);

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text).filter(Boolean).join("\n") || undefined;
    const toolCalls = parts
      .filter((p) => p.functionCall)
      .map((p, index) => ({
        id: `gemini-${index}`,
        name: p.functionCall!.name,
        arguments: p.functionCall!.args ?? {},
      }));

    return { provider: this.name, text, toolCalls };
  }
}
