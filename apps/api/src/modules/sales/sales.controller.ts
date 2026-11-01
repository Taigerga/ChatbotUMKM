import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
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

  @Get(":id")
  get(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.sales.get(tenantId, id);
  }

  @Put(":id")
  update(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Param("id") id: string, @Body() dto: CreateSaleDto) {
    return this.sales.update(tenantId, auth.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.sales.remove(tenantId, auth.userId, id);
  }
  @Get()
  async list(
    @CurrentTenant() tenantId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("customerId") customerId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.sales.list(tenantId, {
      from,
      to,
      customerId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }
}
