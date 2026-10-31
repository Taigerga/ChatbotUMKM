import { Body, Controller, Get, Headers, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard, type AuthContext } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { CreateSaleDto } from "./dto/create-sale.dto.js";
import { SalesService, toSaleResponse } from "./sales.service.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("sales")
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  async create(
    @CurrentUser() auth: AuthContext,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSaleDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const sale = await this.sales.create(tenantId, auth.userId, dto, { idempotencyKey, source: "manual" });
    return { sale: toSaleResponse(sale) };
  }

  @Get()
  async list(
    @CurrentTenant() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.sales.list(tenantId, {
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
