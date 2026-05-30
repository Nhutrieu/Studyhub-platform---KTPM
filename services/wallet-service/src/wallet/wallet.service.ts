import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument, WalletTransaction, WalletTransactionDocument } from './schemas/wallet.schema';
import { CreateWalletDto, DepositDto, WithdrawDto, EscrowLockDto, EscrowReleaseDto, EscrowRefundDto, TransferDto, UpdateTransactionStatusDto } from './dtos/wallet.dto';
import * as crypto from 'crypto';
import * as qs from 'qs';

// Helper function to format date as yyyymmddHHmmss
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private vnp_TmnCode = process.env.VNP_TMN_CODE || '7MFQRM1G';
  private vnp_HashSecret = process.env.VNP_HASH_SECRET || 'HUOUL72ZW06UZRY5ZG6D8QARXPQ1ZDDR';
  private vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private vnp_ReturnUrl = process.env.VNP_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/deposit/return`;
  private vnp_IpnUrl = process.env.VNP_IPN_URL || `${process.env.API_GATEWAY_URL || 'http://localhost:3001'}/api/wallet/deposit/ipn`;

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name) private transactionModel: Model<WalletTransactionDocument>,
  ) {}

  // Helper function to sort object for VNPAY
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  async createWallet(createWalletDto: CreateWalletDto): Promise<WalletDocument> {
    const existingWallet = await this.walletModel.findOne({ userId: createWalletDto.userId }).exec();
    if (existingWallet) {
      throw new BadRequestException('Wallet already exists for this user');
    }

    const wallet = new this.walletModel({
      ...createWalletDto,
      balance: 0,
      lockedBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      isActive: true,
    });

    return wallet.save();
  }

  async getWallet(userId: string): Promise<WalletDocument> {
    let wallet: WalletDocument | null = await this.walletModel.findOne({ userId }).exec();
    
    if (!wallet) {
      wallet = await this.createWallet({ userId });
    }

    return wallet as WalletDocument;
  }

  async deposit(userId: string, depositDto: DepositDto): Promise<WalletTransaction> {
    const wallet = await this.getWallet(userId);

    // Set expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const transaction = new this.transactionModel({
      walletId: String(wallet._id),
      userId,
      type: 'deposit',
      amount: depositDto.amount,
      status: 'pending',
      topupStatus: 'CREATED', // Initial status
      paymentId: depositDto.paymentId,
      description: depositDto.description || 'Deposit to wallet',
      expiresAt,
      ipnProcessed: false,
    });

    this.logger.log(`Created deposit transaction ${transaction._id} for user ${userId}, amount: ${depositDto.amount}`);

    // Don't update balance yet - wait for VNPAY callback
    // Balance will be updated when payment is confirmed via IPN
    return transaction.save();
  }

  async createDepositVnpayUrl(
    userId: string,
    amount: number,
    description: string,
    ipAddr: string,
    transactionId: string,
  ): Promise<string> {
    const date = new Date();
    const createDate = formatDate(date);
    
    // Expiration time (15 minutes)
    const expireDate = new Date(date.getTime() + 15 * 60 * 1000);
    const expireDateStr = formatDate(expireDate);

    // Clean description (remove accents and special chars for VNPAY)
    const cleanOrderInfo = (description || `Nap tien vao vi ${amount.toLocaleString('vi-VN')} VND`)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = this.vnp_TmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = transactionId; // Use transaction ID as TxnRef
    vnp_Params['vnp_OrderInfo'] = cleanOrderInfo;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amount * 100; // Multiply by 100
    vnp_Params['vnp_ReturnUrl'] = this.vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    vnp_Params['vnp_ExpireDate'] = expireDateStr; // Expiration time
    vnp_Params['vnp_IpnUrl'] = this.vnp_IpnUrl; // IPN URL for server-to-server callback

    // Remove empty values
    Object.keys(vnp_Params).forEach((key) => {
      if (vnp_Params[key] === null || vnp_Params[key] === undefined || vnp_Params[key] === '') {
        delete vnp_Params[key];
      }
    });

    // Sort params
    const sortedParams = this.sortObject(vnp_Params);

    // Create sign data
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;
    const paymentUrl = this.vnp_Url + '?' + qs.stringify(sortedParams, { encode: false });

    // Update transaction status to PENDING
    await this.transactionModel.findByIdAndUpdate(transactionId, {
      topupStatus: 'PENDING',
    }).exec();

    this.logger.log(`Created VNPAY payment URL for transaction ${transactionId}`);

    return paymentUrl;
  }

  async verifyVnpayReturn(vnp_Params: any): Promise<{ isValid: boolean; transaction?: WalletTransaction; params: any }> {
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const transactionId = vnp_Params['vnp_TxnRef'];
      const transaction = await this.transactionModel.findById(transactionId).exec();
      return { isValid: true, transaction: transaction || undefined, params: vnp_Params };
    } else {
      return { isValid: false, params: vnp_Params };
    }
  }

  async handleVnpayIpn(vnp_Params: any): Promise<{ RspCode: string; Message: string }> {
    try {
      const secureHash = vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      const sortedParams = this.sortObject(vnp_Params);
      const signData = qs.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      this.logger.debug(`VNPay IPN - Sign Data: ${signData}`);
      this.logger.debug(`VNPay IPN - Received Hash: ${secureHash?.substring(0, 20)}...`);
      this.logger.debug(`VNPay IPN - Calculated Hash: ${signed.substring(0, 20)}...`);

      if (secureHash !== signed) {
        this.logger.warn('VNPay IPN - Invalid signature');
        return { RspCode: '97', Message: 'Fail checksum' };
      }

      const transactionId = vnp_Params['vnp_TxnRef'];
      const rspCode = vnp_Params['vnp_ResponseCode'];
      const transactionStatus = vnp_Params['vnp_TransactionStatus'];
      const amount = parseInt(vnp_Params['vnp_Amount']) / 100; // Chuyển từ xu sang VND

      this.logger.debug(`VNPay IPN - TransactionId: ${transactionId}, ResponseCode: ${rspCode}, TransactionStatus: ${transactionStatus}`);

      // Tìm transaction theo transactionId
      const transaction = await this.transactionModel.findById(transactionId).exec();

      if (!transaction) {
        this.logger.warn(`VNPay IPN - Transaction not found for transactionId: ${transactionId}`);
        return { RspCode: '01', Message: 'Transaction not found' };
      }

      // Kiểm tra nếu đã xử lý (RspCode: 02 = Order already confirmed)
      if (transaction.ipnProcessed && transaction.status === 'completed') {
        this.logger.debug(`VNPay IPN - Transaction already processed for transactionId: ${transactionId}`);
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      // Cập nhật trạng thái transaction
      // RspCode: 00 = Giao dịch thành công
      // TransactionStatus: 00 = Giao dịch thanh toán được thực hiện thành công tại VNPAY
      if (rspCode === '00' && transactionStatus === '00') {
        // Update wallet balance (only if not already processed)
        if (!transaction.ipnProcessed) {
          const wallet = await this.getWallet(transaction.userId);
          wallet.balance += transaction.amount;
          wallet.totalDeposited += transaction.amount;
          await wallet.save();
        }

        transaction.status = 'completed';
        transaction.topupStatus = 'SUCCESS';
        transaction.completedAt = new Date();
        transaction.ipnProcessed = true;
        transaction.vnpTransactionNo = vnp_Params['vnp_TransactionNo'];
        transaction.vnpResponseCode = rspCode;
        transaction.vnpTransactionStatus = transactionStatus;
        transaction.vnpParams = vnp_Params;
        this.logger.log(`VNPay IPN - Deposit completed for transactionId: ${transactionId}`);
      } else {
        transaction.status = 'failed';
        transaction.topupStatus = 'FAILED';
        transaction.failedReason = `ResponseCode: ${rspCode}, TransactionStatus: ${transactionStatus}`;
        transaction.vnpResponseCode = rspCode;
        transaction.vnpTransactionStatus = transactionStatus;
        transaction.vnpParams = vnp_Params;
        this.logger.warn(`VNPay IPN - Deposit failed for transactionId: ${transactionId}, Reason: ${transaction.failedReason}`);
      }

      await transaction.save();

      // RspCode: 00 = success (đã cập nhật được tình trạng giao dịch)
      return { RspCode: '00', Message: 'success' };
    } catch (error: any) {
      this.logger.error(`VNPay IPN - Error processing IPN: ${error.message}`, error.stack);
      // RspCode: 99 = Các lỗi khác
      return { RspCode: '99', Message: `Error: ${error.message}` };
    }
  }

  /**
   * @deprecated This method should not be used for VNPAY deposits
   * Use handleVnpayIpn instead - IPN is the source of truth
   * This method is kept for backward compatibility but should not update balance
   */
  async confirmDeposit(transactionId: string): Promise<WalletTransaction> {
    const transaction = await this.transactionModel.findById(transactionId).exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === 'completed') {
      return transaction; // Already confirmed
    }

    if (transaction.type !== 'deposit') {
      throw new BadRequestException('Transaction is not a deposit');
    }

    // For VNPAY deposits, balance should only be updated via IPN
    // This method should only be used for manual/admin confirmations
    if (!transaction.paymentId || transaction.paymentId.includes('vnpay')) {
      this.logger.warn(`Attempted to confirm VNPAY deposit ${transactionId} via confirmDeposit. This should be done via IPN.`);
      // Don't update balance - wait for IPN
      return transaction;
    }

    const wallet = await this.getWallet(transaction.userId);

    // Update wallet balance (only for non-VNPAY deposits)
    wallet.balance += transaction.amount;
    wallet.totalDeposited += transaction.amount;
    await (wallet as WalletDocument).save();

    // Complete transaction
    transaction.status = 'completed';
    transaction.topupStatus = 'SUCCESS';
    transaction.completedAt = new Date();
    return transaction.save();
  }

  async withdraw(userId: string, withdrawDto: WithdrawDto): Promise<WalletTransaction> {
    const wallet = await this.getWallet(userId);

    if (wallet.balance < withdrawDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const transaction = new this.transactionModel({
      walletId: String(wallet._id),
      userId,
      type: 'withdraw',
      amount: withdrawDto.amount,
      status: 'pending', // Pending - waiting for admin approval
      description: withdrawDto.description || 'Withdraw from wallet',
      bankAccount: withdrawDto.bankAccount,
      bankName: withdrawDto.bankName,
      accountHolderName: withdrawDto.accountHolderName,
    });

    // DO NOT update wallet balance - wait for admin to process manually
    // Admin will call approveWithdraw or rejectWithdraw

    return transaction.save();
  }

  async approveWithdraw(transactionId: string, adminNote?: string): Promise<WalletTransaction> {
    const transaction = await this.transactionModel.findById(transactionId).exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.type !== 'withdraw') {
      throw new BadRequestException('Transaction is not a withdrawal');
    }

    if (transaction.status === 'completed') {
      throw new BadRequestException('Withdrawal already processed');
    }

    const wallet = await this.getWallet(transaction.userId);

    if (wallet.balance < transaction.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Update wallet balance
    wallet.balance -= transaction.amount;
    wallet.totalWithdrawn += transaction.amount;
    await (wallet as WalletDocument).save();

    // Complete transaction
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    if (adminNote) {
      transaction.adminNote = adminNote;
    }
    return transaction.save();
  }

  async rejectWithdraw(transactionId: string, adminNote?: string): Promise<WalletTransaction> {
    const transaction = await this.transactionModel.findById(transactionId).exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.type !== 'withdraw') {
      throw new BadRequestException('Transaction is not a withdrawal');
    }

    if (transaction.status === 'completed' || transaction.status === 'cancelled') {
      throw new BadRequestException('Withdrawal already processed');
    }

    // Cancel transaction - no balance change needed
    transaction.status = 'cancelled';
    if (adminNote) {
      transaction.adminNote = adminNote;
    }
    transaction.failedReason = adminNote || 'Rejected by admin';
    return transaction.save();
  }

  async escrowLock(userId: string, lockDto: EscrowLockDto): Promise<WalletTransaction> {
    const wallet = await this.getWallet(userId);

    const availableBalance = wallet.balance - wallet.lockedBalance;
    if (availableBalance < lockDto.amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    const transaction = new this.transactionModel({
      walletId: String(wallet._id),
      userId,
      type: 'escrow_lock',
      amount: lockDto.amount,
      status: 'pending',
      orderId: lockDto.orderId,
      description: lockDto.description || `Escrow lock for order ${lockDto.orderId}`,
    });

    // Lock balance
    wallet.lockedBalance += lockDto.amount;
    await (wallet as WalletDocument).save();

    // Complete transaction
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    return transaction.save();
  }

  async escrowRelease(userId: string, releaseDto: EscrowReleaseDto): Promise<WalletTransaction> {
    const wallet = await this.getWallet(userId);

    // Find locked transaction for this order
    const lockedTransaction = await this.transactionModel.findOne({
      orderId: releaseDto.orderId,
      type: 'escrow_lock',
      status: 'completed',
    }).exec();

    if (!lockedTransaction) {
      throw new NotFoundException('No locked transaction found for this order');
    }

    const releaseAmount = releaseDto.amount || lockedTransaction.amount;

    if (wallet.lockedBalance < releaseAmount) {
      throw new BadRequestException('Insufficient locked balance');
    }

    const transaction = new this.transactionModel({
      walletId: String(wallet._id),
      userId,
      type: 'escrow_release',
      amount: releaseAmount,
      status: 'pending',
      orderId: releaseDto.orderId,
      referenceId: lockedTransaction._id.toString(),
      description: releaseDto.description || `Escrow release for order ${releaseDto.orderId}`,
    });

    // Release locked balance (deduct from locked, deduct from balance)
    wallet.lockedBalance -= releaseAmount;
    wallet.balance -= releaseAmount;
    await (wallet as WalletDocument).save();

    // Complete transaction
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    return transaction.save();
  }

  async escrowRefund(userId: string, refundDto: EscrowRefundDto): Promise<WalletTransaction> {
    const wallet = await this.getWallet(userId);

    // Find locked transaction for this order
    const lockedTransaction = await this.transactionModel.findOne({
      orderId: refundDto.orderId,
      type: 'escrow_lock',
      status: 'completed',
    }).exec();

    if (!lockedTransaction) {
      throw new NotFoundException('No locked transaction found for this order');
    }

    const refundAmount = refundDto.amount || lockedTransaction.amount;

    if (wallet.lockedBalance < refundAmount) {
      throw new BadRequestException('Insufficient locked balance');
    }

    const transaction = new this.transactionModel({
      walletId: String(wallet._id),
      userId,
      type: 'escrow_refund',
      amount: refundAmount,
      status: 'pending',
      orderId: refundDto.orderId,
      referenceId: lockedTransaction._id.toString(),
      description: refundDto.description || `Escrow refund for order ${refundDto.orderId}`,
    });

    // Refund: unlock balance and return to available balance
    wallet.lockedBalance -= refundAmount;
    await (wallet as WalletDocument).save();

    // Complete transaction
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    return transaction.save();
  }

  async transfer(fromUserId: string, transferDto: TransferDto): Promise<WalletTransaction> {
    const fromWallet = await this.getWallet(fromUserId);
    const toWallet = await this.getWallet(transferDto.recipientId);

    if (fromWallet.balance < transferDto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create transaction for sender
    const transaction = new this.transactionModel({
      walletId: String(fromWallet._id),
      userId: fromUserId,
      type: 'transfer',
      amount: transferDto.amount,
      status: 'pending',
      description: transferDto.description || `Transfer to user ${transferDto.recipientId}`,
    });

    // Update wallets
    fromWallet.balance -= transferDto.amount;
    toWallet.balance += transferDto.amount;
    await (fromWallet as WalletDocument).save();
    await (toWallet as WalletDocument).save();

    // Complete transaction
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    return transaction.save();
  }

  async getTransactions(userId: string, filters?: any): Promise<WalletTransaction[]> {
    const query: any = { userId };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.orderId) {
      query.orderId = filters.orderId;
    }

    return this.transactionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getPendingWithdrawals(): Promise<WalletTransaction[]> {
    return this.transactionModel.find({
      type: 'withdraw',
      status: 'pending',
    }).sort({ createdAt: -1 }).exec();
  }

  async getAllWallets(filters?: any): Promise<{
    items: WalletDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filters?.userId) {
      query.userId = filters.userId;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive === 'true' || filters.isActive === true;
    }

    if (filters?.minBalance !== undefined) {
      query.balance = { $gte: Number(filters.minBalance) };
    }

    if (filters?.maxBalance !== undefined) {
      query.balance = {
        ...(query.balance as Record<string, unknown> | undefined),
        $lte: Number(filters.maxBalance),
      };
    }

    const limit = Math.min(parseInt(filters?.limit, 10) || 20, 100);
    const page = Math.max(parseInt(filters?.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.walletModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.walletModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getTransactionByPaymentId(paymentId: string): Promise<WalletTransaction | null> {
    return this.transactionModel.findOne({ paymentId }).exec();
  }

  async getTransactionById(id: string): Promise<WalletTransaction> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async updateTransactionStatus(id: string, updateDto: UpdateTransactionStatusDto): Promise<WalletTransaction> {
    const transaction = await this.getTransactionById(id);
    
    if (updateDto.status === 'completed') {
      transaction.completedAt = new Date();
    }

    Object.assign(transaction, updateDto);
    return (transaction as WalletTransactionDocument).save();
  }

  /**
   * Check and expire pending transactions that have passed their expiration time
   * Should be called by a cron job periodically
   */
  async expirePendingTransactions(): Promise<number> {
    const now = new Date();
    const expiredTransactions = await this.transactionModel.find({
      type: 'deposit',
      topupStatus: { $in: ['CREATED', 'PENDING'] },
      expiresAt: { $lt: now },
      status: 'pending',
    }).exec();

    let expiredCount = 0;
    for (const transaction of expiredTransactions) {
      transaction.topupStatus = 'EXPIRED';
      transaction.status = 'failed';
      transaction.failedReason = 'Transaction expired';
      await transaction.save();
      expiredCount++;

      this.logger.log(`Expired transaction ${transaction._id} for user ${transaction.userId}`);
    }

    return expiredCount;
  }

  /**
   * Get transaction status for polling
   */
  async getTransactionStatus(transactionId: string): Promise<{
    transactionId: string;
    topupStatus: string;
    status: string;
    amount: number;
    completedAt?: Date;
    failedReason?: string;
  }> {
    const transaction = await this.getTransactionById(transactionId);
    
    return {
      transactionId: (transaction as WalletTransactionDocument)._id.toString(),
      topupStatus: transaction.topupStatus || 'CREATED',
      status: transaction.status,
      amount: transaction.amount,
      completedAt: transaction.completedAt,
      failedReason: transaction.failedReason,
    };
  }
}

