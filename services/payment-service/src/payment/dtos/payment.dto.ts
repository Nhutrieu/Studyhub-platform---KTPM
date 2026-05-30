import { IsEnum, IsNumber, IsString, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Payment method', enum: ['vnpay'], default: 'vnpay' })
  @IsEnum(['vnpay'])
  method!: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Order description', required: false })
  @IsOptional()
  @IsString()
  orderDescription?: string;
}

export class CreateVnpayPaymentUrlDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Order description', required: false })
  @IsOptional()
  @IsString()
  orderDescription?: string;

  @ApiProperty({ description: 'Bank code for VNPay', required: false })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiProperty({ description: 'Order type', required: false })
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiProperty({ description: 'Language (vn/en)', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ description: 'Payment status', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] })
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'cancelled'])
  status!: string;

  @ApiProperty({ description: 'Transaction ID', required: false })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ description: 'Gateway response', required: false })
  @IsOptional()
  @IsObject()
  gatewayResponse?: any;

  @ApiProperty({ description: 'Failed reason', required: false })
  @IsOptional()
  @IsString()
  failedReason?: string;
}
