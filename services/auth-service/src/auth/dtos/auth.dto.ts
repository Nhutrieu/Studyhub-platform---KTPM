import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Request DTO for user registration - CLASS for validation
 */
export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@furnimart.vn' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password (min 6 characters)', example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ description: 'User full name', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'User phone number', example: '+84123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'User role', example: 'customer' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Branch ID for staff', example: '60f1b5b5e1b3c1b5b5e1b3c1' })
  @IsString()
  @IsOptional()
  branchId?: string;
}

/**
 * Request DTO for user login - CLASS for validation
 */
export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@furnimart.vn' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;
}

/**
 * Request DTO for refreshing tokens - CLASS for validation
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token to exchange for new access token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  refreshToken!: string;
}

/**
 * Response DTO for user information - INTERFACE (no initialization needed)
 */
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  branchId?: string;
  createdAt: string;
}

/**
 * Response DTO for login/register - INTERFACE (no initialization needed)
 */
export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

/**
 * Response DTO for registration - same as login response
 */
export interface RegisterResponseDto extends LoginResponseDto { }

/**
 * Request DTO for forgot password
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address', example: 'user@furnimart.vn' })
  @IsEmail()
  email!: string;
}

/**
 * Request DTO for reset password
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'New password (min 6 characters)', example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  password!: string;
}