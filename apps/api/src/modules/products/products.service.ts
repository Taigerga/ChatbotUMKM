import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { sku: { contains: query.q } }] } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map((p) => ({ ...p, price: Number(p.price).toFixed(2), cost: p.cost === null ? null : Number(p.cost).toFixed(2) })), total, limit, offset };
  }

  async get(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException({ code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" });
    return { ...product, price: Number(product.price).toFixed(2), cost: product.cost === null ? null : Number(product.cost).toFixed(2) };
  }

  async create(tenantId: string, dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({ data: { tenantId, sku: dto.sku, name: dto.name, category: dto.category ?? null, price: dto.price.toFixed(2), cost: dto.cost === undefined ? null : dto.cost.toFixed(2) } });
      return { ...product, price: Number(product.price).toFixed(2), cost: product.cost === null ? null : Number(product.cost).toFixed(2) };
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
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.price !== undefined ? { price: dto.price.toFixed(2) } : {}),
          ...(dto.cost !== undefined ? { cost: dto.cost.toFixed(2) } : {}),
        },
      });
      return { ...product, price: Number(product.price).toFixed(2), cost: product.cost === null ? null : Number(product.cost).toFixed(2) };
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "SKU_DUPLICATE", message: "SKU sudah dipakai" });
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }
}
