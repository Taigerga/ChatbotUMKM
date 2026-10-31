import { BadRequestException, Injectable } from "@nestjs/common";
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

    if (opts.idempotencyKey) {
      const existing = await this.prisma.sale.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: opts.idempotencyKey } },
        include: { items: true },
      });
      if (existing) return existing;
    }

    const totals = calculateTotals(dto.items, dto.discount, dto.tax);
    const sale = await this.prisma.$transaction(async (tx) => {
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
    return sale;
  }

  async list(tenantId: string, query: SaleListQuery) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const where = {
      tenantId,
      ...(query.from || query.to
        ? { occurredAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
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
  return {
    ...sale,
    subtotal: Number(sale.subtotal).toFixed(2),
    discount: Number(sale.discount).toFixed(2),
    tax: Number(sale.tax).toFixed(2),
    total: Number(sale.total).toFixed(2),
    items: sale.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice).toFixed(2),
      lineTotal: Number(item.lineTotal).toFixed(2),
    })),
  };
}
