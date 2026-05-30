import { IsString, IsNumber, IsArray, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(10, { message: 'Nhận xét phải có ít nhất 10 ký tự' })
  @MaxLength(100, { message: 'Nhận xét không được vượt quá 100 ký tự' })
  comment!: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}
