"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

type PreviewRow = { row: number; data: any; errors: { field: string; message: string }[] };

export default function ImportsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [entity, setEntity] = useState("products");
  const [preview, setPreview] = useState<{ total: number; valid: number; invalid: number; rows: PreviewRow[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePreview() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("entity", entity);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"}/imports/preview`, {
      method: "POST",
      credentials: "include",
      headers: { "x-tenant-id": localStorage.getItem("tenantId") ?? "" },
      body: form,
    });
    const data = await res.json();
    setPreview(data);
    setMessage(null);
  }

  async function handleCommit() {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.errors.length === 0).map((r) => r.data);
    const res = await apiFetch<{ inserted: number; skipped: number }>("/imports/commit", {
      method: "POST",
      body: JSON.stringify({ entity, rows: validRows }),
    });
    setMessage(`Berhasil: ${res.inserted} ditambahkan, ${res.skipped} dilewati.`);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="grid gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Impor CSV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2">
            <select className="rounded border px-2 py-1" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="products">Produk</option>
              <option value="customers">Pelanggan</option>
            </select>
            <Input type="file" accept=".csv" ref={fileRef} />
            <Button onClick={handlePreview}>Preview</Button>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {preview && (
            <>
              <p className="text-sm">
                Total {preview.total}, valid {preview.valid}, tidak valid {preview.invalid}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left">
                      <th className="py-2">Baris</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.row} className="border-b">
                        <td className="py-2">{r.row}</td>
                        <td>{r.errors.length === 0 ? "Valid" : r.errors.map((e) => e.message).join("; ")}</td>
                        <td className="font-mono text-xs">{JSON.stringify(r.data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={handleCommit} disabled={preview.valid === 0}>
                Import {preview.valid} baris valid
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
