import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class ChatReadTools {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(tenantId: string, args: { from: string; to: string }) {
    const from = new Date(args.from);
    const to = new Date(args.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { error: "Tanggal tidak valid, minta pengguna menyebutkan tanggal yang jelas." };
    }
    const [count, aggregate] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, occurredAt: { gte: from, lte: to } } }),
      this.prisma.sale.aggregate({ where: { tenantId, occurredAt: { gte: from, lte: to } }, _sum: { total: true } }),
    ]);
    return { from: args.from, to: args.to, saleCount: count, total: Number(aggregate._sum.total ?? 0).toFixed(2) };
  }

  async findProducts(tenantId: string, args: { query: string }) {
    const query = (args.query ?? "").trim();
    if (!query) return { error: "Kata kunci produk kosong." };
    const products = await this.prisma.product.findMany({
      where: { tenantId, OR: [{ name: { contains: query } }, { sku: { contains: query } }] },
      select: { id: true, sku: true, name: true, price: true },
      take: 10,
    });
    return { query, products: products.map((p) => ({ ...p, price: Number(p.price).toFixed(2) })) };
  }
}
