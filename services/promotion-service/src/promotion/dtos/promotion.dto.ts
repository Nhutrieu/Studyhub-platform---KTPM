import { IsEnum, IsNumber, IsString, IsOptional, IsBoolean, IsArray, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Promotion name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Promotion description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Promotion type', enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'] })
  @IsEnum(['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'])
  type!: string;

  @ApiProperty({ description: 'Promotion value' })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ description: 'Start date', type: String, format: 'date-time' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date', type: String, format: 'date-time' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ description: 'Applicable product IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProducts?: string[];

  @ApiProperty({ description: 'Applicable category IDs', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];

  @ApiProperty({ description: 'Minimum purchase amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiProperty({ description: 'Maximum discount amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiProperty({ description: 'Usage limit', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({ description: 'Promotion code', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Is code required', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isCodeRequired?: boolean;
}

export class UpdatePromotionDto {
  @ApiProperty({ description: 'Promotion name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Promotion description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Start date', type: String, format: 'date-time', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', type: String, format: 'date-time', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ApplyPromotionDto {
  @ApiProperty({ description: 'Promotion code', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Promotion ID', required: false })
  @IsOptional()
  @IsString()
  promotionId?: string;

  @ApiProperty({ description: 'Cart items', type: Array })
  @IsArray()
  items!: any[];

  @ApiProperty({ description: 'Total amount' })
  @IsNumber()
  @Min(0)
  totalAmount!: number;
}

