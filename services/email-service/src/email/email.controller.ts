import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { EmailService } from './email.service';
import {
  SendEmailDto,
  SendPasswordResetEmailDto,
  SendOrderConfirmationEmailDto,
  SendOrderStatusUpdateEmailDto,
} from './dtos/send-email.dto';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiExcludeEndpoint() // Hide from Swagger - internal endpoint
  @ApiOperation({ summary: 'Send generic email (Internal - Service-to-Service)' })
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Body() sendEmailDto: SendEmailDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    // Verify internal secret (for service-to-service calls)
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
    
    if (!secret || secret !== expectedSecret) {
      throw new Error('Unauthorized: Invalid internal secret');
    }

    await this.emailService.sendEmail(sendEmailDto);
    return { message: 'Email sent successfully' };
  }

  @Post('password-reset')
  @ApiExcludeEndpoint() // Hide from Swagger - internal endpoint
  @ApiOperation({ summary: 'Send password reset email (Internal - Service-to-Service)' })
  @HttpCode(HttpStatus.OK)
  async sendPasswordResetEmail(
    @Body() dto: SendPasswordResetEmailDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    // Verify internal secret (for service-to-service calls)
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
    
    if (!secret || secret !== expectedSecret) {
      throw new Error('Unauthorized: Invalid internal secret');
    }

    await this.emailService.sendPasswordResetEmail(dto.to, dto.resetToken, dto.resetUrl);
    return { message: 'Password reset email sent successfully' };
  }

  @Post('order-confirmation')
  @ApiExcludeEndpoint() // Hide from Swagger - internal endpoint
  @ApiOperation({ summary: 'Send order confirmation email (Internal - Service-to-Service)' })
  @HttpCode(HttpStatus.OK)
  async sendOrderConfirmationEmail(
    @Body() dto: SendOrderConfirmationEmailDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    // Verify internal secret (for service-to-service calls)
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
    
    if (!secret || secret !== expectedSecret) {
      throw new Error('Unauthorized: Invalid internal secret');
    }

    await this.emailService.sendOrderConfirmationEmail(
      dto.to,
      dto.orderId,
      dto.orderItems,
      dto.totalPrice,
      dto.shippingAddress,
    );
    return { message: 'Order confirmation email sent successfully' };
  }

  @Post('order-status-update')
  @ApiExcludeEndpoint() // Hide from Swagger - internal endpoint
  @ApiOperation({ summary: 'Send order status update email (Internal - Service-to-Service)' })
  @HttpCode(HttpStatus.OK)
  async sendOrderStatusUpdateEmail(
    @Body() dto: SendOrderStatusUpdateEmailDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    // Verify internal secret (for service-to-service calls)
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
    
    if (!secret || secret !== expectedSecret) {
      throw new Error('Unauthorized: Invalid internal secret');
    }

    await this.emailService.sendOrderStatusUpdateEmail(
      dto.to,
      dto.orderId,
      dto.status,
      dto.message,
    );
    return { message: 'Order status update email sent successfully' };
  }
}

