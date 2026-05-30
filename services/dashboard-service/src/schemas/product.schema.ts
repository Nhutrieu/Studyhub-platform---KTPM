import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  rating!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

