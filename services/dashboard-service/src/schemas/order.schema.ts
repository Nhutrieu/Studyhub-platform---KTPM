import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  customerId!: string;

  @Prop({ required: true })
  totalPrice!: number;

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  branchId?: string;

  @Prop({ default: 'pending', enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'] })
  status!: string;

  @Prop()
  createdAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

