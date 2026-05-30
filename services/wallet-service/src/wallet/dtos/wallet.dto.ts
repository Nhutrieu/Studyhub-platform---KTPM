import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId!: string;
}

export class DepositDto {
  @ApiProperty({ description: 'Deposit amount' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Payment ID', required: false })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawDto {
  @ApiProperty({ description: 'Withdraw amount' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Bank account number' })
  @IsString()
  bankAccount!: string;

  @ApiProperty({ description: 'Bank name' })
  @IsString()
  bankName!: string;

  @ApiProperty({ description: 'Account holder name' })
  @IsString()
  accountHolderName!: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class EscrowLockDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Amount to lock' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class EscrowReleaseDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Amount to release', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class EscrowRefundDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Amount to refund', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class TransferDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  recipientId!: string;

  @ApiProperty({ description: 'Transfer amount' })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTransactionStatusDto {
  @ApiProperty({ description: 'Transaction status', enum: ['pending', 'completed', 'failed', 'cancelled'] })
  @IsEnum(['pending', 'completed', 'failed', 'cancelled'])
  status!: string;

  @ApiProperty({ description: 'Failed reason', required: false })
  @IsOptional()
  @IsString()
  failedReason?: string;
}

