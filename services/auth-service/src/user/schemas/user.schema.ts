import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  phone?: string;

  @Prop({ default: 'customer', enum: ['customer', 'employee', 'branch_manager', 'shipper', 'admin'] })
  role!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  branchId?: string; // Chi nhánh cho employee (seller) và shipper (delivery)

  @Prop()
  address?: string;

  @Prop({ type: [{
    name: String,
    phone: String,
    street: String,
    ward: String,
    district: String,
    city: String,
    isDefault: { type: Boolean, default: false },
  }], default: [] })
  addresses?: Array<{
    name: string;
    phone: string;
    street: string;
    ward: string;
    district: string;
    city: string;
    isDefault?: boolean;
  }>;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpiry?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

