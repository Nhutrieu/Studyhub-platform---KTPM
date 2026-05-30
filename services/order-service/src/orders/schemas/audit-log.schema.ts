import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Order' })
  orderId!: string;

  @Prop({ required: true })
  action!: string; // 'status_update', 'delivery_update', 'proof_upload', 'order_created', 'order_cancelled'

  @Prop({ required: true })
  description!: string;

  @Prop({
    type: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String },
    },
    required: true,
  })
  performedBy!: {
    id: string;
    name: string;
    role?: string;
  };

  @Prop({
    type: [{
      field: { type: String, required: true },
      oldValue: { type: String, required: true },
      newValue: { type: String, required: true },
    }],
    default: [],
  })
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata?: Record<string, any>; // For storing proof images, notes, etc.
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index for faster queries
AuditLogSchema.index({ orderId: 1, createdAt: -1 });

