import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { CustomersModule } from "../customers/customers.module.js";
import { ProductsModule } from "../products/products.module.js";
import { SalesModule } from "../sales/sales.module.js";
import { ImportsController } from "./imports.controller.js";
import { ImportsService } from "./imports.service.js";

@Module({
  imports: [CustomersModule, ProductsModule, SalesModule],
  controllers: [ImportsController],
  providers: [ImportsService, TenantGuard],
})
export class ImportsModule {}
