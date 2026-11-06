import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { autoCustomerRef, autoInvoiceCode, autoSku } from "../../common/code-generators.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateSaleDto, SaleItemDto } from "./dto/create-sale.dto.js";
import { calculateTotals } from "./sale-calculator.js";

export type SaleListQuery = {
  from?: string;
  to?: string;
  customerId?: string;
  productId?: string;
  category?: string;
  source?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

type PreparedItem = {
  productId: string | null;
  description: string;
  qty: number;
  unitPrice: number;
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  validate(dto: CreateSaleDto): string[] {
    const errors: string[] = [];
    if (!dto.items?.length) errors.push("Minimal satu item penjualan");
    if (Number.isNaN(new Date(dto.occurredAt).getTime())) errors.push("Tanggal transaksi tidak valid");
    if (dto.newCustomer && !dto.newCustomer.name?.trim()) errors.push("Nama pelanggan baru wajib diisi");
    for (const item of dto.items ?? []) {
      if (!item.description?.trim() && !item.productId && !item.newProduct?.name?.trim()) errors.push("Setiap item butuh produk atau deskripsi");
      if (item.newProduct && !item.newProduct.name?.trim()) errors.push("Nama produk baru wajib diisi");
      if (!Number.isInteger(item.qty) || item.qty < 1) errors.push("Qty harus bilangan bulat >= 1");
      if (typeof item.unitPrice !== "number" || item.unitPrice < 0) errors.push("Harga satuan tidak valid");
    }
    if (errors.length === 0) {
      const totals = calculateTotals(dto.items, dto.discount, dto.tax);
      if (Number(totals.total) <= 0) errors.push("Total penjualan harus lebih dari nol");
    }
    return errors;
  }

  private prepareTotals(items: PreparedItem[], discount?: number, tax?: number) {
    return calculateTotals(items.map((item) => ({ description: item.description, qty: item.qty, unitPrice: item.unitPrice })), discount, tax);
  }

  private async prepareSale(tx: any, tenantId: string, dto: CreateSaleDto) {
    let customerId = dto.customerId ?? null;
    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
      if (!customer) throw new BadRequestException({ code: "CUSTOMER_NOT_FOUND", message: "Pelanggan tidak ditemukan" });
    } else if (dto.newCustomer) {
      const customer = await tx.customer.create({
        data: {
          tenantId,
          externalRef: dto.newCustomer.externalRef?.trim() || autoCustomerRef(),
          name: dto.newCustomer.name.trim(),
          phone: dto.newCustomer.phone?.trim() || null,
          email: dto.newCustomer.email?.trim() || null,
        },
        select: { id: true },
      });
      customerId = customer.id;
    }

    const items: PreparedItem[] = [];
    for (const item of dto.items as (SaleItemDto & { newProduct?: { name: string; category?: string; price?: number; cost?: number; sku?: string } })[]) {
      let productId = item.productId ?? null;
      let description = item.description?.trim() ?? "";
      if (productId) {
        const product = await tx.product.findFirst({ where: { id: productId, tenantId }, select: { id: true, name: true } });
        if (!product) throw new BadRequestException({ code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" });
        description ||= product.name;
      } else if (item.newProduct) {
        const product = await tx.product.create({
          data: {
            tenantId,
            sku: item.newProduct.sku?.trim() || autoSku(),
            name: item.newProduct.name.trim(),
            category: item.newProduct.category?.trim() || null,
            price: (item.newProduct.price ?? item.unitPrice).toFixed(2),
            cost: item.newProduct.cost === undefined ? null : item.newProduct.cost.toFixed(2),
          },
          select: { id: true, name: true },
        });
        productId = product.id;
        description ||= product.name;
      }
      items.push({ productId, description: description || "Item", qty: item.qty, unitPrice: item.unitPrice });
    }

    return { customerId, items, totals: this.prepareTotals(items, dto.discount, dto.tax) };
  }

  async create(tenantId: string, userId: string, dto: CreateSaleDto, opts: { idempotencyKey?: string; source: string }) {
    const errors = this.validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException({ code: "SALE_INVALID", message: errors.join("; "), details: errors });
    }

    if (opts.idempotencyKey) {
      const existing = await this.prisma.sale.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: opts.idempotencyKey } },
        include: { items: true, customer: true },
      });
      if (existing) return existing;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const prepared = await this.prepareSale(tx, tenantId, dto);
        const created = await tx.sale.create({
          data: {
            tenantId,
            code: autoInvoiceCode(new Date(dto.occurredAt)),
            customerId: prepared.customerId,
            occurredAt: new Date(dto.occurredAt),
            notes: dto.notes ?? null,
            subtotal: prepared.totals.subtotal,
            discount: (dto.discount ?? 0).toFixed(2),
            tax: (dto.tax ?? 0).toFixed(2),
            total: prepared.totals.total,
            source: opts.source,
            idempotencyKey: opts.idempotencyKey ?? null,
            items: {
              create: prepared.items.map((item, index) => ({
                productId: item.productId,
                description: item.description,
                qty: item.qty,
                unitPrice: item.unitPrice.toFixed(2),
                lineTotal: prepared.totals.lineTotals[index],
              })),
            },
          },
          include: { items: true, customer: true },
        });
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: "sale.created",
            entity: "Sale",
            entityId: created.id,
            summary: { total: prepared.totals.total, items: prepared.items.length, source: opts.source },
          },
        });
        return created;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002" && opts.idempotencyKey) {
        const existing = await this.prisma.sale.findUnique({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: opts.idempotencyKey } },
          include: { items: true, customer: true },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async get(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId }, include: { items: true, customer: true } });
    if (!sale) throw new NotFoundException({ code: "SALE_NOT_FOUND", message: "Penjualan tidak ditemukan" });
    return toSaleResponse(sale);
  }

  async update(tenantId: string, userId: string, id: string, dto: CreateSaleDto) {
    const existing = await this.prisma.sale.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
    if (!existing) throw new NotFoundException({ code: "SALE_NOT_FOUND", message: "Penjualan tidak ditemukan" });
    if (existing.status === "void") throw new ConflictException({ code: "SALE_VOID", message: "Transaksi yang sudah dibatalkan tidak bisa diubah" });

    const errors = this.validate(dto);
    if (errors.length > 0) throw new BadRequestException({ code: "SALE_INVALID", message: errors.join("; "), details: errors });

    const sale = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepareSale(tx, tenantId, dto);
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      const updated = await tx.sale.update({
        where: { id },
        data: {
          customerId: prepared.customerId,
          occurredAt: new Date(dto.occurredAt),
          notes: dto.notes ?? null,
          subtotal: prepared.totals.subtotal,
          discount: (dto.discount ?? 0).toFixed(2),
          tax: (dto.tax ?? 0).toFixed(2),
          total: prepared.totals.total,
          items: {
            create: prepared.items.map((item, index) => ({
              productId: item.productId,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice.toFixed(2),
              lineTotal: prepared.totals.lineTotals[index],
            })),
          },
        },
        include: { items: true, customer: true },
      });
      await tx.auditLog.create({ data: { tenantId, userId, action: "sale.updated", entity: "Sale", entityId: id, summary: { total: prepared.totals.total, items: prepared.items.length } } });
      return updated;
    });
    return toSaleResponse(sale);
  }

  async remove(tenantId: string, userId: string, id: string, reason?: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
    if (!sale) throw new NotFoundException({ code: "SALE_NOT_FOUND", message: "Penjualan tidak ditemukan" });
    if (sale.status === "void") return { ok: true, status: "void" };

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id }, data: { status: "void", voidedAt: new Date(), voidReason: reason?.trim() || null } });
      await tx.auditLog.create({ data: { tenantId, userId, action: "sale.voided", entity: "Sale", entityId: id, summary: { reason: reason ?? null } } });
    });
    return { ok: true, status: "void" };
  }

  async list(tenantId: string, query: SaleListQuery) {
    const limit = Math.min(Math.max(Number.isFinite(query.limit) ? (query.limit as number) : 20, 1), 100);
    const offset = Math.max(Number.isFinite(query.offset) ? (query.offset as number) : 0, 0);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && Number.isNaN(from.getTime())) throw new BadRequestException({ code: "INVALID_DATE", message: "Tanggal mulai tidak valid" });
    if (to && Number.isNaN(to.getTime())) throw new BadRequestException({ code: "INVALID_DATE", message: "Tanggal akhir tidak valid" });
    const status = query.status && query.status !== "all" ? query.status : "posted";
    const where = {
      tenantId,
      ...(status !== "all" ? { status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(query.productId ? { items: { some: { productId: query.productId } } } : {}),
      ...(query.category ? { items: { some: { product: { category: query.category } } } } : {}),
      ...(query.q ? { OR: [{ code: { contains: query.q } }, { customer: { name: { contains: query.q } } }, { items: { some: { description: { contains: query.q } } } }] } : {}),
    };
    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({ where, include: { items: true, customer: true }, orderBy: { occurredAt: "desc" }, take: limit, skip: offset }),
      this.prisma.sale.count({ where }),
    ]);
    return { sales: sales.map(toSaleResponse), total, limit, offset };
  }

  async lines(tenantId: string, query: SaleListQuery) {
    const limit = Math.min(Math.max(Number.isFinite(query.limit) ? (query.limit as number) : 20, 1), 100);
    const offset = Math.max(Number.isFinite(query.offset) ? (query.offset as number) : 0, 0);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const status = query.status && query.status !== "all" ? query.status : "posted";

    const saleWhere = {
      tenantId,
      ...(status !== "all" ? { status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const where = {
      sale: saleWhere,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.category ? { product: { category: query.category } } : {}),
      ...(query.q
        ? {
            OR: [
              { description: { contains: query.q } },
              { product: { name: { contains: query.q } } },
              { product: { sku: { contains: query.q } } },
              { sale: { code: { contains: query.q } } },
              { sale: { customer: { name: { contains: query.q } } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.saleItem.findMany({
        where,
        include: { sale: { include: { customer: true } }, product: true },
        orderBy: { sale: { occurredAt: "desc" } },
        take: limit,
        skip: offset,
      }),
      this.prisma.saleItem.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        saleId: row.saleId,
        saleCode: row.sale.code,
        occurredAt: row.sale.occurredAt,
        status: row.sale.status,
        customerId: row.sale.customerId,
        customerName: row.sale.customer?.name ?? null,
        productId: row.productId,
        productName: row.product?.name ?? row.description,
        sku: row.product?.sku ?? null,
        category: row.product?.category ?? null,
        description: row.description,
        qty: row.qty,
        unitPrice: Number(row.unitPrice).toFixed(2),
        lineTotal: Number(row.lineTotal).toFixed(2),
        subtotal: Number(row.sale.subtotal).toFixed(2),
        discount: Number(row.sale.discount).toFixed(2),
        tax: Number(row.sale.tax).toFixed(2),
        total: Number(row.sale.total).toFixed(2),
        source: row.sale.source,
        notes: row.sale.notes,
      })),
      total,
      limit,
      offset,
    };
  }
}

type SaleWithRelations = {
  subtotal: unknown;
  discount: unknown;
  tax: unknown;
  total: unknown;
  items: { productId?: string | null; unitPrice: unknown; lineTotal: unknown }[];
  customer?: { name: string } | null;
} & Record<string, unknown>;

export function toSaleResponse(sale: SaleWithRelations) {
  const s = sale as any;
  return {
    id: s.id,
    code: s.code,
    occurredAt: s.occurredAt,
    customerId: s.customerId ?? null,
    customerName: sale.customer?.name ?? null,
    notes: s.notes ?? null,
    subtotal: Number(sale.subtotal).toFixed(2),
    discount: Number(sale.discount).toFixed(2),
    tax: Number(sale.tax).toFixed(2),
    total: Number(sale.total).toFixed(2),
    source: s.source,
    status: s.status,
    voidedAt: s.voidedAt ?? null,
    voidReason: s.voidReason ?? null,
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
