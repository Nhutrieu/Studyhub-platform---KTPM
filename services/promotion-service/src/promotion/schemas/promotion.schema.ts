import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromotionDocument = Promotion & Document;

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'] })
  type!: string;

  @Prop({ required: true })
  value!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: [String], default: [] })
  applicableProducts!: string[];

  @Prop({ type: [String], default: [] })
  applicableCategories!: string[];

  @Prop()
  minPurchaseAmount?: number;

  @Prop()
  maxDiscountAmount?: number;

  @Prop()
  usageLimit?: number;

  @Prop({ default: 0 })
  usageCount!: number;

  @Prop({ type: [String], default: [] })
  usedBy!: string[];

  @Prop()
  code?: string;

  @Prop({ default: false })
  isCodeRequired!: boolean;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

