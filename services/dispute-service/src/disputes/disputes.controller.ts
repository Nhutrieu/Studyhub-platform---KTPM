import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, UpdateDisputeDto } from './dtos/dispute.dto';

@ApiTags('Disputes')
@Controller('disputes')
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Tạo tranh chấp mới (Customer)' })
  async create(@Request() req: any, @Body() createDisputeDto: CreateDisputeDto) {
    return this.disputesService.create(req.user.userId, req.user.name, createDisputeDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Lấy danh sách tranh chấp (Admin/Manager)' })
  async findAll(@Query('status') status?: string) {
    return this.disputesService.findAll({ status });
  }

  @Get('my-disputes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy tranh chấp của tôi (Customer)' })
  async getMyDisputes(@Request() req: any) {
    return this.disputesService.findAll({ customerId: req.user.userId });
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy tranh chấp theo đơn hàng' })
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.disputesService.findByOrderId(orderId);
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Thống kê tranh chấp (Admin/Manager)' })
  async getStats() {
    return this.disputesService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy chi tiết tranh chấp' })
  async findById(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Cập nhật tranh chấp (Admin/Manager)' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateDisputeDto: UpdateDisputeDto,
  ) {
    return this.disputesService.update(id, updateDisputeDto, req.user.userId);
  }
}

