import { IsString, IsOptional, IsEnum, IsObject, IsEmail, IsPhoneNumber, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AddressDto {
  @ApiProperty()
  @IsString()
  street!: string;

  @ApiProperty()
  @IsString()
  ward!: string;

  @ApiProperty()
  @IsString()
  district!: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  coordinates?: {
    lat: number;
    lng: number;
  };
}

class RegistrationDataDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessLicense?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Branch description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Branch address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiProperty({ description: 'Branch phone' })
  @IsString()
  phone!: string;

  @ApiProperty({ description: 'Branch email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Registration data', type: RegistrationDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => RegistrationDataDto)
  registrationData?: RegistrationDataDto;
}

export class UpdateBranchDto {
  @ApiProperty({ description: 'Branch name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Branch description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Branch phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Branch email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Manager ID', required: false })
  @IsOptional()
  @IsString()
  managerId?: string;
}

export class ApproveBranchDto {
  @ApiProperty({ description: 'Approval status', enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  status!: string;

  @ApiProperty({ description: 'Rejection reason', required: false })
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

