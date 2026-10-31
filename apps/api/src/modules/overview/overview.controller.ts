import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { OverviewService } from "./overview.service.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("overview")
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get("summary")
  summary(@CurrentTenant() tenantId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.overview.summary(tenantId, from, to);
  }
}
