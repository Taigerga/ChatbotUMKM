import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { ProductsService } from "./products.service.js";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query("q") q?: string, @Query("category") category?: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.products.list(tenantId, { q, category, limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
  }

  @Get(":id")
  get(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.products.get(tenantId, id);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.products.create(tenantId, dto);
  }

  @Put(":id")
  update(@CurrentTenant() tenantId: string, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(tenantId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.products.remove(tenantId, id);
  }
}
