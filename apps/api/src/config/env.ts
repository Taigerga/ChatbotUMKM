import "dotenv/config";

export type Env = {
  NODE_ENV: string;
  PORT: number;
  WEB_ORIGIN: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  AUTH_COOKIE_NAME: string;
  AI_PRIMARY: string;
  AI_FALLBACK?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  OPENAI_COMPAT_BASE_URL?: string;
  OPENAI_COMPAT_API_KEY?: string;
  OPENAI_COMPAT_MODEL?: string;
  OPENAI_COMPAT_MODELS?: string;
  AI_TIMEOUT_MS: number;
  ML_SERVICE_URL: string;
  ML_INTERNAL_TOKEN: string;
};

const REQUIRED = ["DATABASE_URL", "JWT_SECRET", "WEB_ORIGIN"] as const;

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const missing = REQUIRED.filter((key) => !source[key]);
  if (missing.length > 0) {
    throw new Error(`Env wajib belum diisi: ${missing.join(", ")}`);
  }
  return {
    NODE_ENV: source.NODE_ENV ?? "development",
    PORT: Number(source.PORT ?? 3001),
    WEB_ORIGIN: source.WEB_ORIGIN!,
    DATABASE_URL: source.DATABASE_URL!,
    JWT_SECRET: source.JWT_SECRET!,
    AUTH_COOKIE_NAME: source.AUTH_COOKIE_NAME ?? "token",
    AI_PRIMARY: source.AI_PRIMARY ?? "gemini",
    AI_FALLBACK: source.AI_FALLBACK,
    GEMINI_API_KEY: source.GEMINI_API_KEY,
    GEMINI_MODEL: source.GEMINI_MODEL ?? "gemini-2.5-flash",
    OPENAI_COMPAT_BASE_URL: source.OPENAI_COMPAT_BASE_URL,
    OPENAI_COMPAT_API_KEY: source.OPENAI_COMPAT_API_KEY,
    OPENAI_COMPAT_MODEL: source.OPENAI_COMPAT_MODEL,
    OPENAI_COMPAT_MODELS: source.OPENAI_COMPAT_MODELS,
    AI_TIMEOUT_MS: positiveInt(source.AI_TIMEOUT_MS, 120_000),
    ML_SERVICE_URL: source.ML_SERVICE_URL ?? "http://127.0.0.1:8001",
    ML_INTERNAL_TOKEN: source.ML_INTERNAL_TOKEN ?? "",
  };
}
