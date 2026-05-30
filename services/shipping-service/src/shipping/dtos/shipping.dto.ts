import { IsString, IsOptional, IsDateString, IsArray, ValidateIf } from 'class-validator';

export class UpdateShippingDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  // Multiple proof of delivery images
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proofOfDeliveryImages?: string[];

  // Single image (for backward compatibility)
  @IsOptional()
  @IsString()
  proofOfDeliveryImage?: string;

  @IsOptional()
  @IsString()
  customerSignature?: string;

  @IsOptional()
  @IsString()
  deliveryNote?: string;

  // Required when status is delivery_failed
  @ValidateIf((o) => o.status === 'delivery_failed')
  @IsString()
  deliveryFailedReason?: string;

  // Optional proof for delivery failure
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliveryFailedProofs?: string[];

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}
