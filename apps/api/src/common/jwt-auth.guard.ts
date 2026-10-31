import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";

export type AuthContext = {
  userId: string;
  tenantIds: string[];
  tokenVersion: number;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { auth?: AuthContext }>();
    const token = request.cookies?.[process.env.AUTH_COOKIE_NAME ?? "token"];
    if (!token) throw new UnauthorizedException({ code: "NO_SESSION", message: "Silakan masuk terlebih dahulu" });

    let payload: { sub: string; tv: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException({ code: "INVALID_SESSION", message: "Sesi tidak valid atau kedaluwarsa" });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true, memberships: { select: { tenantId: true } } },
    });
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException({ code: "INVALID_SESSION", message: "Sesi tidak valid atau kedaluwarsa" });
    }

    request.auth = { userId: payload.sub, tenantIds: user.memberships.map((m) => m.tenantId), tokenVersion: user.tokenVersion };
    return true;
  }
}
