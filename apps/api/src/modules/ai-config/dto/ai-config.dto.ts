import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SaveAiConfigDto {
  @IsString()
  @IsIn(["gemini", "openai-compatible"])
  provider!: "gemini" | "openai-compatible";

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  apiKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  baseUrl?: string;
}

export class TestAiConfigDto extends SaveAiConfigDto {}