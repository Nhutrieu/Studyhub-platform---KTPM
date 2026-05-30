import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument, ChatMessage } from './schemas/chat.schema';
import { CreateChatDto, SendMessageDto, UpdateChatStatusDto } from './dtos/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
  ) {}

  async createOrGetChat(customerId: string, customerName: string, createChatDto?: CreateChatDto): Promise<ChatDocument> {
    let chat = await this.chatModel.findOne({ customerId, status: { $ne: 'closed' } }).exec();
    
    if (!chat) {
      chat = await this.chatModel.create({
        customerId,
        customerName,
        subject: createChatDto?.subject,
        messages: [],
        status: 'open',
      });
    }
    
    return chat;
  }

  async sendMessage(chatId: string, senderId: string, senderName: string, senderRole: string, sendMessageDto: SendMessageDto): Promise<ChatDocument> {
    const chat = await this.chatModel.findById(chatId).exec();
    if (!chat) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    const message: ChatMessage = {
      senderId,
      senderName,
      senderRole,
      message: sendMessageDto.message,
      images: sendMessageDto.images || [],
      isRead: false,
      sentAt: new Date(),
    };

    chat.messages.push(message);
    chat.lastMessageAt = new Date();

    if (senderRole === 'customer') {
      chat.isReadByEmployee = false;
      chat.isReadByCustomer = true;
    } else {
      chat.isReadByEmployee = true;
      chat.isReadByCustomer = false;
    }

    return chat.save();
  }

  async getChatById(chatId: string): Promise<ChatDocument> {
    const chat = await this.chatModel.findById(chatId).exec();
    if (!chat) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }
    return chat;
  }

  async getChatsByCustomer(customerId: string): Promise<ChatDocument[]> {
    return this.chatModel.find({ customerId }).sort({ lastMessageAt: -1 }).exec();
  }

  async getOpenChats(employeeId?: string): Promise<ChatDocument[]> {
    const query: any = { status: { $ne: 'closed' } };
    if (employeeId) {
      query.$or = [{ employeeId }, { employeeId: { $exists: false } }];
    } else {
      query.employeeId = { $exists: false };
    }
    return this.chatModel.find(query).sort({ lastMessageAt: -1 }).exec();
  }

  async assignToEmployee(chatId: string, employeeId: string): Promise<ChatDocument> {
    const chat = await this.getChatById(chatId);
    chat.employeeId = employeeId;
    // Keep status as 'open' to ensure chat remains visible after assignment
    // Only change to 'pending' if status was already something else
    if (chat.status === 'open' || !chat.status) {
      chat.status = 'open'; // Keep as open so it remains in openChats list
    } else if (chat.status !== 'closed') {
      chat.status = 'pending';
    }
    return chat.save();
  }

  async updateStatus(chatId: string, updateStatusDto: UpdateChatStatusDto): Promise<ChatDocument> {
    const chat = await this.getChatById(chatId);
    chat.status = updateStatusDto.status as any;
    if (updateStatusDto.employeeId) {
      chat.employeeId = updateStatusDto.employeeId as any;
    }
    return chat.save();
  }

  async markAsRead(chatId: string, role: 'customer' | 'employee'): Promise<ChatDocument> {
    const chat = await this.getChatById(chatId);
    if (role === 'customer') {
      chat.isReadByCustomer = true;
    } else {
      chat.isReadByEmployee = true;
    }
    return chat.save();
  }

  async deleteChat(chatId: string): Promise<void> {
    const chat = await this.getChatById(chatId);
    await this.chatModel.findByIdAndDelete(chatId).exec();
  }
}

