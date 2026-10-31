import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthContext } from "./jwt-auth.guard.js";

export type TenantRequest = Request & { auth?: AuthContext; tenantId?: string };

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.header("x-tenant-id");
    if (!tenantId) {
      throw new BadRequestException({ code: "TENANT_REQUIRED", message: "Pilih toko aktif terlebih dahulu" });
    }
    const membership = await this.prisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId: request.auth!.userId, tenantId } },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException({ code: "TENANT_FORBIDDEN", message: "Tidak punya akses ke toko ini" });
    }
    request.tenantId = tenantId;
    return true;
  }
}
