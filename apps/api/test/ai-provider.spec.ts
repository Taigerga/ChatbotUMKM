import { expect, test } from "vitest";
import { AiProviderService } from "../src/modules/ai-provider/ai-provider.service";
import { parseMessage } from "../src/modules/ai-provider/openai-compatible.provider";
import { ProviderError, mapHttpError, type AiProvider, type CompletionRequest } from "../src/modules/ai-provider/provider.interface";

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

test("403 quota 9router dianggap rate limit, bukan auth", () => {
  expect(mapHttpError(403)).toBe("RATE_LIMIT");
  expect(mapHttpError(402)).toBe("RATE_LIMIT");
  expect(mapHttpError(401)).toBe("AUTH");
  expect(mapHttpError(404)).toBe("SERVER_ERROR");
  expect(mapHttpError(400)).toBe("BAD_REQUEST");
});

test("model tidak dikenal (404) memakai model berikutnya", async () => {
  const primary = provider("openai-compatible:model-palsu", async () => {
    throw new ProviderError(mapHttpError(404), "Provider HTTP 404");
  });
  const fallback = provider("openai-compatible:kerja1", async () => ({
    provider: "openai-compatible:kerja1",
    text: "dari kerja1",
    toolCalls: [],
  }));

  const service = new AiProviderService([primary, fallback]);
  expect((await service.complete(request)).text).toBe("dari kerja1");
});

test("403 quota memakai model berikutnya", async () => {
  const primary = provider("openai-compatible:kerja1", async () => {
    throw new ProviderError(mapHttpError(403), "Provider HTTP 403 (kerja1)");
  });
  const fallback = provider("openai-compatible:gc/gemini-2.5-flash", async () => ({
    provider: "openai-compatible:gc/gemini-2.5-flash",
    text: "dari model kedua",
    toolCalls: [],
  }));

  const service = new AiProviderService([primary, fallback]);
  expect((await service.complete(request)).text).toBe("dari model kedua");
});

test("semua model gagal memberi pesan ramah, bukan error mentah", async () => {
  const failing = () => {
    throw new ProviderError("RATE_LIMIT", "Provider HTTP 429 (kerja1)");
  };
  const service = new AiProviderService([provider("a", failing), provider("b", failing)]);

  await expect(service.complete(request)).rejects.toThrow("Semua model AI sedang limit");
});

test("model yang kena limit di-skip pada percobaan berikutnya", async () => {
  let primaryCalls = 0;
  const primary = provider("openai-compatible:kerja1", async () => {
    primaryCalls++;
    throw new ProviderError("RATE_LIMIT", "429");
  });
  const fallback = provider("openai-compatible:gc/gemini-2.5-flash", async () => ({
    provider: "openai-compatible:gc/gemini-2.5-flash",
    text: "ok",
    toolCalls: [],
  }));

  const service = new AiProviderService([primary, fallback]);
  await service.complete(request);
  await service.complete(request);
  expect(primaryCalls).toBe(1);
});

test("respons SSE (Kiro) tetap terbaca walau stream tidak diminta", () => {
  const sse = [
    'data: {"choices":[{"delta":{"role":"assistant","content":"ha"}}]}',
    'data: {"choices":[{"delta":{"content":"lo"}}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"buat_produk","arguments":"{\\"sku\\":"}}]}}]}',
    'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"A1\\"}"}}]}}]}',
    "data: [DONE]",
  ].join("\n");

  const message = parseMessage(sse, "text/event-stream");
  expect(message.content).toBe("halo");
  expect(message.tool_calls?.[0]).toEqual({ id: "call_1", function: { name: "buat_produk", arguments: '{"sku":"A1"}' } });
});

test("200 dengan body bukan JSON jadi error retryable, bukan crash", () => {
  expect(() => parseMessage("<html>oops</html>", "application/json")).toThrow();
});
