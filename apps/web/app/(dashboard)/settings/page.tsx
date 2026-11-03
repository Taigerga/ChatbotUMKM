"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, KeyRound, Loader2, Monitor, Moon, Sun, Type, LayoutGrid, RotateCcw, Trash2, Wifi } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { usePreferences, type TextSize, type Density } from "@/components/preferences-provider";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

const TEXT_SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: "sm", label: "Kecil", sample: "Aa" },
  { value: "md", label: "Sedang", sample: "Aa" },
  { value: "lg", label: "Besar", sample: "Aa" },
];

const DENSITIES: { value: Density; label: string; description: string }[] = [
  { value: "comfortable", label: "Nyaman", description: "Jarak lega, mudah dibaca." },
  { value: "compact", label: "Padat", description: "Lebih banyak data per layar." },
];

type AiProvider = "gemini" | "openai-compatible";
type AiConfig = {
  configured: boolean;
  provider?: AiProvider;
  model?: string;
  baseUrl?: string;
  maskedKey?: string;
  updatedAt?: string;
};

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { textSize, density, setTextSize, setDensity } = usePreferences();

  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [provider, setProvider] = useState<AiProvider>("openai-compatible");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadAiConfig() {
    try {
      const data = await apiFetch<AiConfig>("/ai-config");
      setAiConfig(data);
      if (data.configured) {
        setProvider(data.provider ?? "openai-compatible");
        setModel(data.model ?? "");
        setBaseUrl(data.baseUrl ?? "");
      }
    } catch {
      setAiConfig({ configured: false });
    }
  }

  useEffect(() => {
    loadAiConfig();
  }, []);

  async function saveAiConfig() {
    setAiBusy(true);
    setAiError(null);
    setAiMessage(null);
    try {
      await apiFetch("/ai-config", {
        method: "PUT",
        body: JSON.stringify({ provider, model, apiKey, baseUrl: baseUrl || undefined }),
      });
      setApiKey("");
      setAiMessage("Konfigurasi AI tersimpan.");
      await loadAiConfig();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal menyimpan konfigurasi AI.");
    } finally {
      setAiBusy(false);
    }
  }

  async function testAiConfig() {
    setAiBusy(true);
    setAiError(null);
    setAiMessage(null);
    try {
      const res = await apiFetch<{ ok: boolean; provider: string; reply?: string }>("/ai-config/test", {
        method: "POST",
        body: JSON.stringify({ provider, model, apiKey, baseUrl: baseUrl || undefined }),
      });
      setAiMessage(`Koneksi berhasil (${res.provider}).`);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Koneksi gagal.");
    } finally {
      setAiBusy(false);
    }
  }

  async function removeAiConfig() {
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    setDeleteLoading(true);
    setAiError(null);
    setAiMessage(null);
    try {
      await apiFetch("/ai-config", { method: "DELETE" });
      setModel("");
      setBaseUrl("");
      setApiKey("");
      setAiMessage("Konfigurasi AI dihapus.");
      await loadAiConfig();
      setDeleteDialogOpen(false);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal menghapus konfigurasi.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const canSave = model.trim().length > 0 && (apiKey.trim().length >= 8 || aiConfig?.configured);
  const canTest = model.trim().length > 0 && apiKey.trim().length >= 8;

  return (
    <>
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus konfigurasi AI pribadi"
        description="Konfigurasi AI pribadi Anda akan dihapus. Chatbot kembali menggunakan AI aplikasi default."
        onConfirm={confirmDelete}
        confirmLabel="Hapus"
        cancelLabel="Batalkan"
        loading={deleteLoading}
        variant="destructive"
      />
      <div className="grid gap-4 p-4 dash-stagger">
      <div className="dash-enter">
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">
          Sesuaikan tampilan dashboard dan kelola AI pribadi. Perubahan tampilan tersimpan di browser ini.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="size-4 text-primary" aria-hidden />
              Tema
            </CardTitle>
            <CardDescription>Pilih terang, gelap, atau ikuti sistem.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {[
              { value: "light", label: "Terang", icon: Sun },
              { value: "dark", label: "Gelap", icon: Moon },
              { value: "system", label: "Sistem", icon: Monitor },
            ].map((option) => {
              const Icon = option.icon;
              const active = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:bg-muted/60"
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                  {option.label}
                  {active && <Check className="size-3.5" aria-hidden />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="size-4 text-primary" aria-hidden />
              Ukuran teks
            </CardTitle>
            <CardDescription>Sesuaikan agar nyaman dibaca.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {TEXT_SIZES.map((option) => {
              const active = textSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTextSize(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:bg-muted/60"
                  }`}
                >
                  <span className={`font-semibold ${option.value === "sm" ? "text-sm" : option.value === "lg" ? "text-xl" : "text-base"}`}>
                    {option.sample}
                  </span>
                  <span className="text-xs">{option.label}</span>
                  {active && <Check className="size-3.5" aria-hidden />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-primary" aria-hidden />
              Kepadatan
            </CardTitle>
            <CardDescription>Pilih jarak antar elemen.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {DENSITIES.map((option) => {
              const active = density === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDensity(option.value)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:bg-muted/60"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {active && <Check className="size-4" aria-hidden />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pintasan keyboard</CardTitle>
            <CardDescription>Percepat pekerjaan harian.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span>Ganti tema terang/gelap</span>
              <kbd className="rounded-md border bg-muted px-2 py-0.5 text-xs">D</kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span>Tema saat ini</span>
              <span className="text-muted-foreground text-xs">{resolvedTheme ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden />
            AI Pribadi (Bring Your Own API Key)
          </CardTitle>
          <CardDescription>
            Gunakan provider AI milikmu sendiri. API Key disimpan terenkripsi dan tidak pernah ditampilkan utuh.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {aiConfig?.configured && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">Tersimpan:</span>
              <span>{aiConfig.provider}</span>
              <span className="text-muted-foreground">·</span>
              <span>{aiConfig.model}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-mono text-xs">{aiConfig.maskedKey}</span>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="ai-provider">Provider</Label>
            <select
              id="ai-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProvider)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="openai-compatible">OpenAI-compatible (OpenAI, Groq, 9router, dll)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-model">Model</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"}
            />
          </div>

          {provider === "openai-compatible" && (
            <div className="grid gap-2">
              <Label htmlFor="ai-baseurl">Base URL</Label>
              <Input
                id="ai-baseurl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="ai-key">API Key</Label>
            <Input
              id="ai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={aiConfig?.configured ? "Biarkan kosong untuk mempertahankan key lama" : "sk-..."}
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Key tidak akan ditampilkan kembali setelah disimpan. Untuk mengganti, masukkan key baru.
            </p>
          </div>

          {aiError && <p className="text-destructive text-sm">{aiError}</p>}
          {aiMessage && <p className="text-sm text-emerald-600">{aiMessage}</p>}

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveAiConfig} disabled={aiBusy || !canSave}>
              {aiBusy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Simpan
            </Button>
            <Button variant="outline" onClick={testAiConfig} disabled={aiBusy || !canTest}>
              <Wifi className="size-4" aria-hidden />
              Uji koneksi
            </Button>
            {aiConfig?.configured && (
              <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={removeAiConfig} disabled={aiBusy}>
                <Trash2 className="size-4" aria-hidden />
                Hapus
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTextSize("md");
            setDensity("comfortable");
            setTheme("system");
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset tampilan ke default
        </Button>
      </div>
      </div>
    </>
  );
}