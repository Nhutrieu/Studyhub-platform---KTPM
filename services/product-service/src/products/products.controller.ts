import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dtos/product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Admin/Employee)' })
  async create(@Body() createProductDto: CreateProductDto) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Product Controller] Received create request:', JSON.stringify(createProductDto, null, 2));
    }
    try {
      const result = await this.productsService.create(createProductDto);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Product Controller] Product created successfully:', result.id);
      }
      return result;
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Product Controller] Error creating product:', error);
        console.error('[Product Controller] Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
  async findAll(@Query() filters: any) {
    return this.productsService.findAll(filters);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Lấy sản phẩm nổi bật' })
  async getFeatured(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 8;
    return this.productsService.findAll({ isFeatured: true, limit: parsedLimit });
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm sản phẩm' })
  async search(@Query('q') query: string, @Query() filters: any) {
    return this.productsService.findAll({ ...filters, search: query });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Cập nhật sản phẩm (Admin/Employee)' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa sản phẩm (Admin)' })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
