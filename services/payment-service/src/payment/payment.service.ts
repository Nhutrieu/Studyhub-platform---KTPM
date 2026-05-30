import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto, UpdatePaymentStatusDto, CreateVnpayPaymentUrlDto } from './dtos/payment.dto';
import * as crypto from 'crypto';
import * as qs from 'qs';
import dateFormat from 'dateformat';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3005';
  private vnp_TmnCode = process.env.VNP_TMN_CODE || '7MFQRM1G';
  private vnp_HashSecret = process.env.VNP_HASH_SECRET || 'HUOUL72ZW06UZRY5ZG6D8QARXPQ1ZDDR';
  private vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  private vnp_ReturnUrl = process.env.VNP_RETURN_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/return`;
  private vnp_IpnUrl = process.env.VNP_IPN_URL || `${process.env.API_GATEWAY_URL || 'http://localhost:3001'}/api/payments/ipn`;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private httpService: HttpService,
  ) {}

  // Helper function to sort object (theo code demo VNPay)
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  async create(customerId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = new this.paymentModel({
      ...createPaymentDto,
      customerId,
      status: 'pending',
    });

    return payment.save();
  }

  // Tạo URL thanh toán VNPay (theo code demo chính thức)
  async createVnpayPaymentUrl(
    orderId: string,
    amount: number,
    orderDescription: string,
    ipAddr: string,
    bankCode?: string,
    orderType: string = 'other',
    language: string = 'vn',
  ): Promise<string> {
    try {
      const date = new Date();
      
      // Format date theo GMT+7 (theo code demo VNPay sử dụng dateFormat)
      const createDate = dateFormat(date, 'yyyymmddHHmmss');
      
      // Thời gian hết hạn (15 phút từ thời điểm tạo - theo khuyến nghị VNPay)
      const expireDate = new Date(date.getTime() + 15 * 60 * 1000);
      const expireDateStr = dateFormat(expireDate, 'yyyymmddHHmmss');

      const vnp_Params: any = {};
      vnp_Params['vnp_Version'] = '2.1.0';
      vnp_Params['vnp_Command'] = 'pay';
      vnp_Params['vnp_TmnCode'] = this.vnp_TmnCode;
      vnp_Params['vnp_Locale'] = language || 'vn';
      vnp_Params['vnp_CurrCode'] = 'VND';
      vnp_Params['vnp_TxnRef'] = orderId;
      
      // Làm sạch OrderInfo (bỏ dấu tiếng Việt và ký tự đặc biệt)
      const cleanOrderInfo = (orderDescription || `Thanh toan don hang ${orderId}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
      vnp_Params['vnp_OrderInfo'] = cleanOrderInfo;
      
      vnp_Params['vnp_OrderType'] = orderType === 'other' ? 'billpayment' : orderType;
      vnp_Params['vnp_Amount'] = amount * 100; // Nhân 100 để chuyển sang xu
      vnp_Params['vnp_ReturnUrl'] = this.vnp_ReturnUrl;
      vnp_Params['vnp_IpnUrl'] = this.vnp_IpnUrl;
      vnp_Params['vnp_IpAddr'] = ipAddr;
      vnp_Params['vnp_CreateDate'] = createDate;
      vnp_Params['vnp_ExpireDate'] = expireDateStr; // Bắt buộc theo tài liệu

      if (bankCode !== null && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
      }

      // Xóa các giá trị rỗng
      Object.keys(vnp_Params).forEach((key) => {
        if (vnp_Params[key] === null || vnp_Params[key] === undefined || vnp_Params[key] === '') {
          delete vnp_Params[key];
        }
      });

      // Sắp xếp params theo alphabet (theo code demo VNPay)
      const sortedParams = this.sortObject(vnp_Params);
      
      // Tạo chuỗi ký tự để ký (không encode - theo code demo)
      const signData = qs.stringify(sortedParams, { encode: false });
      
      // Tạo chữ ký HMAC SHA512
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      
      this.logger.debug(`VNPay Sign Data: ${signData}`);
      this.logger.debug(`VNPay Signature: ${signed.substring(0, 20)}...`);

      // Thêm chữ ký vào params
      sortedParams['vnp_SecureHash'] = signed;

      // Tạo URL thanh toán
      const paymentUrl = this.vnp_Url + '?' + qs.stringify(sortedParams, { encode: false });

      this.logger.log(`VNPay Payment URL created for orderId: ${orderId}`);
      return paymentUrl;
    } catch (error: any) {
      this.logger.error(`Error creating VNPay payment URL: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create payment URL: ${error.message}`);
    }
  }

  // Xử lý IPN (Instant Payment Notification) từ VNPay (theo code demo)
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

      const orderId = vnp_Params['vnp_TxnRef'];
      const rspCode = vnp_Params['vnp_ResponseCode'];
      const transactionStatus = vnp_Params['vnp_TransactionStatus'];
      const amount = parseInt(vnp_Params['vnp_Amount']) / 100; // Chuyển từ xu sang VND

      this.logger.debug(`VNPay IPN - OrderId: ${orderId}, ResponseCode: ${rspCode}, TransactionStatus: ${transactionStatus}`);

      // Tìm payment theo orderId
      let payment = await this.paymentModel.findOne({ orderId }).exec();

      if (!payment) {
        // Tạo payment nếu chưa tồn tại
        this.logger.warn(`VNPay IPN - Payment not found for orderId: ${orderId}, creating new record`);
        payment = new this.paymentModel({
          orderId,
          customerId: 'unknown', // Fallback
          amount,
          method: 'vnpay',
          status: 'pending',
          gatewayResponse: vnp_Params,
        });
      }

      // Kiểm tra nếu đã xử lý (RspCode: 02 = Order already confirmed)
      // Check both 'completed' (legacy) and 'paid'/'PAID' (standard)
      if (payment.status === 'completed' || payment.status === 'paid' || payment.status === 'PAID') {
        this.logger.debug(`VNPay IPN - Payment already completed for orderId: ${orderId}`);
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      // Cập nhật trạng thái thanh toán
      // RspCode: 00 = Giao dịch thành công
      // TransactionStatus: 00 = Giao dịch thanh toán được thực hiện thành công tại VNPAY
      if (rspCode === '00' && transactionStatus === '00') {
        payment.status = 'paid'; // Use 'paid' to match shared types (also supports 'PAID')
        payment.completedAt = new Date();
        payment.transactionId = vnp_Params['vnp_TransactionNo'];
        payment.gatewayResponse = vnp_Params;
        this.logger.log(`VNPay IPN - Payment completed for orderId: ${orderId}`);

        // Cập nhật order paymentStatus
        try {
          const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
          const updateOrderUrl = `${this.ORDER_SERVICE_URL}/api/orders/${orderId}/payment-status`;
          await firstValueFrom(this.httpService.patch(updateOrderUrl, {
            paymentStatus: 'PAID',
            isPaid: true,
          }, {
            headers: {
              'x-internal-secret': internalSecret,
            },
          }));
          this.logger.log(`VNPay IPN - Updated order paymentStatus to PAID for orderId: ${orderId}`);
        } catch (error: any) {
          this.logger.error(`VNPay IPN - Failed to update order paymentStatus for orderId: ${orderId}`, error.message);
          // Không throw error để không ảnh hưởng đến response cho VNPay
        }
      } else {
        // Xử lý các trường hợp lỗi theo tài liệu VNPay
        payment.status = 'failed';
        
        // Map RspCode và TransactionStatus thành thông báo lỗi chi tiết
        const errorMessages: { [key: string]: string } = {
          '07': 'Giao dịch bị nghi ngờ gian lận',
          '09': 'Thẻ/Tài khoản chưa đăng ký InternetBanking',
          '10': 'Xác thực thông tin không đúng quá 3 lần',
          '11': 'Đã hết hạn chờ thanh toán',
          '12': 'Thẻ/Tài khoản bị khóa',
          '13': 'Nhập sai mật khẩu OTP',
          '24': 'Khách hàng hủy giao dịch',
          '51': 'Tài khoản không đủ số dư',
          '65': 'Vượt quá hạn mức giao dịch trong ngày',
          '75': 'Ngân hàng thanh toán đang bảo trì',
          '79': 'Nhập sai mật khẩu quá số lần quy định',
          '99': 'Các lỗi khác',
        };

        const transactionStatusMessages: { [key: string]: string } = {
          '01': 'Giao dịch chưa hoàn tất',
          '02': 'Giao dịch bị lỗi',
          '04': 'Giao dịch đảo (Khách hàng đã bị trừ tiền nhưng GD chưa thành công)',
          '05': 'VNPAY đang xử lý giao dịch này (GD hoàn tiền)',
          '06': 'VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng',
          '07': 'Giao dịch bị nghi ngờ gian lận',
          '09': 'GD Hoàn trả bị từ chối',
        };

        const rspMessage = errorMessages[rspCode] || `ResponseCode: ${rspCode}`;
        const statusMessage = transactionStatusMessages[transactionStatus] || `TransactionStatus: ${transactionStatus}`;
        
        payment.failedReason = `${rspMessage}. ${statusMessage}`;
        payment.gatewayResponse = vnp_Params;
        this.logger.warn(`VNPay IPN - Payment failed for orderId: ${orderId}, RspCode: ${rspCode}, TransactionStatus: ${transactionStatus}, Reason: ${payment.failedReason}`);
      }

      await payment.save();

      // RspCode: 00 = success (đã cập nhật được tình trạng giao dịch)
      return { RspCode: '00', Message: 'success' };
    } catch (error: any) {
      this.logger.error(`VNPay IPN - Error processing IPN: ${error.message}`, error.stack);
      // RspCode: 99 = Các lỗi khác
      return { RspCode: '99', Message: `Error: ${error.message}` };
    }
  }

  // Xác thực return URL từ VNPay (theo code demo)
  async verifyVnpayReturn(vnp_Params: any): Promise<{ isValid: boolean; payment?: Payment; params: any }> {
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const orderId = vnp_Params['vnp_TxnRef'];
      const payment = await this.paymentModel.findOne({ orderId }).exec();
      return { isValid: true, payment: payment || undefined, params: vnp_Params };
    } else {
      return { isValid: false, params: vnp_Params };
    }
  }

  async findAll(filters?: any): Promise<Payment[]> {
    return this.paymentModel.find(filters).exec();
  }

  async findById(id: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentModel.findOne({ orderId }).exec();
  }

  async updateStatus(id: string, updateDto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.findById(id);
    
    // Support both 'completed' (legacy) and 'paid'/'PAID' (standard)
    if (updateDto.status === 'completed' || updateDto.status === 'paid' || updateDto.status === 'PAID') {
      payment.completedAt = new Date();
    }

    Object.assign(payment, updateDto);
    return (payment as PaymentDocument).save();
  }
}
