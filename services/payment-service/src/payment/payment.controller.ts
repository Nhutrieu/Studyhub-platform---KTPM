import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, UpdatePaymentStatusDto, CreateVnpayPaymentUrlDto } from './dtos/payment.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo thanh toán mới' })
  async create(@CurrentUser('userId') userId: string, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(userId, createPaymentDto);
  }

  @Post('create_payment_url')
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPay' })
  async createVnpayPaymentUrl(
    @Req() req: Request,
    @Body() body: CreateVnpayPaymentUrlDto,
  ) {
    // Validate required fields
    if (!body.orderId) {
      throw new BadRequestException('Order ID is required');
    }
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Lấy IP address (theo code demo VNPay)
    let ipAddr = process.env.VNP_PUBLIC_IP;
    if (!ipAddr || ipAddr === '') {
      ipAddr = req.headers['x-forwarded-for'] as string ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection as any).socket?.remoteAddress ||
        '127.0.0.1';
      
      // Xử lý IPv6 mapped IPv4
      if (typeof ipAddr === 'string' && ipAddr.startsWith('::ffff:')) {
        ipAddr = ipAddr.substring(7);
      }
      if (Array.isArray(ipAddr)) {
        ipAddr = ipAddr[0];
        if (ipAddr && ipAddr.startsWith('::ffff:')) {
          ipAddr = ipAddr.substring(7);
        }
      }
    }

    // Tạo payment record
    const payment = await this.paymentService.create('system', {
      orderId: body.orderId,
      amount: body.amount,
      method: 'vnpay',
      orderDescription: body.orderDescription,
    });

    // Tạo URL thanh toán VNPay
    const paymentUrl = await this.paymentService.createVnpayPaymentUrl(
      body.orderId,
      body.amount,
      body.orderDescription || `Thanh toan don hang ${body.orderId}`,
      ipAddr as string,
      body.bankCode,
      body.orderType || 'other',
      body.language || 'vn',
    );

    return { paymentUrl, paymentId: String((payment as any)._id) };
  }

  @Get('ipn')
  @ApiOperation({ summary: 'VNPay IPN URL - Server to server callback' })
  async vnpayIpn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayIpn(query);
    // VNPay expects a specific response format
    return res.status(200).json(result);
  }

  @Get('return')
  @ApiOperation({ summary: 'VNPay Return URL - Client redirect after payment' })
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.verifyVnpayReturn(query);
    
    if (result.isValid) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/payment/return?` + 
        `orderId=${query.vnp_TxnRef}&` +
        `responseCode=${query.vnp_ResponseCode}&` +
        `transactionStatus=${query.vnp_TransactionStatus}`;
      
      return res.redirect(redirectUrl);
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/payment/return?` + 
        `orderId=${query.vnp_TxnRef || ''}&` +
        `responseCode=97&` +
        `message=${encodeURIComponent('Invalid signature')}`;
      
      return res.redirect(redirectUrl);
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách thanh toán (Admin/Manager)' })
  async findAll(@Query() filters: any) {
    return this.paymentService.findAll(filters);
  }

  @Get('my-payments')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách thanh toán của tôi' })
  async getMyPayments(@CurrentUser('userId') userId: string) {
    return this.paymentService.findAll({ customerId: userId });
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Lấy thanh toán theo Order ID' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.paymentService.findByOrderId(orderId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy chi tiết thanh toán' })
  async findById(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái thanh toán (Admin)' })
  async updateStatus(@Param('id') id: string, @Body() updateDto: UpdatePaymentStatusDto) {
    return this.paymentService.updateStatus(id, updateDto);
  }
}
