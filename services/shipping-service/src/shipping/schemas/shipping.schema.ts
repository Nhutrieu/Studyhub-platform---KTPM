import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ShippingTrackingDocument = HydratedDocument<ShippingTracking>;

@Schema({ timestamps: true })
export class ShippingTracking {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  orderId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  shipperId!: string;

  // Standardized shipping status aligned with order status
  @Prop({ 
    default: 'assigned', 
    enum: ['assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'delivery_failed', 'returned'],
    uppercase: false 
  })
  status!: string;

  @Prop()
  currentLocation?: string;

  @Prop()
  estimatedDelivery?: Date;

  // Multiple proof of delivery (images, signatures, etc.)
  @Prop({ type: [String], default: [] })
  proofOfDeliveryImages!: string[];

  @Prop()
  customerSignature?: string;

  @Prop()
  deliveryNote?: string;

  // Delivery failed reason (required when status is delivery_failed)
  @Prop()
  deliveryFailedReason?: string;

  // Proof for delivery failure (optional)
  @Prop({ type: [String], default: [] })
  deliveryFailedProofs!: string[];

  @Prop({ type: Array, default: [] })
  trackingHistory!: Array<{
    status: string;
    location?: string;
    note?: string;
    timestamp: Date;
  }>;
}

export const ShippingTrackingSchema = SchemaFactory.createForClass(ShippingTracking);
