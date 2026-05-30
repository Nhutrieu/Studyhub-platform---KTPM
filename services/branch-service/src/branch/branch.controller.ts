import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BranchService } from './branch.service';
import { CreateBranchDto, UpdateBranchDto, ApproveBranchDto } from './dtos/branch.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private branchService: BranchService) { }

  @Post()
  @ApiOperation({ summary: 'Đăng ký chi nhánh mới' })
  async create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchService.create(createBranchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chi nhánh' })
  async findAll(@Query() filters: any) {
    return this.branchService.findAll(filters);
  }

  @Get('active')
  @ApiOperation({ summary: 'Lấy danh sách chi nhánh đang hoạt động' })
  async findActive() {
    return this.branchService.findActiveBranches();
  }

  @Get('nearest')
  @ApiOperation({ summary: 'Tìm 2 chi nhánh gần nhất dựa trên tọa độ' })
  async findNearest(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Latitude và longitude phải là số hợp lệ');
    }

    return this.branchService.findNearestBranches(latitude, longitude, 2);
  }

  @Get('nearest/single')
  @ApiOperation({ summary: 'Tìm chi nhánh gần nhất dựa trên tọa độ' })
  async findNearestSingle(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Latitude và longitude phải là số hợp lệ');
    }

    return this.branchService.findNearestBranch(latitude, longitude);
  }

  @Get('my-branch')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Lấy thông tin chi nhánh của tôi (Branch Manager)' })
  async getMyBranch(@CurrentUser('userId') userId: string) {
    return this.branchService.findByManagerId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết chi nhánh' })
  async findById(@Param('id') id: string) {
    return this.branchService.findById(id);
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Lấy tồn kho của chi nhánh' })
  async getInventory(@Param('id') id: string, @Query('productId') productId?: string) {
    return this.branchService.getInventory(id, productId);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin chi nhánh (Admin/Branch Manager)' })
  async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto, @CurrentUser() user: any) {
    // Branch manager can only update their own branch
    if (user?.role === 'branch_manager') {
      const branch = await this.branchService.findById(id);
      if (branch.managerId?.toString() !== user.userId) {
        throw new BadRequestException('Bạn chỉ có thể cập nhật chi nhánh của mình');
      }
    }
    return this.branchService.update(id, updateBranchDto);
  }

  @Put(':id/approve')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Phê duyệt/từ chối đăng ký chi nhánh (Admin)' })
  async approve(@Param('id') id: string, @CurrentUser('userId') adminId: string, @Body() approveDto: ApproveBranchDto) {
    return this.branchService.approve(id, adminId, approveDto);
  }

  @Put(':id/activate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kích hoạt chi nhánh (Admin)' })
  async activate(@Param('id') id: string) {
    return this.branchService.activate(id);
  }

  @Put(':id/deactivate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Vô hiệu hóa chi nhánh (Admin)' })
  async deactivate(@Param('id') id: string) {
    return this.branchService.deactivate(id);
  }

  @Put(':id/assign-manager')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Gán quản lý cho chi nhánh (Admin)' })
  async assignManager(@Param('id') branchId: string, @Body() body: { managerId: string }) {
    return this.branchService.assignManager(branchId, body.managerId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa chi nhánh (Admin)' })
  async delete(@Param('id') id: string) {
    await this.branchService.delete(id);
    return { message: 'Branch deleted successfully' };
  }
}

