import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Min, MinLength, MaxLength } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  orderId!: string;

  @IsEnum(['quality', 'damage', 'missing', 'wrong_item', 'delivery', 'payment', 'other'])
  type!: string;

  @IsString()
  reason!: string;

  @IsString()
  @MinLength(20, { message: 'Mô tả chi tiết phải có ít nhất 20 ký tự' })
  @MaxLength(100, { message: 'Mô tả không được vượt quá 100 ký tự' })
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateDisputeDto {
  @IsOptional()
  @IsEnum(['pending', 'reviewing', 'resolved', 'rejected', 'escalated'])
  status?: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

