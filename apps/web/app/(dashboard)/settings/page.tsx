"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun, Type, LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { usePreferences, type TextSize, type Density } from "@/components/preferences-provider";

const TEXT_SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: "sm", label: "Kecil", sample: "Aa" },
  { value: "md", label: "Sedang", sample: "Aa" },
  { value: "lg", label: "Besar", sample: "Aa" },
];

const DENSITIES: { value: Density; label: string; description: string }[] = [
  { value: "comfortable", label: "Nyaman", description: "Jarak lega, mudah dibaca." },
  { value: "compact", label: "Padat", description: "Lebih banyak data per layar." },
];

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { textSize, density, setTextSize, setDensity } = usePreferences();

  return (
    <div className="grid gap-4 p-4 dash-stagger">
      <div className="dash-enter">
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">
          Sesuaikan tampilan dashboard sesuai kebiasaanmu. Perubahan tersimpan di browser ini.
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
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/60"
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
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/60"
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
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/60"
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
          Reset ke default
        </Button>
      </div>
    </div>
  );
}