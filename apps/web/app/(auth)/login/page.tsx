"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { apiFetch, setTenantId } from "@/lib/api";

type AuthResponse = { user: { name: string }; tenants: { id: string }[] };

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
    <main className="bg-muted/30 flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Chatbot Analitik UMKM</CardTitle>
          <CardDescription>
            {mode === "login" ? "Masuk untuk membuka chatbot toko." : "Buat akun dan toko baru."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
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
    </main>
  );
}
