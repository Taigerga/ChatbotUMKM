import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, TenantGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
EOF
echo done