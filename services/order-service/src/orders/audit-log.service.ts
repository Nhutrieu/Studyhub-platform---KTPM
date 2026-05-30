import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { CreateAuditLogDto } from './dtos/audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(orderId: string, createDto: CreateAuditLogDto): Promise<AuditLogDocument> {
    const auditLog = await this.auditLogModel.create({
      orderId,
      ...createDto,
    });

    this.logger.log(`Created audit log for order ${orderId}: ${createDto.action}`);
    return auditLog;
  }

  async findByOrderId(orderId: string): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ orderId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createStatusUpdateLog(
    orderId: string,
    oldStatus: string,
    newStatus: string,
    performedBy: { id: string; name: string; role?: string },
    metadata?: Record<string, any>,
  ): Promise<AuditLogDocument> {
    const statusLabels: Record<string, string> = {
      // Standardized statuses
      NEW: 'Mới',
      CONFIRMED: 'Đã xác nhận',
      PACKING: 'Đang đóng gói',
      OUT_FOR_DELIVERY: 'Đang giao hàng',
      DELIVERED: 'Đã giao',
      DELIVERY_FAILED: 'Giao hàng thất bại',
      RETURNED: 'Đã trả hàng',
      CANCELLED: 'Đã hủy',
      // Legacy statuses (for backward compatibility)
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipped: 'Đã gửi hàng',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
      refunded: 'Đã hoàn tiền',
    };

    return this.create(orderId, {
      action: 'status_update',
      description: `Trạng thái đơn hàng đã được cập nhật từ "${statusLabels[oldStatus] || oldStatus}" sang "${statusLabels[newStatus] || newStatus}"`,
      performedBy,
      changes: [
        {
          field: 'status',
          oldValue: statusLabels[oldStatus] || oldStatus,
          newValue: statusLabels[newStatus] || newStatus,
        },
      ],
      metadata,
    });
  }

  async createDeliveryUpdateLog(
    orderId: string,
    action: string,
    description: string,
    performedBy: { id: string; name: string; role?: string },
    changes?: Array<{ field: string; oldValue: string; newValue: string }>,
    metadata?: Record<string, any>,
  ): Promise<AuditLogDocument> {
    return this.create(orderId, {
      action: 'delivery_update',
      description,
      performedBy,
      changes,
      metadata,
    });
  }

  async createProofUploadLog(
    orderId: string,
    performedBy: { id: string; name: string; role?: string },
    proofImageUrl: string,
    deliveryNote?: string,
  ): Promise<AuditLogDocument> {
    return this.create(orderId, {
      action: 'proof_upload',
      description: 'Đã upload ảnh bằng chứng giao hàng',
      performedBy,
      metadata: {
        proofImage: proofImageUrl,
        deliveryNote,
      },
    });
  }

  async createOrderCreatedLog(
    orderId: string,
    performedBy: { id: string; name: string; role?: string },
  ): Promise<AuditLogDocument> {
    return this.create(orderId, {
      action: 'order_created',
      description: 'Đơn hàng đã được tạo',
      performedBy,
    });
  }

  async createOrderCancelledLog(
    orderId: string,
    reason: string,
    performedBy: { id: string; name: string; role?: string },
  ): Promise<AuditLogDocument> {
    return this.create(orderId, {
      action: 'order_cancelled',
      description: `Đơn hàng đã được hủy${reason ? `: ${reason}` : ''}`,
      performedBy,
      metadata: {
        cancelReason: reason,
      },
    });
  }
}

