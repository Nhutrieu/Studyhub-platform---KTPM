import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ default: 0 })
  stock!: number;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop()
  model3d?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Category' })
  categoryId!: string;

  @Prop({ required: true })
  category!: string; // Keep for backward compatibility and easier querying

  @Prop({ type: [String], default: [] })
  materials!: string[]; // e.g., ['Gỗ', 'Da', 'Kim loại']

  @Prop({ type: [String], default: [] })
  colors!: string[]; // e.g., ['Đen', 'Trắng', 'Xám']

  @Prop({ type: Object, default: {} })
  dimensions!: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: string; // 'cm', 'm', 'kg'
  };

  @Prop({ default: 0 })
  rating!: number;

  @Prop({ default: 0 })
  reviewCount!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isFeatured!: boolean; // Sản phẩm nổi bật
  
  // 8: Soft delete - không được xóa đơn hàng đã phát sinh
  @Prop()
  deletedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isFeatured: 1 });
