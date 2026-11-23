"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { EmptyState } from "@/components/warung/empty-state";

type Detection = {
  id: string;
  classId: number;
  className: string;
  confidence: number;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  mappedProductId: string | null;
};

type Scan = {
  scanId: string;
  width: number;
  height: number;
  modelVersion: string;
  detections: Detection[];
};

type Product = { id: string; name: string; sku: string | null };
type Mapping = { classId: number; className: string; productId: string };

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function toPercent(value: number, total: number) {
  return total > 0 ? clampPercent((value / total) * 100) : 0;
}

function boxStyle(detection: Detection, scan: Scan): React.CSSProperties {
  return {
    left: `${toPercent(detection.xmin, scan.width)}%`,
    top: `${toPercent(detection.ymin, scan.height)}%`,
    width: `${Math.max(0, toPercent(detection.xmax, scan.width) - toPercent(detection.xmin, scan.width))}%`,
    height: `${Math.max(0, toPercent(detection.ymax, scan.height) - toPercent(detection.ymin, scan.height))}%`,
  };
}

export function CatalogAssistant() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [classCount, setClassCount] = useState<number | null>(null);
  const [savedDetectionId, setSavedDetectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ nc: number }>("/cv/classes")
      .then((result) => setClassCount(result.nc))
      .catch((err) => setError(messageOf(err, "Gagal memuat daftar kelas.")));
    apiFetch<{ items: Product[] }>("/products?limit=100")
      .then((result) => setProducts(result.items))
      .catch((err) => setError(messageOf(err, "Gagal memuat produk.")));
    apiFetch<{ items: Mapping[] }>("/cv/mappings")
      .then((result) => setMappings(result.items))
      .catch((err) => setError(messageOf(err, "Gagal memuat mapping.")));
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setScan(null);
    setSelected({});
    setSavedDetectionId(null);
    setError(null);
  }

  async function detect() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setScan(null);
    setSelected({});
    setSavedDetectionId(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await apiFetch<Scan>("/cv/scan", { method: "POST", body: form });
      setScan(result);
    } catch (err) {
      setError(messageOf(err, "Deteksi gagal."));
    } finally {
      setBusy(false);
    }
  }

  function productIdFor(detection: Detection) {
    return selected[detection.id] ?? detection.mappedProductId ?? mappings.find((mapping) => mapping.classId === detection.classId)?.productId ?? "";
  }

  async function save(detection: Detection) {
    const productId = productIdFor(detection);
    if (!productId) return;
    setBusy(true);
    setError(null);
    setSavedDetectionId(null);
    try {
      await apiFetch("/cv/mappings", {
        method: "PUT",
        body: JSON.stringify({ classId: detection.classId, className: detection.className, productId }),
      });
      setMappings((previous) => [
        ...previous.filter((mapping) => mapping.classId !== detection.classId),
        { classId: detection.classId, className: detection.className, productId },
      ]);
      setSavedDetectionId(detection.id);
    } catch (err) {
      setError(messageOf(err, "Gagal menyimpan mapping."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Input type="file" accept="image/*" capture="environment" aria-label="Foto rak" onChange={pickFile} />
          <p className="text-muted-foreground text-xs">JPEG, PNG, atau WEBP, maksimal 10 MB. Gambar hanya dipreview di browser.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={detect} disabled={!file || busy}>{busy ? "Memproses…" : "Deteksi produk"}</Button>
            <span className="text-muted-foreground text-xs">
              {classCount === null ? "Daftar kelas tidak tersedia" : `${classCount} kelas dikenal`}
            </span>
          </div>
        </div>

        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}

        {previewUrl && (
          <div
            className="relative w-full overflow-hidden rounded-[10px] border bg-muted"
            style={{ aspectRatio: scan && scan.width > 0 && scan.height > 0 ? `${scan.width} / ${scan.height}` : "4 / 3" }}
          >
            <Image src={previewUrl} alt="Pratinjau foto rak" fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-contain" />
            {scan?.detections.map((detection, index) => (
              <div
                key={detection.id}
                className="pointer-events-none absolute border-2 border-amber-500"
                style={boxStyle(detection, scan)}
                aria-label={`Kotak ${index + 1}: ${detection.className}`}
              >
                <span className="absolute -top-5 left-0 rounded bg-amber-500 px-1 text-[10px] font-semibold text-black">#{index + 1}</span>
              </div>
            ))}
          </div>
        )}

        {!scan ? (
          !previewUrl && <p className="text-muted-foreground text-sm">Pilih foto rak untuk mulai.</p>
        ) : scan.detections.length === 0 ? (
          <EmptyState icon={Package} title="Tidak ada produk terdeteksi" description="Coba foto rak yang lebih dekat dan lebih terang." />
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium">Usulan deteksi</p>
              <p className="text-muted-foreground text-xs">
                {scan.detections.length} box terdeteksi — bukan stok. Jumlah box BUKAN stok; cocokkan manual dengan produk toko.
              </p>
              <p className="text-muted-foreground text-xs">Confidence rendah tetap tampil sebagai usulan dan tidak otomatis terpetakan.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Kotak</th>
                    <th>Kelas</th>
                    <th>Confidence</th>
                    <th>Produk</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.detections.map((detection, index) => (
                    <tr key={detection.id} className="border-b">
                      <td className="py-2">#{index + 1}</td>
                      <td>{detection.className}</td>
                      <td className="warung-price">{detection.confidence.toFixed(2)}</td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="border-input bg-background h-9 rounded-[10px] border px-2 text-sm"
                            aria-label={`Produk untuk ${detection.className}`}
                            value={productIdFor(detection)}
                            onChange={(event) => {
                              setSelected((previous) => ({ ...previous, [detection.id]: event.target.value }));
                              setSavedDetectionId(null);
                            }}
                          >
                            <option value="">Pilih produk…</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ""}</option>
                            ))}
                          </select>
                          <Link href="/products" className="text-primary text-xs underline underline-offset-2">Buat produk baru</Link>
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <Button size="sm" onClick={() => save(detection)} disabled={busy || !productIdFor(detection)}>Simpan</Button>
                        {savedDetectionId === detection.id && <span className="text-chart-2 ml-2 text-xs">Tersimpan</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
