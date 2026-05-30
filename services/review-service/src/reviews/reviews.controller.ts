import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dtos/review.dto';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Tạo đánh giá mới' })
  async create(@CurrentUser('userId') userId: string, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(userId, createReviewDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Lấy tất cả đánh giá của sản phẩm' })
  async findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProductId(productId);
  }

  @Get('my-reviews')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy đánh giá của tôi' })
  async getMyReviews(@CurrentUser('userId') userId: string) {
    return this.reviewsService.findByCustomerId(userId);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cập nhật đánh giá' })
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.reviewsService.update(id, updateData);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Xóa đánh giá' })
  async delete(@Param('id') id: string) {
    return this.reviewsService.delete(id);
  }

  @Get('order/:orderId/unreviewed')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm chưa được đánh giá từ đơn hàng' })
  async getUnreviewedProductsFromOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reviewsService.getUnreviewedProductsFromOrder(orderId, userId);
  }
}
