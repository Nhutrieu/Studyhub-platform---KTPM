import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Email recipient' })
  @IsEmail()
  @IsString()
  to!: string;

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'Email HTML content' })
  @IsString()
  html!: string;

  @ApiPropertyOptional({ description: 'Email text content (optional)' })
  @IsOptional()
  @IsString()
  text?: string;
}

export class SendPasswordResetEmailDto {
  @ApiProperty({ description: 'Email recipient' })
  @IsEmail()
  @IsString()
  to!: string;

  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  resetToken!: string;

  @ApiProperty({ description: 'Password reset URL' })
  @IsString()
  resetUrl!: string;
}

export class SendOrderConfirmationEmailDto {
  @ApiProperty({ description: 'Email recipient' })
  @IsEmail()
  @IsString()
  to!: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Order items', type: 'array', items: { type: 'object' } })
  orderItems!: Array<{ name: string; quantity: number; price: number }>;

  @ApiProperty({ description: 'Total price' })
  totalPrice!: number;

  @ApiProperty({ description: 'Shipping address' })
  @IsString()
  shippingAddress!: string;
}

export class SendOrderStatusUpdateEmailDto {
  @ApiProperty({ description: 'Email recipient' })
  @IsEmail()
  @IsString()
  to!: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Order status' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ description: 'Custom message (optional)' })
  @IsOptional()
  @IsString()
  message?: string;
}

