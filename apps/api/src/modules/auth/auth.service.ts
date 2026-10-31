import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "argon2";
import { PrismaService } from "../../prisma/prisma.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";

export type AuthResult = {
  token: string;
  user: { id: string; email: string; name: string };
  tenants: { id: string; name: string }[];
  activeTenantId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException({ code: "EMAIL_TAKEN", message: "Email sudah terdaftar" });

    const passwordHash = await hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, passwordHash, name: dto.name } });
      const tenant = await tx.tenant.create({ data: { name: dto.storeName } });
      await tx.tenantMember.create({ data: { userId: created.id, tenantId: tenant.id } });
      return { created, tenant };
    });

    return this.buildResult(user.created.id, user.created.email, user.created.name, user.tenant.id, user.created.tokenVersion);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS", message: "Email atau password salah" });
    }
    const membership = await this.prisma.tenantMember.findFirstOrThrow({ where: { userId: user.id } });
    return this.buildResult(user.id, user.email, user.name, membership.tenantId, user.tokenVersion);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, memberships: { select: { tenant: { select: { id: true, name: true } } } } },
    });
    return { user: { id: user.id, email: user.email, name: user.name }, tenants: user.memberships.map((m) => m.tenant) };
  }

  private async buildResult(id: string, email: string, name: string, activeTenantId: string, tokenVersion: number): Promise<AuthResult> {
    const tenants = await this.prisma.tenantMember.findMany({
      where: { userId: id },
      select: { tenant: { select: { id: true, name: true } } },
    });
    const token = await this.jwt.signAsync({ sub: id, tv: tokenVersion });
    return { token, user: { id, email, name }, tenants: tenants.map((t) => t.tenant), activeTenantId };
  }
}
