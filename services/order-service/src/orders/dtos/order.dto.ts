import { IsString, IsArray, IsOptional, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  productName!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}

class CoordinatesDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class CreateOrderDto {
  @IsArray()
  items!: OrderItemDto[];

  @IsString()
  shippingAddress!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  promotionId?: string;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  shippingCoordinates?: CoordinatesDto; // Tọa độ địa chỉ giao hàng (lat, lng)
}

export class UpdateOrderStatusDto {
  @IsString()
  status!: string;
  
  // For SHIPPER: Delivery confirmation (6)
  @IsOptional()
  @IsString()
  deliveryConfirmation?: string; // OTP, signature, etc.
  
  @IsOptional()
  @IsString()
  deliveryNotes?: string;
  
  @IsOptional()
  @IsString()
  deliveryProof?: string; // Photo/signature URL
  
  // For ADMIN: Reason for exception status change (3)
  @IsOptional()
  @IsString()
  adminReason?: string; // Required when admin changes status
}

export class UpdatePaymentStatusDto {
  @IsString()
  paymentStatus!: string;
  
  @IsOptional()
  isPaid?: boolean;
}

export class UpdateOrderItemQuantityDto {
  @IsString()
  productId!: string;
  
  @IsNumber()
  quantity!: number;
}