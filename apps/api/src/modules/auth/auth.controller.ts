import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { loadEnv } from "../../config/env.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";

const env = loadEnv();

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(await this.auth.register(dto), res);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(await this.auth.login(dto), res);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(env.AUTH_COOKIE_NAME, { path: "/" });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() auth: { userId: string }) {
    return this.auth.me(auth.userId);
  }

  private respond(result: { token: string; user: unknown; tenants: unknown; activeTenantId: string }, res: Response) {
    res.cookie(env.AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { user: result.user, tenants: result.tenants, activeTenantId: result.activeTenantId };
  }
}
