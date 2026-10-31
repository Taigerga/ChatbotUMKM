import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { SalesController } from "./sales.controller.js";
import { SalesService } from "./sales.service.js";

@Module({
  controllers: [SalesController],
  providers: [SalesService, TenantGuard],
  exports: [SalesService],
})
export class SalesModule {}
