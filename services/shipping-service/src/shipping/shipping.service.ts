import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { ShippingTracking, ShippingTrackingDocument } from './schemas/shipping.schema';
import { UpdateShippingDto } from './dtos/shipping.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3005';

  constructor(
    @InjectModel(ShippingTracking.name)
    private shippingModel: Model<ShippingTrackingDocument>,
    private httpService: HttpService,
  ) {}

  async create(orderId: string, shipperId: string): Promise<ShippingTrackingDocument> {
    return this.shippingModel.create({
      orderId,
      shipperId,
      status: 'pending',
    });
  }

  async findByOrderId(orderId: string): Promise<ShippingTrackingDocument | null> {
    return this.shippingModel.findOne({ orderId });
  }

  async findByShipperId(shipperId: string): Promise<ShippingTrackingDocument[]> {
    return this.shippingModel.find({ shipperId });
  }

  async updateStatus(
    orderId: string,
    updateDto: UpdateShippingDto,
    performedBy?: { id: string; name: string; role?: string },
  ): Promise<ShippingTrackingDocument | null> {
    const tracking = await this.shippingModel.findOne({ orderId }).exec();
    if (!tracking) {
      throw new BadRequestException(`Không tìm thấy thông tin vận chuyển cho đơn hàng ${orderId}`);
    }

    // Permission check: Only assigned shipper or staff/admin can update
    if (performedBy) {
      const isAdmin = performedBy.role === 'admin' || performedBy.role === 'branch_manager';
      const isAssignedShipper = tracking.shipperId.toString() === performedBy.id;
      const isStaff = performedBy.role === 'employee' || performedBy.role === 'staff';

      if (!isAdmin && !isAssignedShipper && !isStaff) {
        throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái giao hàng cho đơn hàng này');
      }

      // For shipper/staff: must be assigned to this order
      if ((performedBy.role === 'shipper' || performedBy.role === 'staff') && !isAssignedShipper) {
        throw new ForbiddenException('Chỉ shipper được phân công mới có thể cập nhật trạng thái');
      }
    }

    const oldStatus = tracking.status;
    const newStatus = updateDto.status || oldStatus;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'assigned': ['picked_up'],
      'picked_up': ['in_transit'],
      'in_transit': ['out_for_delivery'],
      'out_for_delivery': ['delivered', 'delivery_failed'],
      'delivery_failed': ['out_for_delivery', 'returned'],
      'delivered': [], // Final state
      'returned': [], // Final state
    };

    if (oldStatus !== newStatus) {
      const allowedNextStatuses = validTransitions[oldStatus] || [];
      if (!allowedNextStatuses.includes(newStatus)) {
        throw new BadRequestException(
          `Không thể chuyển từ trạng thái "${oldStatus}" sang "${newStatus}". Trạng thái hợp lệ: ${allowedNextStatuses.join(', ')}`
        );
      }
    }

    // Validation rules for specific statuses
    if (newStatus === 'delivered') {
      // Require at least one proof of delivery
      const hasProof = 
        (updateDto.proofOfDeliveryImages && updateDto.proofOfDeliveryImages.length > 0) ||
        updateDto.proofOfDeliveryImage ||
        updateDto.customerSignature;
      
      if (!hasProof) {
        throw new BadRequestException('Bắt buộc phải có ít nhất một bằng chứng giao hàng (ảnh/chữ ký) khi chuyển sang trạng thái DELIVERED');
      }
    }

    if (newStatus === 'delivery_failed') {
      // Require delivery failed reason
      if (!updateDto.deliveryFailedReason || updateDto.deliveryFailedReason.trim() === '') {
        throw new BadRequestException('Bắt buộc phải có lý do khi chuyển sang trạng thái DELIVERY_FAILED');
      }
    }

    // Add to tracking history
    const historyEntry = {
      status: updateDto.status || tracking.status,
      location: updateDto.currentLocation || tracking.currentLocation,
      note: updateDto.deliveryNote,
      timestamp: new Date(),
    };

    tracking.trackingHistory.push(historyEntry);

    // Update current status and other fields
    if (updateDto.status) tracking.status = updateDto.status as any;
    if (updateDto.currentLocation !== undefined) tracking.currentLocation = updateDto.currentLocation;
    
    // Handle proof of delivery images (support both single and multiple)
    if (updateDto.proofOfDeliveryImages && updateDto.proofOfDeliveryImages.length > 0) {
      tracking.proofOfDeliveryImages = [
        ...(tracking.proofOfDeliveryImages || []),
        ...updateDto.proofOfDeliveryImages,
      ];
    } else if (updateDto.proofOfDeliveryImage) {
      // Backward compatibility: single image
      if (!tracking.proofOfDeliveryImages) {
        tracking.proofOfDeliveryImages = [];
      }
      if (!tracking.proofOfDeliveryImages.includes(updateDto.proofOfDeliveryImage)) {
        tracking.proofOfDeliveryImages.push(updateDto.proofOfDeliveryImage);
      }
    }
    
    if (updateDto.customerSignature) tracking.customerSignature = updateDto.customerSignature;
    if (updateDto.deliveryNote) tracking.deliveryNote = updateDto.deliveryNote;
    if (updateDto.estimatedDelivery) tracking.estimatedDelivery = new Date(updateDto.estimatedDelivery);
    
    // Handle delivery failed reason and proofs
    if (updateDto.deliveryFailedReason) {
      tracking.deliveryFailedReason = updateDto.deliveryFailedReason;
    }
    if (updateDto.deliveryFailedProofs && updateDto.deliveryFailedProofs.length > 0) {
      tracking.deliveryFailedProofs = [
        ...(tracking.deliveryFailedProofs || []),
        ...updateDto.deliveryFailedProofs,
      ];
    }

    const savedTracking = await tracking.save();

    // Map shipping status to order status and update order
    if (newStatus !== oldStatus) {
      const orderStatusMap: Record<string, string> = {
        'out_for_delivery': 'OUT_FOR_DELIVERY',
        'delivered': 'DELIVERED',
        'delivery_failed': 'DELIVERY_FAILED',
        'returned': 'RETURNED',
      };

      const mappedOrderStatus = orderStatusMap[newStatus];
      if (mappedOrderStatus) {
        try {
          await firstValueFrom(
            this.httpService.put(
              `${this.ORDER_SERVICE_URL}/api/orders/${orderId}/status`,
              { status: mappedOrderStatus },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            ),
          );
          this.logger.log(`Order ${orderId} status updated to ${mappedOrderStatus}`);
        } catch (error: any) {
          this.logger.error(`Failed to update order status for ${orderId}: ${error.message}`, error);
        }
      }
    }

    // Create audit log via order service
    if (performedBy) {
      try {
        const statusLabels: Record<string, string> = {
          assigned: 'Đã phân công',
          picked_up: 'Đã lấy hàng',
          in_transit: 'Đang vận chuyển',
          out_for_delivery: 'Đang giao hàng',
          delivered: 'Đã giao',
          delivery_failed: 'Giao hàng thất bại',
          returned: 'Đã trả hàng',
        };

        const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
        if (newStatus !== oldStatus) {
          changes.push({
            field: 'delivery_status',
            oldValue: statusLabels[oldStatus] || oldStatus,
            newValue: statusLabels[newStatus] || newStatus,
          });
        }

        // Determine action type
        let action = 'DELIVERY_STATUS_UPDATE';
        let description = `Trạng thái giao hàng đã được cập nhật từ "${statusLabels[oldStatus] || oldStatus}" sang "${statusLabels[newStatus] || newStatus}"`;
        
        if (updateDto.proofOfDeliveryImages?.length || updateDto.proofOfDeliveryImage) {
          action = 'PROOF_OF_DELIVERY_UPLOAD';
          description = 'Đã upload bằng chứng giao hàng';
        } else if (updateDto.deliveryFailedReason) {
          action = 'DELIVERY_FAILED';
          description = `Giao hàng thất bại: ${updateDto.deliveryFailedReason}`;
        }

        const metadata: Record<string, any> = {
          deliveryNote: updateDto.deliveryNote,
          location: updateDto.currentLocation,
          source: performedBy.role === 'shipper' ? 'mobile' : 'web', // Detect source from role (can be enhanced)
        };

        if (updateDto.proofOfDeliveryImages?.length) {
          metadata.proofImages = updateDto.proofOfDeliveryImages;
        } else if (updateDto.proofOfDeliveryImage) {
          metadata.proofImage = updateDto.proofOfDeliveryImage;
        }

        if (updateDto.deliveryFailedReason) {
          metadata.deliveryFailedReason = updateDto.deliveryFailedReason;
        }

        if (updateDto.deliveryFailedProofs?.length) {
          metadata.deliveryFailedProofs = updateDto.deliveryFailedProofs;
        }

        await firstValueFrom(
          this.httpService.post(
            `${this.ORDER_SERVICE_URL}/api/orders/${orderId}/audit-logs`,
            {
              orderId,
              action,
              performedBy: {
                id: performedBy.id,
                name: performedBy.name,
                role: performedBy.role || 'shipper',
              },
              changes: changes.length > 0 ? changes : undefined,
              metadata,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        
        this.logger.log(`Created audit log for order ${orderId}: ${action}`);
      } catch (error: any) {
        this.logger.warn(`Failed to create audit log for order ${orderId}: ${error.message}`, error);
      }
    }

    return savedTracking;
  }
}
