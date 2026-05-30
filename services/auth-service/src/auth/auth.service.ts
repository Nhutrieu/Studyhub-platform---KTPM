import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService } from '../user/user.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dtos/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://email-service:3020';

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private httpService: HttpService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã được đăng ký');
    }

    // Validate branchId for staff roles
    const staffRoles = ['employee', 'branch_manager', 'shipper'];
    if (registerDto.role && staffRoles.includes(registerDto.role)) {
      if (!registerDto.branchId) {
        throw new BadRequestException(`${registerDto.role} phải được gán cho một chi nhánh`);
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.userService.create({
      ...registerDto,
      password: hashedPassword,
      role: registerDto.role || 'customer',
    });

    const token = this.generateToken(user);

    return {
      accessToken: token,
      refreshToken: token, // TODO: Implement proper refresh token
      user: this.formatUserResponse(user),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const token = this.generateToken(user);

    return {
      accessToken: token,
      refreshToken: token, // TODO: Implement proper refresh token
      user: this.formatUserResponse(user),
    };
  }

  private generateToken(user: any) {
    return this.jwtService.sign({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      branchId: user.branchId?.toString(),
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken);
      
      // Get user from database
      const user = await this.userService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      // Generate new tokens
      const newToken = this.generateToken(user);

      return {
        accessToken: newToken,
        refreshToken: newToken, // TODO: Implement proper refresh token
        user: this.formatUserResponse(user),
      };
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    
    // Don't reveal if email exists or not for security
    if (!user) {
      return { message: 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Save reset token to user
    await this.userService.update(user._id.toString(), {
      resetToken,
      resetTokenExpiry,
    });

    // Send email via email-service
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    try {
      const emailServiceUrl = `${this.EMAIL_SERVICE_URL}/api/email/password-reset`;
      const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
      
      await firstValueFrom(
        this.httpService.post(
          emailServiceUrl,
          {
            to: user.email,
            resetToken,
            resetUrl,
          },
          {
            headers: {
              'x-internal-secret': internalSecret,
            },
          },
        ),
      );
      this.logger.log(`Password reset email sent successfully to ${user.email}`);
    } catch (error) {
      // Log error but don't reveal to user
      this.logger.error(`Failed to send password reset email to ${user.email}:`, error);
      this.logger.error('Error details:', error instanceof Error ? error.message : String(error));
    }

    return { message: 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    // Find user by reset token
    const user = await this.userService.findByResetToken(resetPasswordDto.token);
    
    if (!user) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu lại.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

    // Update password and clear reset token
    await this.userService.update(user._id.toString(), {
      password: hashedPassword,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  private formatUserResponse(user: any) {
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      fullName: user.name,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      branchId: user.branchId?.toString(),
      addresses: user.addresses,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

