"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { apiFetch, setTenantId } from "@/lib/api";

type AuthResponse = { user: { name: string }; tenants: { id: string }[] };

const POINTS = [
  "Catat penjualan cukup dengan kalimat biasa.",
  "Lihat untung, pelanggan setia, dan stok lambat laku.",
  "Semua perubahan data menunggu persetujuan Anda.",
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", storeName: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, name: form.name, storeName: form.storeName };
      const result = await apiFetch<AuthResponse>(`/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const tenant = result.tenants[0];
      if (!tenant) throw new Error("Toko tidak ditemukan");
      setTenantId(tenant.id);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-background grid min-h-svh place-items-center p-6">
      <div className="dash-stagger grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="hidden md:block">
          <p className="warung-eyebrow">Chatbot UMKM</p>
          <h1 className="warung-title mt-2 text-4xl">Catatan toko, rapi tanpa ribet.</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Buku penjualan yang bisa diajak bicara. Cocok untuk warung, kios, dan toko kelontong.
          </p>
          <ul className="mt-6 grid gap-2 text-sm">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="bg-primary/20 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                  <Check className="size-3" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <Card className="warung-receipt">
          <CardHeader>
            <p className="warung-eyebrow">{mode === "login" ? "Selamat datang kembali" : "Buka toko baru"}</p>
            <CardTitle className="warung-title text-2xl">
              {mode === "login" ? "Masuk ke toko" : "Daftar akun"}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? "Masukkan email dan kata sandi toko Anda." : "Isi data singkat untuk mulai mencatat."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
              </div>
              {mode === "register" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nama Anda</Label>
                    <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storeName">Nama Toko</Label>
                    <Input id="storeName" required value={form.storeName} onChange={(e) => update("storeName", e.target.value)} />
                  </div>
                </>
              )}
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
              </Button>
            </form>
            <Button variant="link" className="mt-2 px-0" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
