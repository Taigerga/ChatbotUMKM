import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";
import { decryptSecret, encryptSecret, maskSecret } from "../../common/crypto.util.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { GeminiProvider } from "../ai-provider/gemini.provider.js";
import { OpenAiCompatibleProvider } from "../ai-provider/openai-compatible.provider.js";
import { ProviderError, type AiProvider, type CompletionRequest } from "../ai-provider/provider.interface.js";

type ConfigInput = { provider: "gemini" | "openai-compatible"; model: string; apiKey: string; baseUrl?: string };

@Injectable()
export class AiConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private get passphrase(): string {
    const key = loadEnv().AI_CONFIG_ENCRYPTION_KEY;
    if (!key) throw new ServiceUnavailableException({ code: "AI_CONFIG_DISABLED", message: "Konfigurasi API pribadi belum diaktifkan di server" });
    return key;
  }

  async getMasked(userId: string) {
    const cfg = await this.prisma.userAiConfig.findUnique({ where: { userId } });
    if (!cfg) return { configured: false as const };
    let masked = "••••";
    try {
      masked = maskSecret(decryptSecret(cfg.apiKeyEncrypted, this.passphrase));
    } catch {
      masked = "••••";
    }
    return {
      configured: true as const,
      provider: cfg.provider,
      model: cfg.model,
      baseUrl: cfg.baseUrl ?? undefined,
      maskedKey: masked,
      updatedAt: cfg.updatedAt,
    };
  }

  async save(userId: string, input: ConfigInput) {
    this.validate(input);
    const encrypted = encryptSecret(input.apiKey, this.passphrase);
    await this.prisma.userAiConfig.upsert({
      where: { userId },
      create: { userId, provider: input.provider, model: input.model.trim(), baseUrl: input.baseUrl?.trim() || null, apiKeyEncrypted: encrypted },
      update: { provider: input.provider, model: input.model.trim(), baseUrl: input.baseUrl?.trim() || null, apiKeyEncrypted: encrypted },
    });
    return this.getMasked(userId);
  }

  async remove(userId: string) {
    await this.prisma.userAiConfig.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async test(input: ConfigInput) {
    this.validate(input);
    const provider = this.buildProvider(input);
    const request: CompletionRequest = {
      system: "Reply with the single word OK.",
      messages: [{ role: "user", content: "ping" }],
      tools: [],
    };
    try {
      const result = await provider.complete(request);
      return { ok: true, provider: result.provider, reply: result.text?.slice(0, 80) };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError("UNKNOWN", (error as Error).message);
    }
  }

  async getProviderForUser(userId: string): Promise<AiProvider | null> {
    const cfg = await this.prisma.userAiConfig.findUnique({ where: { userId } });
    if (!cfg) return null;
    try {
      return this.buildProvider({
        provider: cfg.provider as "gemini" | "openai-compatible",
        model: cfg.model,
        apiKey: decryptSecret(cfg.apiKeyEncrypted, this.passphrase),
        baseUrl: cfg.baseUrl ?? undefined,
      });
    } catch {
      return null;
    }
  }

  private validate(input: ConfigInput) {
    if (input.provider === "openai-compatible" && !input.baseUrl?.trim()) {
      throw new BadRequestException({ code: "BASE_URL_REQUIRED", message: "Base URL wajib diisi untuk provider OpenAI-compatible" });
    }
    if (input.provider === "gemini" && !input.model.trim()) {
      throw new BadRequestException({ code: "MODEL_REQUIRED", message: "Model wajib diisi" });
    }
  }

  private buildProvider(input: ConfigInput): AiProvider {
    if (input.provider === "gemini") {
      return new GeminiProvider(input.apiKey, input.model.trim());
    }
    return new OpenAiCompatibleProvider(input.baseUrl!.trim(), input.apiKey, input.model.trim(), loadEnv().AI_TIMEOUT_MS);
  }
}