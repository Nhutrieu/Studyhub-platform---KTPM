import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateChatDto {
  @IsString()
  subject?: string;
}

export class SendMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateChatStatusDto {
  @IsEnum(['open', 'closed', 'pending'])
  status!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

