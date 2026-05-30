import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  address!: {
    street: string;
    ward: string;
    district: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @Prop({ required: true })
  phone!: string;

  @Prop()
  email?: string;

  @Prop({ type: String, ref: 'User' })
  managerId?: string;

  @Prop({ enum: ['pending', 'approved', 'rejected', 'active', 'inactive'], default: 'pending' })
  status!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  registrationData?: {
    businessLicense?: string;
    taxCode?: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    documents?: string[];
  };

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedReason?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  totalOrders!: number;

  @Prop({ default: 0 })
  totalRevenue!: number;
  
  // 8: Soft delete
  @Prop()
  deletedAt?: Date;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
BranchSchema.index({ 'address.city': 1, 'address.district': 1 });
BranchSchema.index({ status: 1, isActive: 1 });
BranchSchema.index({ managerId: 1 });

