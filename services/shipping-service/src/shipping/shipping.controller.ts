import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ShippingService } from './shipping.service';
import { UpdateShippingDto } from './dtos/shipping.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Shipping')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Lấy thông tin vận chuyển của đơn' })
  async getByOrderId(@Param('orderId') orderId: string) {
    return this.shippingService.findByOrderId(orderId);
  }

  @Get('my-deliveries')
  @Roles(Role.SHIPPER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy danh sách giao hàng của tôi (Shipper)' })
  async getMyDeliveries(@CurrentUser('userId') userId: string) {
    return this.shippingService.findByShipperId(userId);
  }

  @Put('order/:orderId/update')
  @Roles(Role.SHIPPER, Role.EMPLOYEE, Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái vận chuyển (chỉ shipper được assign)' })
  async updateStatus(
    @Param('orderId') orderId: string,
    @Body() updateDto: UpdateShippingDto,
    @CurrentUser() user: any,
  ) {
    const performedBy = {
      id: user.userId || user.id,
      name: user.name || user.username || 'Shipper',
      role: user.role || 'shipper',
    };
    return this.shippingService.updateStatus(orderId, updateDto, performedBy);
  }

  @Get('history')
  @Roles(Role.SHIPPER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy lịch sử giao hàng (Shipper)' })
  async getDeliveryHistory(@CurrentUser('userId') userId: string) {
    return this.shippingService.findByShipperId(userId);
  }
}
