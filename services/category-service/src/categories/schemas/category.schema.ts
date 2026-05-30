import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  slug!: string; // URL-friendly name

  @Prop()
  description?: string;

  @Prop()
  image?: string;

  @Prop({ type: String })
  parentId?: string; // For subcategories

  @Prop({ default: 0 })
  sortOrder!: number; // For ordering in UI

  @Prop({ default: true })
  isActive!: boolean;
  
  // 8: Soft delete
  @Prop()
  deletedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentId: 1 });

