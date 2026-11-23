import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CvMappingDto {
  @IsInt()
  @Min(0)
  classId!: number;

  @IsString()
  @IsNotEmpty()
  className!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;
}
