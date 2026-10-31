import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { externalRef: { contains: query.q } }, { phone: { contains: query.q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async get(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException({ code: "CUSTOMER_NOT_FOUND", message: "Pelanggan tidak ditemukan" });
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({ data: { tenantId, externalRef: dto.externalRef, name: dto.name, phone: dto.phone ?? null, email: dto.email ?? null } });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "CUSTOMER_DUPLICATE", message: "Referensi pelanggan sudah dipakai" });
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.get(tenantId, id);
    try {
      return await this.prisma.customer.update({ where: { id }, data: { ...(dto.externalRef !== undefined ? { externalRef: dto.externalRef } : {}), ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.phone !== undefined ? { phone: dto.phone } : {}), ...(dto.email !== undefined ? { email: dto.email } : {}) } });
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") throw new BadRequestException({ code: "CUSTOMER_DUPLICATE", message: "Referensi pelanggan sudah dipakai" });
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { ok: true };
  }
}
EOF
echo done