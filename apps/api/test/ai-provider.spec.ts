import { expect, test } from "vitest";
import { AiProviderService } from "../src/modules/ai-provider/ai-provider.service";
import { ProviderError, type AiProvider, type CompletionRequest } from "../src/modules/ai-provider/provider.interface";

const request: CompletionRequest = { system: "s", messages: [{ role: "user", content: "halo" }], tools: [] };

function provider(name: string, behavior: () => Promise<never | any>): AiProvider {
  return { name, complete: async () => behavior() };
}

test("429 pada primary memakai fallback dan menandai provider", async () => {
  const primary = provider("gemini", async () => {
    throw new ProviderError("RATE_LIMIT", "429");
  });
  const fallback = provider("openai-compatible", async () => ({ provider: "openai-compatible", text: "dari fallback", toolCalls: [] }));

  const service = new AiProviderService([primary, fallback]);
  const result = await service.complete(request);
  expect(result.text).toBe("dari fallback");
  expect(result.provider).toBe("openai-compatible");
});

test("error 400 tidak memicu fallback", async () => {
  const primary = provider("gemini", async () => {
    throw new ProviderError("BAD_REQUEST", "invalid request");
  });
  const fallback = provider("openai-compatible", async () => ({ provider: "openai-compatible", text: "tidak dipakai", toolCalls: [] }));

  const service = new AiProviderService([primary, fallback]);
  await expect(service.complete(request)).rejects.toThrow("invalid request");
});

test("timeout memakai fallback", async () => {
  const primary = provider("gemini", async () => {
    throw new ProviderError("TIMEOUT", "timeout");
  });
  const fallback = provider("openai-compatible", async () => ({ provider: "openai-compatible", text: "ok", toolCalls: [] }));
  const service = new AiProviderService([primary, fallback]);
  expect((await service.complete(request)).text).toBe("ok");
});
