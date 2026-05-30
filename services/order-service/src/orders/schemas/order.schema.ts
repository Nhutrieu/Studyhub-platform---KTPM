import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  productId!: string;

  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  price!: number;

  @Prop({ default: 0 })
  discount!: number;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  customerId!: string;

  @Prop({ type: [OrderItem], required: true })
  items!: OrderItem[];

  @Prop({ required: true })
  totalPrice!: number;

  @Prop({ default: 0 })
  totalDiscount!: number;

  @Prop({ required: true })
  shippingAddress!: string;

  @Prop({ required: true })
  phone!: string;

  // Standardized order status flow (0.2): 
  // PENDING_CONFIRMATION → CONFIRMED → PACKING → READY_TO_SHIP → SHIPPING → DELIVERED → COMPLETED
  // Error branch: CANCELLED, FAILED_DELIVERY, RETURNING, RETURNED
  @Prop({ 
    default: 'PENDING_CONFIRMATION', 
    enum: [
      'PENDING_CONFIRMATION', 'CONFIRMED', 'PACKING', 'READY_TO_SHIP', 
      'SHIPPING', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'FAILED_DELIVERY', 'RETURNING', 'RETURNED'
    ],
    uppercase: true 
  })
  status!: string;

  @Prop({ default: 'cod', enum: ['cod', 'stripe', 'momo', 'vnpay', 'wallet'] })
  paymentMethod!: string;

  // Payment status (0.3): UNPAID, PAID, REFUND_PENDING, REFUNDED, FAILED
  @Prop({ 
    default: 'UNPAID',
    enum: ['UNPAID', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED'],
    uppercase: true
  })
  paymentStatus!: string;

  @Prop({ default: false })
  isPaid!: boolean; // Legacy field, use paymentStatus instead

  @Prop()
  notes?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  shipperId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  branchId!: string; // Chi nhánh xử lý đơn hàng - BẮT BUỘC (0.1)
  
  @Prop({ type: MongooseSchema.Types.ObjectId })
  assignedEmployeeId?: string; // Employee được phân công xử lý đơn

  @Prop()
  trackingNumber?: string;

  @Prop({ default: Date.now })
  confirmedAt?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelReason?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  promotionId?: string;

  @Prop()
  promotionCode?: string;
  
  // Delivery confirmation (for SHIPPER - 6)
  @Prop()
  deliveryConfirmation?: string; // OTP, signature, photo URL, etc.
  
  @Prop()
  deliveryNotes?: string; // Notes from shipper
  
  @Prop()
  deliveryProof?: string; // Photo/signature proof URL
}

export const OrderSchema = SchemaFactory.createForClass(Order);
