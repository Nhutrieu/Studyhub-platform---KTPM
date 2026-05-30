import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type WarehouseDocument = HydratedDocument<Warehouse>;
export type WarehouseTransactionDocument = HydratedDocument<WarehouseTransaction>;

@Schema({ _id: false, timestamps: true })
export class WarehouseTransaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  productId!: string;

  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true })
  quantity!: number; // Positive for import, negative for export

  @Prop({ required: true, enum: ['import', 'export', 'adjustment', 'damaged', 'returned'] })
  type!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  orderId?: string; // If related to order

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId!: string; // Who made the transaction

  @Prop()
  note?: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

@Schema({ timestamps: true })
export class Warehouse {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  productId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  branchId?: string; // Branch ID - optional for backward compatibility, but should be set for branch inventory

  @Prop({ required: true })
  productName!: string;

  @Prop({ required: true, default: 0 })
  quantity!: number; // Số lượng tồn kho hiện tại

  @Prop({ default: 0 })
  reservedQuantity!: number; // Số lượng đã được đặt hàng nhưng chưa ship

  @Prop({ default: 0 })
  availableQuantity!: number; // quantity - reservedQuantity

  @Prop({ type: [WarehouseTransaction], default: [] })
  transactions!: WarehouseTransaction[]; // Lịch sử nhập/xuất

  @Prop({ default: 10 })
  minStockLevel!: number; // Mức tồn kho tối thiểu để cảnh báo

  @Prop({ default: 100 })
  maxStockLevel!: number; // Mức tồn kho tối đa

  @Prop()
  location?: string; // Vị trí kho (nếu có nhiều kho)

  @Prop({ default: true })
  isActive!: boolean;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

// Pre-save hook: Ensure availableQuantity is always calculated correctly
WarehouseSchema.pre('save', function(next) {
  // Recalculate availableQuantity to ensure consistency
  this.availableQuantity = Math.max(0, this.quantity - this.reservedQuantity);
  
  // Ensure reservedQuantity doesn't exceed quantity
  if (this.reservedQuantity > this.quantity) {
    this.reservedQuantity = this.quantity;
    this.availableQuantity = 0;
  }
  
  // Ensure availableQuantity is never negative
  if (this.availableQuantity < 0) {
    this.availableQuantity = 0;
  }
  
  next();
});

// Compound unique index: productId + branchId (allows same product in different branches)
WarehouseSchema.index({ productId: 1, branchId: 1 }, { unique: true, sparse: true });
// Index for branch filtering
WarehouseSchema.index({ branchId: 1 });
WarehouseSchema.index({ availableQuantity: 1 });

