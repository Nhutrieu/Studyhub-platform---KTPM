import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Query, BadRequestException, Headers } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { AuditLogService } from './audit-log.service';
import { CreateOrderDto, UpdateOrderStatusDto, UpdatePaymentStatusDto, UpdateOrderItemQuantityDto } from './dtos/order.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private auditLogService: AuditLogService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Tạo đơn hàng mới' })
  async create(@CurrentUser('userId') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get('my-orders')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy đơn hàng của tôi' })
  async getMyOrders(@CurrentUser('userId') userId: string) {
    return this.ordersService.findByCustomerId(userId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER)
  @ApiOperation({ summary: 'Lấy tất cả đơn hàng (có lọc theo role)' })
  async findAll(@Query() filters: any, @CurrentUser() user: any) {
    // Validate user
    if (!user) {
      throw new BadRequestException('User information not found');
    }
    
    // Validate branchId for roles that require it
    if ((user.role === 'employee' || user.role === 'shipper' || user.role === 'branch_manager') && !user.branchId) {
      throw new BadRequestException(
        `${user.role === 'employee' ? 'Nhân viên' : user.role === 'shipper' ? 'Shipper' : 'Manager'} phải được gán cho một chi nhánh. Vui lòng liên hệ admin để được gán chi nhánh.`
      );
    }
    
    try {
      // Role-based filtering is handled in service
      // Pass userId for employee/shipper assignment filtering
      return await this.ordersService.findAll(filters, user?.role, user?.branchId, user?.userId);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Không thể lấy danh sách đơn hàng');
    }
  }

  @Get('for-shipper')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SHIPPER)
  @ApiOperation({ summary: 'Lấy đơn hàng cho shipper (của chi nhánh mình)' })
  async findOrdersForShipper(@CurrentUser('userId') userId: string, @CurrentUser() user: any) {
    // Validate userId
    if (!userId) {
      throw new BadRequestException('User ID không hợp lệ');
    }
    
    // Validate branchId
    const branchId = user?.branchId;
    if (!branchId) {
      throw new BadRequestException('Shipper phải được gán cho một chi nhánh. Vui lòng liên hệ admin để được gán chi nhánh.');
    }
    
    try {
      const orders = await this.ordersService.findOrdersForShipper(branchId, userId);
      return orders || [];
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Không thể lấy danh sách đơn hàng');
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get(':id/internal')
  @ApiExcludeEndpoint() // Hide from Swagger - internal endpoint
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng (Internal - Service-to-Service)' })
  async findByIdInternal(
    @Param('id') id: string,
    @Headers('x-internal-secret') secret: string,
  ) {
    // Verify internal secret (for service-to-service calls)
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
    
    if (!secret || secret !== expectedSecret) {
      console.error('[OrderService] Invalid internal secret:', {
        received: secret ? 'SET' : 'NOT SET',
        expected: expectedSecret ? 'SET' : 'NOT SET',
        match: secret === expectedSecret,
      });
      throw new BadRequestException('Unauthorized: Invalid internal secret');
    }

    console.log(`[OrderService] Internal request for order ${id}`);
    const order = await this.ordersService.findById(id);
    console.log(`[OrderService] Order found:`, {
      id: order._id?.toString(),
      customerId: order.customerId?.toString(),
      status: order.status,
      branchId: order.branchId?.toString(),
    });
    return order;
  }

  @Put(':id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE, Role.SHIPPER)
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    // Verify order belongs to user's branch (for staff roles)
    if (user?.role !== 'admin') {
      const order = await this.ordersService.findById(id);
      if (order.branchId?.toString() !== user?.branchId) {
        throw new BadRequestException('Bạn không có quyền cập nhật đơn hàng này');
      }
    }
    
    const performedBy = {
      id: user.userId || user.id,
      name: user.name || user.username || 'System',
      role: user.role,
    };
    return this.ordersService.updateStatus(id, updateDto, performedBy);
  }

  @Put(':id/assign-shipper')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Phân công shipper' })
  async assignShipper(@Param('id') orderId: string, @Body() body: any, @CurrentUser() user: any) {
    // Verify order belongs to user's branch (for branch_manager and employee)
    if (user?.role === 'branch_manager' || user?.role === 'employee') {
      const order = await this.ordersService.findById(orderId);
      if (order.branchId?.toString() !== user?.branchId) {
        throw new BadRequestException('Bạn chỉ có thể phân công shipper cho đơn hàng của chi nhánh mình');
      }
    }
    
    const performedBy = {
      id: user.userId || user.id,
      name: user.name || user.username || 'System',
      role: user.role,
    };
    return this.ordersService.assignShipper(orderId, body.shipperId, performedBy);
  }

  @Put(':id/assign-employee')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Phân công nhân viên' })
  async assignEmployee(@Param('id') orderId: string, @Body() body: any, @CurrentUser() user: any) {
    // Verify order belongs to user's branch (for branch_manager)
    if (user?.role === 'branch_manager') {
      const order = await this.ordersService.findById(orderId);
      if (order.branchId?.toString() !== user?.branchId) {
        throw new BadRequestException('Bạn chỉ có thể phân công nhân viên cho đơn hàng của chi nhánh mình');
      }
    }
    
    const performedBy = {
      id: user.userId || user.id,
      name: user.name || user.username || 'System',
      role: user.role,
    };
    return this.ordersService.assignEmployee(orderId, body.employeeId, performedBy);
  }

  @Put(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Hủy đơn hàng (Customer)' })
  async cancelOrder(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() body: { reason?: string }) {
    return this.ordersService.cancelOrder(id, userId, body.reason);
  }

  @Get(':id/audit-logs')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi của đơn hàng' })
  async getAuditLogs(@Param('id') id: string) {
    return this.auditLogService.findByOrderId(id);
  }

  @Patch(':id/payment-status')
  @ApiExcludeEndpoint() // Hide from Swagger - internal endpoint
  @ApiOperation({ summary: 'Cập nhật payment status (Internal - Payment Service)' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentStatusDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    // Verify internal secret (for service-to-service calls)
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'furnimart-internal-secret-2024';
    if (secret !== expectedSecret) {
      throw new BadRequestException('Unauthorized: Invalid internal secret');
    }

    return this.ordersService.updatePaymentStatus(
      id,
      updateDto.paymentStatus,
      updateDto.isPaid ?? false,
    );
  }

  @Patch(':id/items/:productId/quantity')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong đơn hàng (Customer)' })
  async updateItemQuantity(
    @Param('id') orderId: string,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateItemQuantity(
      orderId,
      productId,
      body.quantity,
      user.userId || user.id,
    );
  }
}
