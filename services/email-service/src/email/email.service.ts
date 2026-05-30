import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    const gmailUser = process.env.GMAIL_USER || '';
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || '';

    this.logger.log('=== Email Service Initialization ===');
    this.logger.log(`GMAIL_USER: ${gmailUser ? `Set (${gmailUser.substring(0, 3)}...)` : 'NOT SET'}`);
    this.logger.log(`GMAIL_APP_PASSWORD: ${gmailAppPassword ? `Set (${gmailAppPassword.length} chars)` : 'NOT SET'}`);

    if (!gmailUser || !gmailAppPassword) {
      this.logger.warn('Gmail credentials not configured. Email service will not work.');
      this.logger.warn(`GMAIL_USER: ${gmailUser ? 'Set' : 'NOT SET'}, GMAIL_APP_PASSWORD: ${gmailAppPassword ? 'Set' : 'NOT SET'}`);
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      this.isConfigured = true;
      this.logger.log('Nodemailer transporter created successfully');

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          this.logger.error('❌ Email service verification failed:');
          const errorAny = error as any;
          if (errorAny.code) this.logger.error(`Error code: ${errorAny.code}`);
          if (errorAny.command) this.logger.error(`Error command: ${errorAny.command}`);
          this.logger.error(`Error message: ${error.message}`);
          this.logger.error(`Full error: ${JSON.stringify(error, null, 2)}`);
          this.isConfigured = false;
        } else {
          this.logger.log('✅ Email service verification successful');
          this.logger.log('✅ Email service is ready to send emails');
        }
      });
    } catch (error) {
      this.logger.error('Failed to create email transporter:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    this.logger.log(`=== Attempting to send email to ${options.to} ===`);
    this.logger.log(`isConfigured: ${this.isConfigured}, transporter exists: ${!!this.transporter}`);

    if (!this.isConfigured || !this.transporter) {
      this.logger.error('Email transporter not initialized. Check Gmail credentials.');
      this.logger.error('Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
      throw new Error('Email service not configured');
    }

    try {
      const mailOptions = {
        from: `"FurniMart" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      this.logger.log(`Sending email from: ${mailOptions.from}`);
      this.logger.log(`Email subject: ${mailOptions.subject}`);

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${options.to}`);
      this.logger.log(`Message ID: ${info.messageId}`);
      this.logger.log(`Response: ${info.response}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${options.to}`);
      this.logger.error(`Error type: ${error?.constructor?.name}`);
      this.logger.error(`Error message: ${error?.message}`);
      this.logger.error(`Error code: ${error?.code}`);
      this.logger.error(`Error response: ${error?.response}`);
      this.logger.error(`Full error: ${JSON.stringify(error, null, 2)}`);
      throw error;
    }
  }

  // Helper method for password reset email
  async sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu - FurniMart</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">FurniMart</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Đặt lại mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Đặt lại mật khẩu</a>
          </div>
          <p>Hoặc sao chép và dán liên kết sau vào trình duyệt của bạn:</p>
          <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            <strong>Lưu ý:</strong> Liên kết này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} FurniMart. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: 'Đặt lại mật khẩu - FurniMart',
      html,
    });
  }

  // Helper method for order confirmation email
  async sendOrderConfirmationEmail(
    to: string,
    orderId: string,
    orderItems: Array<{ name: string; quantity: number; price: number }>,
    totalPrice: number,
    shippingAddress: string,
  ): Promise<void> {
    const itemsHtml = orderItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}</td>
      </tr>
    `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận đơn hàng - FurniMart</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">FurniMart</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Cảm ơn bạn đã đặt hàng!</h2>
          <p>Xin chào,</p>
          <p>Chúng tôi đã nhận được đơn hàng của bạn. Chi tiết đơn hàng như sau:</p>
          
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Mã đơn hàng: #${orderId}</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Sản phẩm</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Số lượng</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Giá</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #ddd;">
              <p style="font-size: 18px; font-weight: bold; color: #667eea;">
                Tổng cộng: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px;">
              <p style="margin: 0;"><strong>Địa chỉ giao hàng:</strong></p>
              <p style="margin: 5px 0 0 0;">${shippingAddress}</p>
            </div>
          </div>
          
          <p>Chúng tôi sẽ xử lý đơn hàng của bạn và thông báo khi đơn hàng được giao.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} FurniMart. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: `Xác nhận đơn hàng #${orderId} - FurniMart`,
      html,
    });
  }

  // Helper method for order status update email
  async sendOrderStatusUpdateEmail(
    to: string,
    orderId: string,
    status: string,
    message?: string,
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị.',
      PACKING: 'Đơn hàng của bạn đang được đóng gói.',
      READY_TO_SHIP: 'Đơn hàng của bạn đã sẵn sàng để giao hàng.',
      SHIPPING: 'Đơn hàng của bạn đang được vận chuyển.',
      DELIVERED: 'Đơn hàng của bạn đã được giao thành công.',
      CANCELLED: 'Đơn hàng của bạn đã bị hủy.',
    };

    const statusMessage = message || statusMessages[status] || 'Trạng thái đơn hàng của bạn đã được cập nhật.';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cập nhật đơn hàng - FurniMart</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">FurniMart</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Cập nhật đơn hàng</h2>
          <p>Xin chào,</p>
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Mã đơn hàng:</strong> #${orderId}</p>
            <p style="margin: 0 0 10px 0;"><strong>Trạng thái mới:</strong> ${status}</p>
            <p style="margin: 0;">${statusMessage}</p>
          </div>
          <p>Bạn có thể theo dõi đơn hàng của mình trong tài khoản.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} FurniMart. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: `Cập nhật đơn hàng #${orderId} - FurniMart`,
      html,
    });
  }
}

