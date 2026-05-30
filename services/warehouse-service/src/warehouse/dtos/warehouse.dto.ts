import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: 'ID chi nhánh (bắt buộc cho tồn kho chi nhánh)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'Tên sản phẩm' })
  @IsString()
  productName!: string;

  @ApiProperty({ description: 'Số lượng tồn kho' })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Vị trí kho' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Mức tồn kho tối thiểu' })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiPropertyOptional({ description: 'Mức tồn kho tối đa' })
  @IsOptional()
  @IsNumber()
  maxStockLevel?: number;
}

export class WarehouseTransactionDto {
  @IsString()
  productId!: string;

  @IsNumber()
  quantity!: number; // Positive for import, negative for export

  @IsEnum(['import', 'export', 'adjustment', 'damaged', 'returned'])
  type!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustStockDto {
  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

