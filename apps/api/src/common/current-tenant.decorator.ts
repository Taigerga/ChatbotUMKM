import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { TenantRequest } from "./tenant.guard.js";

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest<TenantRequest>().tenantId!;
});
