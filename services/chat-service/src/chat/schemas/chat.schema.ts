import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;
export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ _id: false, timestamps: true })
export class ChatMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  senderId!: string;

  @Prop({ required: true })
  senderName!: string;

  @Prop({ required: true })
  senderRole!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({ default: Date.now })
  sentAt!: Date;
}

@Schema({ timestamps: true })
export class Chat {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  customerId!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  employeeId?: string; // Nhân viên đang xử lý

  @Prop({ type: [ChatMessage], default: [] })
  messages!: ChatMessage[];

  @Prop({ default: 'open', enum: ['open', 'closed', 'pending'] })
  status!: string; // open, closed, pending

  @Prop()
  subject?: string; // Chủ đề chat

  @Prop({ default: Date.now })
  lastMessageAt!: Date;

  @Prop({ default: false })
  isReadByEmployee!: boolean;

  @Prop({ default: false })
  isReadByCustomer!: boolean;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
ChatSchema.index({ customerId: 1, status: 1 });
ChatSchema.index({ employeeId: 1 });
ChatSchema.index({ lastMessageAt: -1 });

