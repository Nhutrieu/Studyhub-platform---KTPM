import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dtos/settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('theme')
  @ApiOperation({ summary: 'Lấy cấu hình giao diện' })
  async getThemeSettings() {
    const settings = await this.settingsService.getSettings('theme');
    return settings.value || {};
  }

  @Put('theme')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cấu hình giao diện (Admin only)' })
  async updateThemeSettings(@Body() updateDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings('theme', updateDto);
  }

  @Get('general')
  @ApiOperation({ summary: 'Lấy cài đặt chung' })
  async getGeneralSettings() {
    const settings = await this.settingsService.getSettings('general');
    return settings.value || {};
  }

  @Put('general')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cài đặt chung (Admin only)' })
  async updateGeneralSettings(@Body() updateDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings('general', updateDto);
  }

  @Get('header')
  @ApiOperation({ summary: 'Lấy cấu hình Header/Navbar' })
  async getHeaderSettings() {
    const settings = await this.settingsService.getSettings('header');
    return settings.value || {};
  }

  @Put('header')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cấu hình Header/Navbar (Admin only)' })
  async updateHeaderSettings(@Body() updateDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings('header', updateDto);
  }

  @Get('hero')
  @ApiOperation({ summary: 'Lấy cấu hình Hero Section' })
  async getHeroSettings() {
    const settings = await this.settingsService.getSettings('hero');
    return settings.value || {};
  }

  @Put('hero')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cấu hình Hero Section (Admin only)' })
  async updateHeroSettings(@Body() updateDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings('hero', updateDto);
  }
}

