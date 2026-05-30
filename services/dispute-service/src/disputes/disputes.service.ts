import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Dispute, DisputeDocument } from './schemas/dispute.schema';
import { CreateDisputeDto, UpdateDisputeDto } from './dtos/dispute.dto';

@Injectable()
export class DisputesService {
  private readonly ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3005';
  private readonly INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';

  constructor(
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
    private httpService: HttpService,
  ) {}

  async create(customerId: string, customerName: string, createDisputeDto: CreateDisputeDto): Promise<DisputeDocument> {
    // 0.4: Validate dispute creation - order must belong to customer and have valid status
    try {
      // Use internal endpoint that doesn't require JWT auth
      const orderUrl = `${this.ORDER_SERVICE_URL}/api/orders/${createDisputeDto.orderId}/internal`;
      
      console.log(`[DisputeService] Fetching order ${createDisputeDto.orderId} from ${orderUrl}`);
      console.log(`[DisputeService] Using internal secret: ${this.INTERNAL_SERVICE_SECRET ? 'SET' : 'NOT SET'}`);
      
      const orderResponse = await firstValueFrom(
        this.httpService.get(orderUrl, {
          headers: {
            'x-internal-secret': this.INTERNAL_SERVICE_SECRET,
          },
        })
      );
      
      // Handle response format from ResponseInterceptor: { success, statusCode, message, data }
      const responseData = orderResponse.data;
      const order = responseData?.data || responseData;
      
      console.log(`[DisputeService] Order response received:`, {
        hasData: !!order,
        orderId: order?._id || order?.id,
        customerId: order?.customerId,
        status: order?.status,
        branchId: order?.branchId,
      });
      
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      
      // 2: Chỉ tạo dispute cho đơn của mình
      const orderCustomerId = order.customerId?.toString() || order.customerId;
      const requestCustomerId = customerId.toString();
      
      console.log(`[DisputeService] Comparing customer IDs: order=${orderCustomerId}, request=${requestCustomerId}`);
      
      if (orderCustomerId !== requestCustomerId) {
        throw new ForbiddenException('Bạn chỉ có thể tạo khiếu nại cho đơn hàng của chính mình');
      }
      
      // 0.4: Chỉ mở dispute khi order ở trạng thái cho phép
      const allowedStatuses = ['SHIPPING', 'DELIVERED', 'COMPLETED', 'FAILED_DELIVERY'];
      const orderStatus = order.status?.toUpperCase();
      if (!allowedStatuses.includes(orderStatus)) {
        throw new BadRequestException(
          `Chỉ có thể tạo khiếu nại khi đơn hàng ở trạng thái: ${allowedStatuses.join(', ')}. Đơn hàng hiện tại: ${orderStatus || 'N/A'}`
        );
      }
      
      // 0.4: Dispute phải có branch_id
      if (!order.branchId) {
        throw new BadRequestException('Đơn hàng không có chi nhánh xử lý, không thể tạo khiếu nại');
      }
      
      return this.disputeModel.create({
        ...createDisputeDto,
        customerId,
        customerName,
        branchId: order.branchId, // 0.4: Gắn branch_id từ order
        status: 'OPEN', // 0.4: Status flow chuẩn
      });
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Handle HTTP errors from axios
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        const message = responseData?.message || responseData?.error || 'Không thể xác thực đơn hàng';
        
        console.error(`[DisputeService] Order service error:`, {
          status,
          message,
          responseData,
        });
        
        if (status === 404) {
          throw new NotFoundException('Không tìm thấy đơn hàng');
        }
        if (status === 401 || status === 403) {
          throw new ForbiddenException('Không có quyền truy cập đơn hàng này');
        }
        if (status === 400 && message.includes('Invalid internal secret')) {
          throw new BadRequestException('Lỗi xác thực dịch vụ. Vui lòng liên hệ quản trị viên.');
        }
        throw new BadRequestException(message);
      }
      
      // If order service is unavailable, log warning and throw error
      console.error('[DisputeService] Could not validate order for dispute:', {
        error: error.message,
        stack: error.stack,
        orderId: createDisputeDto.orderId,
      });
      throw new BadRequestException('Không thể xác thực đơn hàng. Vui lòng thử lại sau.');
    }
  }

  async findAll(filters?: { status?: string; customerId?: string }): Promise<DisputeDocument[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.customerId) query.customerId = filters.customerId;
    return this.disputeModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<DisputeDocument> {
    const dispute = await this.disputeModel.findById(id).exec();
    if (!dispute) {
      throw new NotFoundException('Tranh chấp không tồn tại');
    }
    return dispute;
  }

  async findByOrderId(orderId: string): Promise<DisputeDocument[]> {
    return this.disputeModel.find({ orderId }).sort({ createdAt: -1 }).exec();
  }

  async update(id: string, updateDisputeDto: UpdateDisputeDto, reviewedBy: string): Promise<DisputeDocument> {
    const dispute = await this.findById(id);
    
    Object.assign(dispute, updateDisputeDto);
    dispute.reviewedBy = reviewedBy as any;
    
    if (updateDisputeDto.status === 'resolved') {
      dispute.resolvedAt = new Date();
    }

    return dispute.save();
  }

  async getStats(): Promise<{
    pending: number;
    reviewing: number;
    resolved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, reviewing, resolved, rejected, total] = await Promise.all([
      this.disputeModel.countDocuments({ status: 'pending' }).exec(),
      this.disputeModel.countDocuments({ status: 'reviewing' }).exec(),
      this.disputeModel.countDocuments({ status: 'resolved' }).exec(),
      this.disputeModel.countDocuments({ status: 'rejected' }).exec(),
      this.disputeModel.countDocuments().exec(),
    ]);

    return { pending, reviewing, resolved, rejected, total };
  }
}

