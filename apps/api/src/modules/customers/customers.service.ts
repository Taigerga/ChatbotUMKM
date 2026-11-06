import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { autoCustomerRef } from "../../common/code-generators.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/customer.dto.js";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: { q?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const where = {
      tenantId,
      archivedAt: null,
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { externalRef: { contains: query.q } }, { phone: { contains: query.q } }, { email: { contains: query.q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset, include: { _count: { select: { sales: true } } } }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: items.map(toCustomerResponse), total, limit, offset };
  }

  async get(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId }, include: { _count: { select: { sales: true } } } });
    if (!customer) throw new NotFoundException({ code: "CUSTOMER_NOT_FOUND", message: "Pelanggan tidak ditemukan" });
    return toCustomerResponse(customer);
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    try {
      const customer = await this.prisma.customer.create({
        data: {
          tenantId,
          externalRef: dto.externalRef?.trim() || autoCustomerRef(),
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
        },
      });
      return toCustomerResponse(customer);
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "CUSTOMER_DUPLICATE", message: "Referensi pelanggan sudah dipakai" });
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.get(tenantId, id);
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.externalRef?.trim() ? { externalRef: dto.externalRef.trim() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
        },
      });
      return toCustomerResponse(customer);
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "CUSTOMER_DUPLICATE", message: "Referensi pelanggan sudah dipakai" });
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    const used = await this.prisma.sale.count({ where: { customerId: id } });
    if (used > 0) {
      await this.prisma.customer.update({ where: { id }, data: { archivedAt: new Date() } });
      return { ok: true, archived: true };
    }
    await this.prisma.customer.delete({ where: { id } });
    return { ok: true, archived: false };
  }
}

type CustomerWithCount = {
  id: string;
  externalRef: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  _count?: { sales: number };
};

function toCustomerResponse(customer: CustomerWithCount) {
  return {
    id: customer.id,
    externalRef: customer.externalRef,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt,
    saleCount: customer._count?.sales ?? 0,
  };
}
