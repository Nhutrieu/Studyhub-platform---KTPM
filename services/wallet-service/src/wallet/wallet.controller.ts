import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';
import { CreateWalletDto, DepositDto, WithdrawDto, EscrowLockDto, EscrowReleaseDto, EscrowRefundDto, TransferDto, UpdateTransactionStatusDto } from './dtos/wallet.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletTransactionDocument } from './schemas/wallet.schema';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo ví mới' })
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    return this.walletService.createWallet(createWalletDto);
  }

  @Get('my-wallet')
  @ApiOperation({ summary: 'Lấy thông tin ví của tôi' })
  async getMyWallet(@CurrentUser('userId') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lấy lịch sử giao dịch của tôi' })
  async getMyTransactions(@CurrentUser('userId') userId: string, @Query() filters: any) {
    return this.walletService.getTransactions(userId, filters);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Nạp tiền vào ví (tạo transaction)' })
  async deposit(@CurrentUser('userId') userId: string, @Body() depositDto: DepositDto) {
    return this.walletService.deposit(userId, depositDto);
  }

  @Post('deposit/vnpay')
  @ApiOperation({ summary: 'Nạp tiền vào ví qua VNPAY (tạo payment URL)' })
  async depositVnpay(
    @Req() req: any,
    @CurrentUser('userId') userId: string,
    @Body() depositDto: DepositDto,
  ) {
    // Create deposit transaction first
    const transaction = await this.walletService.deposit(userId, depositDto) as WalletTransactionDocument;

    // Get IP address (theo code demo VNPay)
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

    // Create VNPAY payment URL
    const paymentUrl = await this.walletService.createDepositVnpayUrl(
      userId,
      depositDto.amount,
      depositDto.description || `Nap tien vao vi ${depositDto.amount.toLocaleString('vi-VN')} VND`,
      ipAddr as string,
      transaction._id.toString(),
    );

    return { paymentUrl, transactionId: transaction._id };
  }

  @Get('deposit/return')
  @ApiOperation({ summary: 'VNPAY return URL cho deposit (chỉ hiển thị, không cộng tiền)' })
  async depositReturn(@Query() query: any, @Res() res: any) {
    const result = await this.walletService.verifyVnpayReturn(query);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const transactionId = query.vnp_TxnRef;

    if (result.isValid && result.transaction) {
      const responseCode = result.params['vnp_ResponseCode'];
      const transactionStatus = result.params['vnp_TransactionStatus'];
      const transaction = result.transaction as WalletTransactionDocument;

      // Update transaction status for display (but don't update balance - IPN handles that)
      if (responseCode === '00' && transactionStatus === '00') {
        // Payment successful - but balance already updated by IPN
        // Just update display status if not already updated
        if (transaction.topupStatus !== 'SUCCESS' && transaction.topupStatus !== 'PENDING') {
          transaction.topupStatus = 'PENDING'; // Will be updated by IPN
          await transaction.save();
        }
        
        // Redirect to frontend success page
        const redirectUrl = `${frontendUrl}/wallet/deposit/return?transactionId=${transactionId}&status=success`;
        return res.redirect(redirectUrl);
      } else {
        // Payment failed - update status for display
        let topupStatus = 'FAILED';
        if (responseCode === '24' || transactionStatus === '24') {
          topupStatus = 'CANCELED';
        }
        
        if (transaction.topupStatus !== topupStatus) {
          transaction.topupStatus = topupStatus;
          transaction.status = 'failed';
          transaction.failedReason = `ResponseCode: ${responseCode}, TransactionStatus: ${transactionStatus}`;
          await transaction.save();
        }

        // Redirect to frontend failure page
        const redirectUrl = `${frontendUrl}/wallet/deposit/return?transactionId=${transactionId}&status=failed&code=${responseCode}`;
        return res.redirect(redirectUrl);
      }
    } else {
      // Invalid signature
      const redirectUrl = `${frontendUrl}/wallet/deposit/return?transactionId=${transactionId}&status=error&message=${encodeURIComponent('Xác thực thanh toán thất bại')}`;
      return res.redirect(redirectUrl);
    }
  }

  @Get('deposit/ipn')
  @ApiOperation({ summary: 'VNPAY IPN URL cho deposit (server-to-server callback - source of truth)' })
  async depositIpn(@Query() query: any, @Res() res: any) {
    const result = await this.walletService.handleVnpayIpn(query);
    
    // VNPAY expects specific response format
    return res.status(200).json(result);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Rút tiền từ ví' })
  async withdraw(@CurrentUser('userId') userId: string, @Body() withdrawDto: WithdrawDto) {
    return this.walletService.withdraw(userId, withdrawDto);
  }

  @Post('escrow/lock')
  @ApiOperation({ summary: 'Khóa tiền ký quỹ cho đơn hàng' })
  async escrowLock(@CurrentUser('userId') userId: string, @Body() lockDto: EscrowLockDto) {
    return this.walletService.escrowLock(userId, lockDto);
  }

  @Post('escrow/release')
  @ApiOperation({ summary: 'Giải phóng tiền ký quỹ (thanh toán cho người bán)' })
  async escrowRelease(@CurrentUser('userId') userId: string, @Body() releaseDto: EscrowReleaseDto) {
    return this.walletService.escrowRelease(userId, releaseDto);
  }

  @Post('escrow/refund')
  @ApiOperation({ summary: 'Hoàn tiền ký quỹ (trả lại cho khách hàng)' })
  async escrowRefund(@CurrentUser('userId') userId: string, @Body() refundDto: EscrowRefundDto) {
    return this.walletService.escrowRefund(userId, refundDto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Chuyển tiền cho người dùng khác' })
  async transfer(@CurrentUser('userId') userId: string, @Body() transferDto: TransferDto) {
    return this.walletService.transfer(userId, transferDto);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Lấy chi tiết giao dịch' })
  async getTransactionById(@Param('id') id: string) {
    return this.walletService.getTransactionById(id);
  }

  @Get('transactions/order/:orderId')
  @ApiOperation({ summary: 'Lấy giao dịch theo Order ID' })
  async getTransactionsByOrderId(@Param('orderId') orderId: string) {
    return this.walletService.getTransactions('', { orderId });
  }

  @Put('transactions/:id/status')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái giao dịch (Admin)' })
  async updateTransactionStatus(@Param('id') id: string, @Body() updateDto: UpdateTransactionStatusDto) {
    return this.walletService.updateTransactionStatus(id, updateDto);
  }

  @Get('all')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy tất cả ví (Admin)' })
  async getAllWallets(@Query() filters: any) {
    return this.walletService.getAllWallets(filters);
  }

  @Get('withdrawals/pending')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu rút tiền đang chờ xử lý (Admin)' })
  async getPendingWithdrawals() {
    return this.walletService.getPendingWithdrawals();
  }

  @Post('withdrawals/:id/approve')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Phê duyệt yêu cầu rút tiền (Admin)' })
  async approveWithdraw(@Param('id') id: string, @Body() body: { adminNote?: string }) {
    return this.walletService.approveWithdraw(id, body.adminNote);
  }

  @Post('withdrawals/:id/reject')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Từ chối yêu cầu rút tiền (Admin)' })
  async rejectWithdraw(@Param('id') id: string, @Body() body: { adminNote?: string }) {
    return this.walletService.rejectWithdraw(id, body.adminNote);
  }

  @Get('deposit/status/:transactionId')
  @ApiOperation({ summary: 'Lấy trạng thái giao dịch nạp tiền (để polling)' })
  async getDepositStatus(@Param('transactionId') transactionId: string) {
    return this.walletService.getTransactionStatus(transactionId);
  }
}

