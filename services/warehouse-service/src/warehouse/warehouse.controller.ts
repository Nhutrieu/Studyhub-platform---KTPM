import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto, WarehouseTransactionDto, AdjustStockDto } from './dtos/warehouse.dto';

@ApiTags('Warehouse')
@Controller('warehouse')
export class WarehouseController {
  constructor(private warehouseService: WarehouseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.BRANCH_MANAGER) // 3: Admin không được chỉnh tồn kho hằng ngày
  @ApiOperation({ summary: 'Tạo kho mới (Manager only - Admin không được tạo)' })
  async create(@Request() req: any, @Body() createWarehouseDto: CreateWarehouseDto) {
    return this.warehouseService.create(createWarehouseDto, req.user.userId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Lấy danh sách kho (Admin/Manager)' })
  async findAll(
    @Query('branchId') branchId?: string, 
    @Query('productId') productId?: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    // 4: Branch Manager và Employee chỉ được xem inventory của branch mình
    if (user?.role === 'branch_manager' || user?.role === 'employee') {
      if (!user?.branchId) {
        throw new BadRequestException('User must be assigned to a branch to view inventory.');
      }
      branchId = user.branchId; // Override branchId with user's assigned branch
    }
    if (branchId || productId) {
      return this.warehouseService.getInventory(branchId, productId);
    }
    return this.warehouseService.findAll(branchId);
  }

  @Get('inventory')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Lấy danh sách tồn kho (có thể filter theo branchId và productId)' })
  async getInventory(
    @Query('branchId') branchId?: string, 
    @Query('productId') productId?: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    // 4: Branch Manager và Employee chỉ được xem inventory của branch mình
    if (user?.role === 'branch_manager' || user?.role === 'employee') {
      if (!user?.branchId) {
        throw new BadRequestException('User must be assigned to a branch to view inventory.');
      }
      branchId = user.branchId; // Override branchId with user's assigned branch
    }
    return this.warehouseService.getInventory(branchId, productId);
  }

  @Get('internal/inventory')
  @ApiOperation({ summary: 'Lấy danh sách tồn kho (Internal service call - không cần auth)' })
  async getInventoryInternal(
    @Query('branchId') branchId?: string, 
    @Query('productId') productId?: string,
  ) {
    // Internal endpoint for branch service - no auth required
    return this.warehouseService.getInventory(branchId, productId);
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Lấy sản phẩm sắp hết hàng (Admin/Manager)' })
  async getLowStockItems(@Query('threshold') threshold?: string) {
    return this.warehouseService.getLowStockItems(threshold ? parseInt(threshold) : undefined);
  }

  @Get('product/:productId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Lấy thông tin kho theo sản phẩm' })
  async findByProductId(@Param('productId') productId: string) {
    return this.warehouseService.findByProductId(productId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Lấy chi tiết kho' })
  async findById(@Param('id') id: string) {
    return this.warehouseService.findById(id);
  }

  @Post(':id/transaction')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.BRANCH_MANAGER, Role.EMPLOYEE) // 3: Admin không được chỉnh tồn kho
  @ApiOperation({ summary: 'Thêm giao dịch kho (Manager/Employee only)' })
  async addTransaction(
    @Param('id') id: string,
    @Request() req: any,
    @Body() transactionDto: WarehouseTransactionDto,
  ) {
    return this.warehouseService.addTransaction(id, { ...transactionDto, userId: req.user.userId });
  }

  @Put(':id/adjust')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.BRANCH_MANAGER, Role.EMPLOYEE) // 3: Admin không được chỉnh tồn kho
  @ApiOperation({ summary: 'Điều chỉnh tồn kho (Manager/Employee only - Admin view-only)' })
  async adjustStock(
    @Param('id') id: string,
    @Request() req: any,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.warehouseService.adjustStock(id, adjustStockDto, req.user.userId);
  }

  @Post('reserve/:productId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Đặt trước hàng (khi tạo đơn hàng)' })
  async reserveStock(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; branchId?: string },
  ) {
    return this.warehouseService.reserveStock(productId, body.quantity, body.branchId);
  }

  @Post('internal/reserve/:productId')
  @ApiOperation({ summary: 'Đặt trước hàng (Internal service call - không cần auth)' })
  async reserveStockInternal(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; branchId?: string },
  ) {
    // Internal endpoint for order service - no auth required
    return this.warehouseService.reserveStock(productId, body.quantity, body.branchId);
  }

  @Post('release/:productId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Giải phóng hàng đã đặt (khi hủy đơn)' })
  async releaseReservedStock(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; branchId?: string },
  ) {
    return this.warehouseService.releaseReservedStock(productId, body.quantity, body.branchId);
  }

  @Post('internal/release/:productId')
  @ApiOperation({ summary: 'Giải phóng hàng đã đặt (Internal service call - không cần auth)' })
  async releaseReservedStockInternal(
    @Param('productId') productId: string,
    @Body() body: { quantity: number; branchId?: string },
  ) {
    // Internal endpoint for order service - no auth required
    return this.warehouseService.releaseReservedStock(productId, body.quantity, body.branchId);
  }
}

