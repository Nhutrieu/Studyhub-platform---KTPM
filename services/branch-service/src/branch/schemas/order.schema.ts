import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  branchId!: string;

  @Prop({ required: true })
  totalPrice!: number;

  @Prop({ default: false })
  isPaid!: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
