import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto, UpdatePromotionDto, ApplyPromotionDto } from './dtos/promotion.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/roles.decorator';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Tạo chương trình khuyến mãi mới (Admin/Manager)' })
  async create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionService.create(createPromotionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chương trình khuyến mãi' })
  async findAll(@Query() filters: any) {
    return this.promotionService.findAll(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Lấy danh sách chương trình khuyến mãi đang hoạt động' })
  async findActive(@Query() filters: any) {
    return this.promotionService.findAll({ ...filters, activeOnly: 'true' });
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Lấy chương trình khuyến mãi theo mã' })
  async findByCode(@Param('code') code: string) {
    return this.promotionService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết chương trình khuyến mãi' })
  async findById(@Param('id') id: string) {
    return this.promotionService.findById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Cập nhật chương trình khuyến mãi (Admin/Manager)' })
  async update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto) {
    return this.promotionService.update(id, updatePromotionDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa chương trình khuyến mãi (Admin)' })
  async delete(@Param('id') id: string) {
    await this.promotionService.delete(id);
    return { message: 'Promotion deleted successfully' };
  }

  @Post('apply')
  @ApiOperation({ summary: 'Áp dụng chương trình khuyến mãi' })
  async applyPromotion(
    @Req() req: Request,
    @Body() applyDto: ApplyPromotionDto,
  ) {
    // Extract userId from request.user if authenticated, otherwise use empty string
    const userId = (req as any).user?.userId || '';
    const result = await this.promotionService.applyPromotion(userId, applyDto);
    // Don't mark as used here - will be marked when order is created successfully
    // This prevents reducing quantity if user applies but doesn't complete order
    return result;
  }

  @Post('internal/:id/use')
  @Public()
  @ApiOperation({ summary: 'Đánh dấu promotion đã được sử dụng (Internal service call - không cần auth)' })
  async usePromotionInternal(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    if (!body.userId) {
      throw new BadRequestException('User ID is required');
    }
    console.log(`📝 Received request to update promotion ${id} usage for user ${body.userId}`);
    try {
      await this.promotionService.usePromotion(id, body.userId);
      console.log(`✅ Successfully updated promotion ${id} usage for user ${body.userId}`);
      return { message: 'Promotion usage updated successfully' };
    } catch (error: any) {
      console.error(`❌ Failed to update promotion ${id} usage for user ${body.userId}:`, error.message);
      throw error;
    }
  }
}

