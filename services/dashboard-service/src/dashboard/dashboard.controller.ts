import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy thống kê chung' })
  async getStats(@Query('branchId') branchId?: string) {
    if (branchId) {
      return this.dashboardService.getBranchStats(branchId);
    }
    return this.dashboardService.getStats();
  }

  @Get('orders-stats')
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy thống kê đơn hàng' })
  async getOrderStats(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getOrderStats(parsedDays);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Lấy sản phẩm hàng đầu' })
  async getTopProducts(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getTopProducts(parsedLimit);
  }

  @Get('orders-by-status')
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy đơn hàng theo trạng thái' })
  async getOrdersByStatus() {
    return this.dashboardService.getOrdersByStatus();
  }

  @Get('revenue-chart')
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy dữ liệu biểu đồ doanh thu' })
  async getRevenueChart(@Query('days') days?: string) {
    const parsedDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getRevenueChart(parsedDays);
  }

  @Get('category-stats')
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lấy thống kê theo danh mục' })
  async getCategoryStats() {
    return this.dashboardService.getCategoryStats();
  }
}
