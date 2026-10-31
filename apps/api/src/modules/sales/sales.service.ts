import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateSaleDto } from "./dto/create-sale.dto.js";
import { calculateTotals } from "./sale-calculator.js";

export type SaleListQuery = { from?: string; to?: string; limit?: number; offset?: number };

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  validate(dto: CreateSaleDto): string[] {
    const errors: string[] = [];
    if (!dto.items?.length) errors.push("Minimal satu item penjualan");
    if (Number.isNaN(new Date(dto.occurredAt).getTime())) errors.push("Tanggal transaksi tidak valid");
    for (const item of dto.items ?? []) {
      if (!item.description?.trim()) errors.push("Setiap item butuh deskripsi");
      if (!Number.isInteger(item.qty) || item.qty < 1) errors.push("Qty harus bilangan bulat >= 1");
      if (typeof item.unitPrice !== "number" || item.unitPrice < 0) errors.push("Harga satuan tidak valid");
    }
    if (errors.length === 0) {
      const totals = calculateTotals(dto.items, dto.discount, dto.tax);
      if (Number(totals.total) <= 0) errors.push("Total penjualan harus lebih dari nol");
    }
    return errors;
  }

  async create(tenantId: string, userId: string, dto: CreateSaleDto, opts: { idempotencyKey?: string; source: string }) {
    const errors = this.validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException({ code: "SALE_INVALID", message: errors.join("; "), details: errors });
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true } });
      if (!customer) throw new BadRequestException({ code: "CUSTOMER_NOT_FOUND", message: "Pelanggan tidak ditemukan" });
    }
    for (const item of dto.items) {
      if (item.productId) {
        const product = await this.prisma.product.findFirst({ where: { id: item.productId, tenantId }, select: { id: true } });
        if (!product) throw new BadRequestException({ code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" });
      }
    }

    if (opts.idempotencyKey) {
      const existing = await this.prisma.sale.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: opts.idempotencyKey } },
        include: { items: true },
      });
      if (existing) return existing;
    }

    const totals = calculateTotals(dto.items, dto.discount, dto.tax);
    let sale: any;
    try {
      sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          tenantId,
          customerId: dto.customerId ?? null,
          occurredAt: new Date(dto.occurredAt),
          notes: dto.notes ?? null,
          subtotal: totals.subtotal,
          discount: (dto.discount ?? 0).toFixed(2),
          tax: (dto.tax ?? 0).toFixed(2),
          total: totals.total,
          source: opts.source,
          idempotencyKey: opts.idempotencyKey ?? null,
          items: {
            create: dto.items.map((item, index) => ({
              productId: item.productId ?? null,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice.toFixed(2),
              lineTotal: totals.lineTotals[index],
            })),
          },
        },
        include: { items: true },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "sale.created",
          entity: "Sale",
          entityId: created.id,
          summary: { total: totals.total, items: dto.items.length, source: opts.source },
        },
      });
      return created;
    });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002" && opts.idempotencyKey) {
        const existing = await this.prisma.sale.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: opts.idempotencyKey } },
          include: { items: true },
        });
        if (existing) return existing;
      }
      throw error;
    }
    return sale;
  }

  async get(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!sale) throw new NotFoundException({ code: "SALE_NOT_FOUND", message: "Penjualan tidak ditemukan" });
    return toSaleResponse(sale);
  }

  async update(tenantId: string, userId: string, id: string, dto: CreateSaleDto) {
    const errors = this.validate(dto);
    if (errors.length > 0) throw new BadRequestException({ code: "SALE_INVALID", message: errors.join("; "), details: errors });

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true } });
      if (!customer) throw new BadRequestException({ code: "CUSTOMER_NOT_FOUND", message: "Pelanggan tidak ditemukan" });
    }
    for (const item of dto.items) {
      if (item.productId) {
        const product = await this.prisma.product.findFirst({ where: { id: item.productId, tenantId }, select: { id: true } });
        if (!product) throw new BadRequestException({ code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" });
      }
    }

    const totals = calculateTotals(dto.items, dto.discount, dto.tax);
    const sale = await this.prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      const updated = await tx.sale.update({
        where: { id },
        data: {
          customerId: dto.customerId ?? null,
          occurredAt: new Date(dto.occurredAt),
          notes: dto.notes ?? null,
          subtotal: totals.subtotal,
          discount: (dto.discount ?? 0).toFixed(2),
          tax: (dto.tax ?? 0).toFixed(2),
          total: totals.total,
          items: {
            create: dto.items.map((item, index) => ({
              productId: item.productId ?? null,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice.toFixed(2),
              lineTotal: totals.lineTotals[index],
            })),
          },
        },
        include: { items: true },
      });
      await tx.auditLog.create({ data: { tenantId, userId, action: "sale.updated", entity: "Sale", entityId: id, summary: { total: totals.total, items: dto.items.length } } });
      return updated;
    });
    return toSaleResponse(sale);
  }

  async remove(tenantId: string, userId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!sale) throw new NotFoundException({ code: "SALE_NOT_FOUND", message: "Penjualan tidak ditemukan" });
    await this.prisma.$transaction(async (tx) => {
      await tx.sale.delete({ where: { id } });
      await tx.auditLog.create({ data: { tenantId, userId, action: "sale.deleted", entity: "Sale", entityId: id, summary: {} } });
    });
    return { ok: true };
  }
    const limit = Math.min(Math.max(Number.isFinite(query.limit) ? (query.limit as number) : 20, 1), 100);
    const offset = Math.max(Number.isFinite(query.offset) ? (query.offset as number) : 0, 0);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && Number.isNaN(from.getTime())) throw new BadRequestException({ code: "INVALID_DATE", message: "Tanggal mulai tidak valid" });
    if (to && Number.isNaN(to.getTime())) throw new BadRequestException({ code: "INVALID_DATE", message: "Tanggal akhir tidak valid" });
    const where = {
      tenantId,
      ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({ where, include: { items: true }, orderBy: { occurredAt: "desc" }, take: limit, skip: offset }),
      this.prisma.sale.count({ where }),
    ]);
    return { sales: sales.map(toSaleResponse), total, limit, offset };
  }
}

type SaleWithItems = {
  subtotal: unknown;
  discount: unknown;
  tax: unknown;
  total: unknown;
  items: { unitPrice: unknown; lineTotal: unknown }[];
} & Record<string, unknown>;

export function toSaleResponse(sale: SaleWithItems) {
  const s = sale as any;
  return {
    id: s.id,
    occurredAt: s.occurredAt,
    customerId: s.customerId ?? null,
    notes: s.notes ?? null,
    subtotal: Number(sale.subtotal).toFixed(2),
    discount: Number(sale.discount).toFixed(2),
    tax: Number(sale.tax).toFixed(2),
    total: Number(sale.total).toFixed(2),
    source: s.source,
    createdAt: s.createdAt,
    items: sale.items.map((item: any) => ({
      id: item.id,
      productId: item.productId ?? null,
      description: item.description,
      qty: item.qty,
      unitPrice: Number(item.unitPrice).toFixed(2),
      lineTotal: Number(item.lineTotal).toFixed(2),
    })),
  };
}
