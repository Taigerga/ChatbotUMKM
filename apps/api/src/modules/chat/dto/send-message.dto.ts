import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @IsIn(["default", "personal"])
  aiMode?: "default" | "personal";
}
