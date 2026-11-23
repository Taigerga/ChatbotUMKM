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
type ScanRow = CvScan & { detections: CvDetection[] };

@Injectable()
export class CvService {
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  classes() {
    return this.callCv<{ nc: number; names: string[] }>("/classes");
  }

  async scan(tenantId: string, userId: string, file: UploadedImage) {
    if (!file || !ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException({ code: "INVALID_IMAGE", message: "Format gambar harus JPEG, PNG, atau WEBP" });
    }

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    const payload = await this.callCv<RawScan>("/scan", { method: "POST", body: form });

    const mappings = await this.prisma.cvProductMapping.findMany({ where: { tenantId }, select: { classId: true, productId: true } });
    const mapped = new Map(mappings.map((m) => [m.classId, m.productId]));
    const scan = await this.prisma.cvScan.create({
      data: {
        tenantId,
        createdBy: userId,
        fileName: file.originalname,
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

  async listScans(tenantId: string, limit = 20, offset = 0) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(offset, 0);
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
    await this.prisma.cvProductMapping.deleteMany({ where: { tenantId, classId } });
    return { ok: true as const };
  }

  private async callCv<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.env.CV_SERVICE_URL}${path}`, {
        ...init,
        headers: { "x-cv-token": this.env.CV_INTERNAL_TOKEN },
      });
      if (!response.ok) throw new Error(`CV service error ${response.status}`);
      return (await response.json()) as T;
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
    model_version: scan.modelVersion,
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
