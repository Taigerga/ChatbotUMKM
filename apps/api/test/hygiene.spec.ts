import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("gitignore menutup data & artefak", () => {
  const g = readFileSync("../../.gitignore", "utf8");
  for (const p of ["data/raw", "data/interim", "data/processed", "ml/artifacts", "ml/.venv", "apps/api/src/generated/", ".env"])
    expect(g).toContain(p);
});

test(".env.example api memuat variabel wajib tanpa nilai rahasia", () => {
  const e = readFileSync(".env.example", "utf8");
  for (const k of ["DATABASE_URL", "SHADOW_DATABASE_URL", "JWT_SECRET", "AI_PRIMARY", "AI_FALLBACK",
                   "GEMINI_API_KEY", "OPENAI_COMPAT_BASE_URL", "OPENAI_COMPAT_API_KEY", "WEB_ORIGIN", "PORT"])
    expect(e).toContain(`${k}=`);
});
