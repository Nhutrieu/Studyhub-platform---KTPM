import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DisputeDocument = HydratedDocument<Dispute>;

@Schema({ timestamps: true })
export class Dispute {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  orderId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  customerId!: string;

  @Prop({ required: true })
  customerName!: string;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  branchId!: string; // 0.4: Dispute phải gắn với branch_id

  @Prop({ required: true, enum: ['quality', 'damage', 'missing', 'wrong_item', 'delivery', 'payment', 'other'] })
  type!: string; // Loại tranh chấp

  @Prop({ required: true })
  reason!: string; // Lý do tranh chấp

  @Prop({ required: true })
  description!: string; // Mô tả chi tiết

  @Prop({ type: [String], default: [] })
  images!: string[]; // Hình ảnh bằng chứng

  // 0.4: Dispute status flow: OPEN → IN_PROGRESS → RESOLVED / REJECTED
  @Prop({ default: 'OPEN', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], uppercase: true })
  status!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  reviewedBy?: string; // Admin/Manager xử lý

  @Prop()
  reviewNote?: string; // Ghi chú xử lý

  @Prop()
  resolution?: string; // Giải pháp được đưa ra

  @Prop({ default: Date.now })
  resolvedAt?: Date;

  @Prop({ default: 0 })
  refundAmount!: number; // Số tiền hoàn lại (nếu có)
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
DisputeSchema.index({ orderId: 1 });
DisputeSchema.index({ customerId: 1 });
DisputeSchema.index({ status: 1 });
DisputeSchema.index({ createdAt: -1 });

