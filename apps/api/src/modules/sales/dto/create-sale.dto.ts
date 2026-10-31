import { Type } from "class-transformer";
import { IsArray, IsISO8601, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class SaleItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateSaleDto {
  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}
