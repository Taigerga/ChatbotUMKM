import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard, type AuthContext } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { TenantsService } from "./tenants.service.js";

@UseGuards(JwtAuthGuard)
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  async list(@CurrentUser() auth: AuthContext) {
    const rows = await this.tenants.listForUser(auth.userId);
    return { tenants: rows.map((r) => r.tenant) };
  }

  @Get("active")
  @UseGuards(TenantGuard)
  async active(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string) {
    return { tenant: await this.tenants.getActive(auth.userId, tenantId) };
  }
}
