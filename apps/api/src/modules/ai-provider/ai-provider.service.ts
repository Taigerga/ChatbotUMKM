import { Logger } from "@nestjs/common";
import { loadEnv, type Env } from "../../config/env.js";
import { GeminiProvider } from "./gemini.provider.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.provider.js";
import { ProviderError, RETRYABLE, type AiProvider, type CompletionRequest, type CompletionResult } from "./provider.interface.js";

const RATE_LIMIT_COOLDOWN_MS = 60_000;
const ERROR_COOLDOWN_MS = 15_000;

export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly providers: AiProvider[];
  private readonly cooldownUntil = new Map<string, number>();

  constructor(providers?: AiProvider[]) {
    this.providers = providers ?? buildFromEnv();
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (this.providers.length === 0) {
      throw new ProviderError("AUTH", "Belum ada provider AI yang dikonfigurasi");
    }

    const now = Date.now();
    const ready = this.providers.filter((provider) => (this.cooldownUntil.get(provider.name) ?? 0) <= now);
    const cooling = this.providers.filter((provider) => (this.cooldownUntil.get(provider.name) ?? 0) > now);
    const order = [...ready, ...cooling];

    let lastError: unknown;
    for (const [index, provider] of order.entries()) {
      const startedAt = Date.now();
      try {
        const result = await provider.complete(request);
        this.cooldownUntil.delete(provider.name);
        return result;
      } catch (error) {
        lastError = error;
        const retryable = error instanceof ProviderError && RETRYABLE.includes(error.code);
        this.logger.warn(
          `provider ${provider.name} gagal (${index + 1}/${order.length}, ${Date.now() - startedAt}ms, ${retryable ? "fallback" : "stop"}): ${(error as Error).message}`,
        );
        if (!retryable) break;
        this.cooldownUntil.set(provider.name, Date.now() + cooldownFor(error));
      }
    }

    throw friendlyError(lastError, this.cooldownUntil);
  }
}

function cooldownFor(error: ProviderError): number {
  return error.code === "RATE_LIMIT" ? RATE_LIMIT_COOLDOWN_MS : ERROR_COOLDOWN_MS;
}

function friendlyError(error: unknown, cooldownUntil: Map<string, number>): unknown {
  if (!(error instanceof ProviderError)) return error;
  if (error.code === "BAD_REQUEST" || error.code === "AUTH") return error;

  const remaining = Math.max(...[...cooldownUntil.values()].map((until) => until - Date.now()), 0);
  const seconds = Math.ceil(remaining / 1000);
  return new ProviderError(
    "RATE_LIMIT",
    seconds > 0 ? `Semua model AI sedang limit. Coba lagi ~${seconds} detik.` : "Semua model AI sedang sibuk. Coba lagi sebentar.",
  );
}

function buildFromEnv(): AiProvider[] {
  const env = loadEnv();
  const list: AiProvider[] = [];
  const push = (provider: AiProvider) => {
    if (!list.some((existing) => existing.name === provider.name)) list.push(provider);
  };
  const factories: Record<string, () => void> = {
    gemini: () => {
      if (env.GEMINI_API_KEY) push(new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL));
    },
    "openai-compatible": () => {
      if (!env.OPENAI_COMPAT_BASE_URL) return;
      for (const model of openAiModels(env)) {
        push(new OpenAiCompatibleProvider(env.OPENAI_COMPAT_BASE_URL!, env.OPENAI_COMPAT_API_KEY ?? "", model, env.AI_TIMEOUT_MS));
      }
    },
  };
  for (const name of [env.AI_PRIMARY, env.AI_FALLBACK]) {
    if (name) factories[name]?.();
  }
  return list;
}

function openAiModels(env: Env): string[] {
  const raw = env.OPENAI_COMPAT_MODELS ?? env.OPENAI_COMPAT_MODEL ?? "";
  return raw
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}
