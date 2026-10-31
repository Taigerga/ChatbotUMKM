import { Logger } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";
import { GeminiProvider } from "./gemini.provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.provider.js";
import { ProviderError, RETRYABLE, type AiProvider, type CompletionRequest, type CompletionResult } from "./provider.interface.js";

export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly providers: AiProvider[];

  constructor(providers?: AiProvider[]) {
    this.providers = providers ?? buildFromEnv();
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (this.providers.length === 0) {
      throw new ProviderError("AUTH", "Belum ada provider AI yang dikonfigurasi");
    }

    let lastError: unknown;
    for (const [index, provider] of this.providers.entries()) {
      try {
        return await provider.complete(request);
      } catch (error) {
        lastError = error;
        const retryable = error instanceof ProviderError && RETRYABLE.includes(error.code);
        this.logger.warn(`provider ${provider.name} gagal (${index === 0 ? "primary" : "fallback"}): ${(error as Error).message}`);
        if (!retryable || index === this.providers.length - 1) break;
      }
    }
    throw lastError instanceof Error ? lastError : new ProviderError("UNKNOWN", "Provider AI gagal");
  }
}

function buildFromEnv(): AiProvider[] {
  const env = loadEnv();
  const list: AiProvider[] = [];
  const factories: Record<string, () => AiProvider> = {
    gemini: () => new GeminiProvider(env.GEMINI_API_KEY ?? "", env.GEMINI_MODEL),
    "openai-compatible": () =>
      new OpenAiCompatibleProvider(env.OPENAI_COMPAT_BASE_URL ?? "", env.OPENAI_COMPAT_API_KEY ?? "", env.OPENAI_COMPAT_MODEL ?? ""),
  };
  for (const name of [env.AI_PRIMARY, env.AI_FALLBACK]) {
    if (!name || list.some((p) => p.name === name)) continue;
    const factory = factories[name];
    if (factory) list.push(factory());
  }
  return list;
}
