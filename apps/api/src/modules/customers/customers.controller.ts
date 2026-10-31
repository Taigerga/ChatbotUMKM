import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { CustomersService } from "./customers.service.js";
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/customer.dto.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query("q") q?: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.customers.list(tenantId, { q, limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
  }

  @Get(":id")
  get(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.customers.get(tenantId, id);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customers.create(tenantId, dto);
  }

  @Put(":id")
  update(@CurrentTenant() tenantId: string, @Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(tenantId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.customers.remove(tenantId, id);
  }
}
EOF
echo done