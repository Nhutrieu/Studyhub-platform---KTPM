import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  productId!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  branchId?: string; // Branch where product is available

  @Prop()
  price?: number; // Snapshot price at time of adding

  @Prop()
  productName?: string; // Snapshot for display
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true })
  userId!: string;

  @Prop({ type: [CartItem], default: [] })
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);

// Index for faster queries
CartSchema.index({ userId: 1 });

