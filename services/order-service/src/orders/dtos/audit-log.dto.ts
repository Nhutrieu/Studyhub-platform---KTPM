import { IsString, IsNotEmpty, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  oldValue!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  newValue!: string;
}

export class PerformedByDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  role?: string;
}

export class CreateAuditLogDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ type: PerformedByDto })
  @ValidateNested()
  @Type(() => PerformedByDto)
  performedBy!: PerformedByDto;

  @ApiPropertyOptional({ type: [ChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeDto)
  @IsOptional()
  changes?: ChangeDto[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

