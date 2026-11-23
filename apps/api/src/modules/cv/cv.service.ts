import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";
import type { CvDetection, CvScan } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CvMappingDto } from "./dto/cv-mapping.dto.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type UploadedImage = { buffer: Buffer; mimetype: string; originalname: string };
type RawDetection = {
  class_id: number;
  class_name: string;
  confidence: number;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
};
type RawScan = { width: number; height: number; model_version: string; detections: RawDetection[] };
type ClassPayload = { nc: number; names: string[] };
type ScanRow = CvScan & { detections: CvDetection[] };

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNonNegativeInt = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const intOrDefault = (value: unknown, fallback: number): number => (isNonNegativeInt(value) ? value : fallback);
const isClassPayload = (value: unknown): value is ClassPayload =>
  Boolean(value && typeof value === "object" && isNumber((value as ClassPayload).nc) && Array.isArray((value as ClassPayload).names) && (value as ClassPayload).names.every((name) => typeof name === "string"));

function isRawScan(value: unknown): value is RawScan {
  if (!value || typeof value !== "object") return false;
  const scan = value as Record<string, unknown>;
  if (!isNumber(scan.width) || !isNumber(scan.height) || typeof scan.model_version !== "string" || !Array.isArray(scan.detections)) return false;
  return scan.detections.every((detection: unknown) => {
    if (!detection || typeof detection !== "object") return false;
    const d = detection as Record<string, unknown>;
    return isNumber(d.class_id) && typeof d.class_name === "string" && ["confidence", "xmin", "ymin", "xmax", "ymax"].every((key) => isNumber(d[key]));
  });
}

@Injectable()
export class CvService {
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  classes() {
    return this.callCv("/classes", isClassPayload);
  }

  async scan(tenantId: string, userId: string, file: UploadedImage) {
    if (!file || !ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException({ code: "INVALID_IMAGE", message: "Format gambar harus JPEG, PNG, atau WEBP" });
    }

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    const payload = await this.callCv("/scan", isRawScan, { method: "POST", body: form });

    const mappings = await this.prisma.cvProductMapping.findMany({ where: { tenantId }, select: { classId: true, productId: true } });
    const mapped = new Map(mappings.map((m) => [m.classId, m.productId]));
    const scan = await this.prisma.cvScan.create({
      data: {
        tenantId,
        createdBy: userId,
        fileName: file.originalname.slice(0, 191),
        width: payload.width,
        height: payload.height,
        modelVersion: payload.model_version,
        detections: {
          create: payload.detections.map((d) => ({
            tenantId,
            classId: d.class_id,
            className: d.class_name,
            confidence: d.confidence,
            xmin: d.xmin,
            ymin: d.ymin,
            xmax: d.xmax,
            ymax: d.ymax,
            mappedProductId: mapped.get(d.class_id) ?? null,
          })),
        },
      },
      include: { detections: true },
    });
    return toScanResponse(scan);
  }

  async listScans(tenantId: string, limit?: number, offset?: number) {
    const take = Math.min(Math.max(intOrDefault(limit, 20), 1), 100);
    const skip = intOrDefault(offset, 0);
    const [rows, total] = await Promise.all([
      this.prisma.cvScan.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take, skip, include: { detections: true } }),
      this.prisma.cvScan.count({ where: { tenantId } }),
    ]);
    return { items: rows.map(toScanResponse), total, limit: take, offset: skip };
  }

  async getScan(tenantId: string, id: string) {
    const scan = await this.prisma.cvScan.findFirst({ where: { id, tenantId }, include: { detections: true } });
    if (!scan) throw new NotFoundException({ code: "SCAN_NOT_FOUND", message: "Hasil pemindaian tidak ditemukan" });
    return toScanResponse(scan);
  }

  async listMappings(tenantId: string) {
    const items = await this.prisma.cvProductMapping.findMany({ where: { tenantId }, orderBy: { classId: "asc" } });
    return { items };
  }

  async upsertMapping(tenantId: string, dto: CvMappingDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId }, select: { id: true } });
    if (!product) throw new BadRequestException({ code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan di toko ini" });
    return this.prisma.cvProductMapping.upsert({
      where: { tenantId_classId: { tenantId, classId: dto.classId } },
      create: { tenantId, classId: dto.classId, className: dto.className, productId: dto.productId },
      update: { className: dto.className, productId: dto.productId },
    });
  }

  async deleteMapping(tenantId: string, classId: number) {
    if (!isNonNegativeInt(classId)) {
      throw new BadRequestException({ code: "INVALID_CLASS_ID", message: "classId harus bilangan bulat non-negatif" });
    }
    await this.prisma.cvProductMapping.deleteMany({ where: { tenantId, classId } });
    return { ok: true as const };
  }

  private async callCv<T>(path: string, guard: (value: unknown) => value is T, init: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.env.CV_SERVICE_URL}${path}`, {
        ...init,
        headers: { "x-cv-token": this.env.CV_INTERNAL_TOKEN },
        signal: AbortSignal.timeout(this.env.CV_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`CV service error ${response.status}`);
      const payload: unknown = await response.json();
      if (!guard(payload)) throw new Error("Malformed CV service payload");
      return payload;
    } catch {
      throw new ServiceUnavailableException({ code: "CV_UNAVAILABLE", message: "Layanan CV tidak tersedia" });
    }
  }
}

function toScanResponse(scan: ScanRow) {
  return {
    id: scan.id,
    scanId: scan.id,
    fileName: scan.fileName,
    width: scan.width,
    height: scan.height,
    modelVersion: scan.modelVersion,
    createdAt: scan.createdAt,
    detections: scan.detections.map((d) => ({
      id: d.id,
      classId: d.classId,
      className: d.className,
      confidence: d.confidence,
      xmin: d.xmin,
      ymin: d.ymin,
      xmax: d.xmax,
      ymax: d.ymax,
      mappedProductId: d.mappedProductId,
    })),
  };
}
