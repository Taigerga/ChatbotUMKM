import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { CustomersController } from "./customers.controller.js";
import { CustomersService } from "./customers.service.js";

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, TenantGuard],
  exports: [CustomersService],
})
export class CustomersModule {}
EOF
echo done