import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ default: 'customer', enum: ['customer', 'employee', 'branch_manager', 'shipper', 'admin'] })
  role!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

