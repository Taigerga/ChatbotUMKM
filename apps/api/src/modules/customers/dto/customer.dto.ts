import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
