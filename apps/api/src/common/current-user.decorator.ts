import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthContext } from "./jwt-auth.guard.js";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const request = ctx.switchToHttp().getRequest<Request & { auth?: AuthContext }>();
  return request.auth!;
});
