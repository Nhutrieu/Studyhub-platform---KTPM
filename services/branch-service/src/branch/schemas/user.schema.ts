import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

/**
 * User schema for Branch Service
 * This is a lightweight schema used only for populating managerId references
 * The full User data is managed by User/Auth services
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  phone?: string;

  @Prop({ default: 'customer', enum: ['customer', 'employee', 'branch_manager', 'shipper', 'admin'] })
  role!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

