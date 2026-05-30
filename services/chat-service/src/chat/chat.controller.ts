import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChatService } from './chat.service';
import { CreateChatDto, SendMessageDto, UpdateChatStatusDto } from './dtos/chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc trò chuyện (Customer)' })
  async createOrGetChat(@Request() req: any, @Body() createChatDto?: CreateChatDto) {
    return this.chatService.createOrGetChat(req.user.userId, req.user.name, createChatDto);
  }

  @Post(':chatId/message')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Gửi tin nhắn' })
  async sendMessage(
    @Param('chatId') chatId: string,
    @Request() req: any,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      chatId,
      req.user.userId,
      req.user.name,
      req.user.role,
      sendMessageDto,
    );
  }

  @Get('my-chats')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy danh sách chat của tôi' })
  async getMyChats(@Request() req: any) {
    if (req.user.role === 'customer') {
      return this.chatService.getChatsByCustomer(req.user.userId);
    } else {
      return this.chatService.getOpenChats(req.user.userId);
    }
  }

  @Get('open')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Lấy danh sách chat mở (Employee/Admin/Manager)' })
  async getOpenChats(@Request() req: any) {
    // Admin sees all unassigned chats
    if (req.user.role === 'admin') {
      return this.chatService.getOpenChats(undefined);
    }
    // Manager and Employee see chats assigned to them or unassigned
    // This allows them to see chats they've assigned to themselves
    return this.chatService.getOpenChats(req.user.userId);
  }

  @Get(':chatId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy chi tiết cuộc trò chuyện' })
  async getChatById(@Param('chatId') chatId: string) {
    return this.chatService.getChatById(chatId);
  }

  @Put(':chatId/assign')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Phân công chat cho nhân viên hoặc manager' })
  async assignToEmployee(@Param('chatId') chatId: string, @Request() req: any) {
    return this.chatService.assignToEmployee(chatId, req.user.userId);
  }

  @Put(':chatId/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN, Role.CUSTOMER, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Cập nhật trạng thái chat' })
  async updateStatus(
    @Param('chatId') chatId: string,
    @Body() updateStatusDto: UpdateChatStatusDto,
    @Request() req: any,
  ) {
    // Customer can only close their own chats
    if (req.user.role === 'customer') {
      const chat = await this.chatService.getChatById(chatId);
      if (!chat) {
        throw new NotFoundException('Cuộc trò chuyện không tồn tại');
      }
      if (chat.customerId.toString() !== req.user.userId) {
        throw new ForbiddenException('Bạn chỉ có thể đóng chat của chính mình');
      }
      // Customer can only close, not open or assign
      if (updateStatusDto.status !== 'closed') {
        throw new BadRequestException('Khách hàng chỉ có thể đóng chat');
      }
    }
    return this.chatService.updateStatus(chatId, updateStatusDto);
  }

  @Put(':chatId/read')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Đánh dấu đã đọc' })
  async markAsRead(@Param('chatId') chatId: string, @Request() req: any) {
    return this.chatService.markAsRead(chatId, req.user.role === 'customer' ? 'customer' : 'employee');
  }

  @Delete(':chatId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @ApiOperation({ summary: 'Xóa cuộc trò chuyện (Admin/Customer)' })
  async deleteChat(@Param('chatId') chatId: string, @Request() req: any) {
    // Customer can only delete their own chats
    if (req.user.role === 'customer') {
      const chat = await this.chatService.getChatById(chatId);
      if (!chat) {
        throw new NotFoundException('Cuộc trò chuyện không tồn tại');
      }
      if (chat.customerId.toString() !== req.user.userId) {
        throw new ForbiddenException('Bạn chỉ có thể xóa chat của chính mình');
      }
    }
    await this.chatService.deleteChat(chatId);
    return { message: 'Đã xóa cuộc trò chuyện' };
  }
}

