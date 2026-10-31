import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { OverviewController } from "./overview.controller.js";
import { OverviewService } from "./overview.service.js";

@Module({
  controllers: [OverviewController],
  providers: [OverviewService, TenantGuard],
  exports: [OverviewService],
})
export class OverviewModule {}
