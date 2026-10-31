import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.tenantMember.findMany({
      where: { userId },
      select: { tenant: { select: { id: true, name: true, currency: true, isDemo: true } } },
      orderBy: { tenant: { createdAt: "asc" } },
    });
  }

  async getActive(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMember.findUniqueOrThrow({
      where: { userId_tenantId: { userId, tenantId } },
      select: { tenant: { select: { id: true, name: true, currency: true, timezone: true, isDemo: true } } },
    });
    return membership.tenant;
  }
}
