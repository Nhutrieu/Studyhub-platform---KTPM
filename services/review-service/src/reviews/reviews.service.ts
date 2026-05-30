import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dtos/review.dto';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class ReviewsService extends BaseService<ReviewDocument> {
  protected model: Model<ReviewDocument>;

  private readonly ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3005';

  constructor(
    @InjectModel(Review.name) protected reviewModel: Model<ReviewDocument>,
    private httpService: HttpService,
  ) {
    super();
    this.model = reviewModel;
  }

  // Override create to match base signature but add custom logic
  async create(createDto: any): Promise<ReviewDocument> {
    // This method is not used, we use createReview instead
    return this.reviewModel.create(createDto);
  }

  async createReview(customerId: string, createReviewDto: CreateReviewDto): Promise<ReviewDocument> {
    // CRITICAL: Check duplicate review FIRST - this must always be checked regardless of order service availability
    // 0.5: 1 sản phẩm chỉ được review 1 lần bởi 1 customer
    // Normalize IDs to strings for consistent comparison
    const normalizedCustomerId = String(customerId || '');
    const normalizedProductId = String(createReviewDto.productId || '');
    
    if (!normalizedCustomerId || normalizedCustomerId === 'undefined' || normalizedCustomerId === 'null' || normalizedCustomerId === '') {
      throw new BadRequestException('Customer ID không hợp lệ');
    }
    
    if (!normalizedProductId || normalizedProductId === 'undefined' || normalizedProductId === 'null' || normalizedProductId === '') {
      throw new BadRequestException('Product ID không hợp lệ');
    }
    
    // Query with normalized IDs - MongoDB will handle ObjectId conversion
    // Try both normalized string format and original format to catch all cases
    const existingReview = await this.reviewModel.findOne({
      $or: [
        // Try normalized string format first (most common after our fix)
        { customerId: normalizedCustomerId, productId: normalizedProductId },
        // Also try original formats in case of existing data
        { customerId: customerId, productId: createReviewDto.productId },
        // Try mixed formats
        { customerId: normalizedCustomerId, productId: createReviewDto.productId },
        { customerId: customerId, productId: normalizedProductId },
      ],
    }).exec();

    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi. Mỗi sản phẩm chỉ được đánh giá 1 lần.');
    }

    // CUSTOMER constraint: Check if customer has purchased and order is completed
    // Check if customer has any completed order with this product
    try {
      // Use the my-orders endpoint with customerId filter (if available) or get all and filter
      const orderServiceUrl = `${this.ORDER_SERVICE_URL}/api/orders`;
      const ordersResponse = await firstValueFrom(
        this.httpService.get(orderServiceUrl, {
          params: { customerId, limit: 100 }, // Get up to 100 orders to check
        })
      );
      const orders = (ordersResponse.data as any)?.items || (ordersResponse.data as any) || [];
      
      // Filter to only this customer's orders
      const customerOrders = Array.isArray(orders) 
        ? orders.filter((order: any) => order.customerId === customerId || order.customerId?.toString() === customerId)
        : [];
      
      // 0.5: Find if customer has a DELIVERED or COMPLETED order containing this product
      const hasCompletedOrder = customerOrders.some((order: any) => {
        const orderStatus = order.status?.toUpperCase();
        // 0.5: Chỉ review nếu đơn DELIVERED hoặc COMPLETED (spec nói DELIVERED nhưng COMPLETED cũng hợp lệ)
        if (orderStatus !== 'DELIVERED' && orderStatus !== 'COMPLETED') {
          return false;
        }
        return order.items?.some((item: any) => {
          // Normalize both IDs to strings for comparison
          const itemProductId = String(item.productId?.toString() || item.productId || item.product?.id?.toString() || item.product?._id?.toString() || item.product?.id || item.product?._id || '');
          const reviewProductId = String(createReviewDto.productId?.toString() || createReviewDto.productId || '');
          return itemProductId && reviewProductId && itemProductId === reviewProductId;
        });
      });

      if (!hasCompletedOrder) {
        throw new ForbiddenException(
          'Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận được hàng'
        );
      }
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      // If order service is unavailable, log warning but allow review (graceful degradation)
      // Note: Duplicate check is already done above, so this is safe
      console.warn('Could not validate order completion for review:', error.message);
    }

    // Ensure normalized IDs when creating review for consistency
    const createdReview = await this.reviewModel.create({
      ...createReviewDto,
      productId: normalizedProductId,
      customerId: normalizedCustomerId,
    });
    
    // Log for debugging
    console.log(`[ReviewService] createReview SUCCESS: customerId=${normalizedCustomerId}, productId=${normalizedProductId}, reviewId=${createdReview._id}`);
    
    return createdReview;
  }

  async findByProductId(productId: string): Promise<ReviewDocument[]> {
    if (!productId || productId === 'undefined' || productId === 'null') {
      return [];
    }
    return this.reviewModel.find({ productId }).sort({ createdAt: -1 });
  }

  async findByCustomerId(customerId: string): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ customerId });
  }

  async update(id: string, updateData: any): Promise<ReviewDocument | null> {
    const updated = await this.reviewModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updated) {
      throw new BadRequestException('Review not found');
    }
    return updated;
  }

  async delete(id: string): Promise<ReviewDocument | null> {
    return this.reviewModel.findByIdAndDelete(id).exec();
  }

  // Get products from an order that haven't been reviewed yet
  async getUnreviewedProductsFromOrder(orderId: string, customerId: string): Promise<Array<{ productId: string; productName: string; quantity: number; image?: string }>> {
    try {
      // Get order details using internal endpoint
      const orderUrl = `${this.ORDER_SERVICE_URL}/api/orders/${orderId}/internal`;
      const orderResponse = await firstValueFrom(
        this.httpService.get(orderUrl, {
          headers: {
            'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024',
          },
        })
      );
      
      const responseData = orderResponse.data;
      const order = responseData?.data || responseData;
      
      if (!order) {
        return [];
      }

      // Check if order belongs to customer
      const orderCustomerId = order.customerId?.toString() || order.customerId;
      if (orderCustomerId !== customerId.toString()) {
        throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
      }

      // Check if order is DELIVERED or COMPLETED
      const orderStatus = order.status?.toUpperCase();
      if (orderStatus !== 'DELIVERED' && orderStatus !== 'COMPLETED') {
        return []; // Can only review delivered/completed orders
      }

      // Get all reviews by this customer
      // Normalize customerId for query to match how reviews are stored
      const normalizedCustomerId = String(customerId || '');
      const customerReviews = await this.reviewModel.find({
        $or: [
          { customerId: normalizedCustomerId },
          { customerId: customerId },
        ],
      }).exec();
      
      // Normalize all productIds to strings for consistent comparison
      const reviewedProductIds = new Set(
        customerReviews
          .map(review => {
            const pid = String(review.productId?.toString() || review.productId || '');
            return pid && pid !== 'undefined' && pid !== 'null' && pid !== '' ? pid : null;
          })
          .filter((pid): pid is string => pid !== null)
      );

      // Filter order items to only unreviewed products
      const unreviewedProducts = (order.items || [])
        .filter((item: any) => {
          // Normalize productId to string for comparison
          const productId = String(item.productId?.toString() || item.productId || item.product?.id?.toString() || item.product?._id?.toString() || item.product?.id || item.product?._id || '');
          if (!productId || productId === 'undefined' || productId === 'null' || productId === '') {
            return false; // Skip items without valid productId
          }
          // Normalize reviewedProductIds for comparison
          const normalizedReviewedIds = new Set(
            Array.from(reviewedProductIds).map(id => String(id))
          );
          return !normalizedReviewedIds.has(productId);
        })
        .map((item: any) => {
          // Normalize productId to string
          const productId = String(item.productId?.toString() || item.productId || item.product?.id?.toString() || item.product?._id?.toString() || item.product?.id || item.product?._id || '');
          return {
            productId: productId,
            productName: item.productName || item.product?.name || 'Unknown Product',
            quantity: item.quantity || 1,
            image: item.image || item.product?.images?.[0] || undefined,
          };
        });

      // Log for debugging
      console.log(`[ReviewService] getUnreviewedProductsFromOrder: orderId=${orderId}, customerId=${customerId}, orderStatus=${orderStatus}, totalItems=${order.items?.length || 0}, reviewedCount=${reviewedProductIds.size}, unreviewedCount=${unreviewedProducts.length}`);
      
      return unreviewedProducts;
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('[ReviewService] Error getting unreviewed products from order:', {
        orderId,
        customerId,
        error: error.message,
        stack: error.stack,
      });
      // Return empty array on error - frontend will treat this as "query failed" and show review button
      return [];
    }
  }
}
