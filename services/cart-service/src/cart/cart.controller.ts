import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { SyncCartDto, AddToCartDto } from './dtos/cart.dto';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy giỏ hàng của tôi' })
  async getCart(@CurrentUser('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Đồng bộ giỏ hàng' })
  async syncCart(@CurrentUser('userId') userId: string, @Body() syncDto: SyncCartDto) {
    return this.cartService.syncCart(userId, syncDto);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  async addToCart(@CurrentUser('userId') userId: string, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Delete('item/:productId')
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi giỏ hàng' })
  async removeFromCart(
    @CurrentUser('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeFromCart(userId, productId);
  }

  @Put('item/:productId')
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng' })
  async updateQuantity(
    @CurrentUser('userId') userId: string,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(userId, productId, body.quantity);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa toàn bộ giỏ hàng' })
  async clearCart(@CurrentUser('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}

