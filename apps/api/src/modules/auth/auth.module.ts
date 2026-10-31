import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { loadEnv } from "../../config/env.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

const env = loadEnv();

@Global()
@Module({
  imports: [JwtModule.register({ global: true, secret: env.JWT_SECRET, signOptions: { expiresIn: "7d" } })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
