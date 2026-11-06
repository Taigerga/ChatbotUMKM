import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { autoSku } from "../../common/code-generators.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto.js";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: { q?: string; category?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const where = {
      tenantId,
      archivedAt: null,
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { sku: { contains: query.q } }] } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map(toProductResponse), total, limit, offset };
  }

  async categories(tenantId: string) {
    const rows = await this.prisma.product.findMany({
      where: { tenantId, archivedAt: null, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return { items: rows.map((row) => row.category).filter((value): value is string => Boolean(value?.trim())) };
  }

  async get(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException({ code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" });
    return toProductResponse(product);
  }

  async create(tenantId: string, dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          tenantId,
          sku: dto.sku?.trim() || autoSku(),
          name: dto.name.trim(),
          category: dto.category?.trim() || null,
          price: dto.price.toFixed(2),
          cost: dto.cost === undefined ? null : dto.cost.toFixed(2),
        },
      });
      return toProductResponse(product);
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "SKU_DUPLICATE", message: "SKU sudah dipakai" });
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.get(tenantId, id);
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.sku?.trim() ? { sku: dto.sku.trim() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.category !== undefined ? { category: dto.category.trim() || null } : {}),
          ...(dto.price !== undefined ? { price: dto.price.toFixed(2) } : {}),
          ...(dto.cost !== undefined ? { cost: dto.cost.toFixed(2) } : {}),
        },
      });
      return toProductResponse(product);
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "SKU_DUPLICATE", message: "SKU sudah dipakai" });
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    const used = await this.prisma.saleItem.count({ where: { productId: id } });
    if (used > 0) {
      await this.prisma.product.update({ where: { id }, data: { archivedAt: new Date() } });
      return { ok: true, archived: true };
    }
    await this.prisma.product.delete({ where: { id } });
    return { ok: true, archived: false };
  }
}

type ProductRow = {
  id: string;
  tenantId: string;
  sku: string | null;
  name: string;
  category: string | null;
  price: unknown;
  cost: unknown;
  archivedAt: Date | null;
  createdAt: Date;
};

function toProductResponse(product: ProductRow) {
  return {
    id: product.id,
    tenantId: product.tenantId,
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: Number(product.price).toFixed(2),
    cost: product.cost === null ? null : Number(product.cost).toFixed(2),
    archivedAt: product.archivedAt,
    createdAt: product.createdAt,
  };
}
