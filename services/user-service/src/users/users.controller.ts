import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  Query,
  ForbiddenException,
} from "@nestjs/common";
import { Role } from '../common/config/rbac-matrix';
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "./users.service";
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles, Public } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  UpdateUserDto,
  AddAddressDto,
  UpdateAddressDto,
} from "./dtos/user.dto";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("profile")
  @ApiOperation({ summary: "Lấy thông tin cá nhân" })
  async getProfile(@CurrentUser("userId") userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return this.formatUserResponse(user);
  }

  @Get("addresses")
  @ApiOperation({ summary: "Lấy danh sách địa chỉ của người dùng" })
  async getAddresses(@CurrentUser("userId") userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return user.addresses || [];
  }

  @Get()
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER, Role.EMPLOYEE)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Lấy danh sách người dùng (Admin/Manager/Employee)" })
  async findAll(@CurrentUser() currentUser: any, @Query("role") role?: string) {
    if (currentUser?.role === Role.BRANCH_MANAGER) {
      if (!currentUser?.branchId) {
        throw new ForbiddenException("Branch manager phải được gán cho một chi nhánh");
      }
      const allowedRoles = [Role.EMPLOYEE, Role.SHIPPER];
      if (role && !allowedRoles.includes(role as Role)) {
        throw new ForbiddenException("Branch manager chỉ được xem nhân viên và shipper của chi nhánh mình");
      }
      const users = await this.usersService.findAll({
        role: role || allowedRoles,
        branchId: currentUser.branchId,
      });
      return users.map((u) => this.formatUserResponse(u));
    }

    if (currentUser?.role === Role.EMPLOYEE) {
      if (!currentUser?.branchId) {
        throw new ForbiddenException("Nhân viên phải được gán cho một chi nhánh");
      }
      // Employee chỉ được xem shippers của chi nhánh mình (để phân công)
      if (role && role !== Role.SHIPPER) {
        throw new ForbiddenException("Nhân viên chỉ được xem shipper của chi nhánh mình");
      }
      const users = await this.usersService.findAll({
        role: Role.SHIPPER,
        branchId: currentUser.branchId,
      });
      return users.map((u) => this.formatUserResponse(u));
    }

    const users = await this.usersService.findAll({ role });
    return users.map((u) => this.formatUserResponse(u));
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin người dùng theo ID" })
  async findById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return this.formatUserResponse(user);
  }

  @Put("profile")
  @ApiOperation({ summary: "Cập nhật thông tin cá nhân" })
  async updateProfile(
    @CurrentUser("userId") userId: string,
    @Body() updateDto: UpdateUserDto
  ) {
    const user = await this.usersService.update(userId, updateDto);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return this.formatUserResponse(user);
  }

  @Put(":id")
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Cập nhật thông tin người dùng (Admin/Manager)" })
  async update(@Param("id") id: string, @Body() updateDto: UpdateUserDto, @CurrentUser() currentUser: any) {
    if (currentUser?.role === Role.BRANCH_MANAGER) {
      if (!currentUser?.branchId) {
        throw new ForbiddenException("Branch manager phải được gán cho một chi nhánh");
      }
      const targetUser = await this.usersService.findById(id);
      if (!targetUser) {
        throw new NotFoundException("Không tìm thấy người dùng");
      }
      const allowedRoles = [Role.EMPLOYEE, Role.SHIPPER];
      if (!allowedRoles.includes(targetUser.role as Role)) {
        throw new ForbiddenException("Branch manager chỉ được quản lý nhân viên và shipper");
      }
      if (targetUser.branchId?.toString() !== currentUser.branchId) {
        throw new ForbiddenException("Branch manager chỉ được quản lý nhân sự trong chi nhánh của mình");
      }
      if (updateDto.role && !allowedRoles.includes(updateDto.role as Role)) {
        throw new ForbiddenException("Branch manager không được đổi role ngoài phạm vi nhân viên/shipper");
      }
      updateDto.branchId = currentUser.branchId;
    }
    const user = await this.usersService.update(id, updateDto);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return this.formatUserResponse(user);
  }

  @Post("addresses")
  @ApiOperation({ summary: "Thêm địa chỉ mới" })
  async addAddress(
    @CurrentUser("userId") userId: string,
    @Body() addressData: AddAddressDto | any
  ) {
    const user = await this.usersService.addAddress(userId, addressData);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    // Return the added address (last in the array)
    const addedAddress = user.addresses?.[user.addresses.length - 1];
    return {
      ...addedAddress,
      _id: (addedAddress as any)._id,
    };
  }

  @Put("addresses/:addressId")
  @ApiOperation({ summary: "Cập nhật địa chỉ" })
  async updateAddress(
    @CurrentUser("userId") userId: string,
    @Param("addressId") addressId: string,
    @Body() updateData: UpdateAddressDto | any
  ) {
    const user = await this.usersService.updateAddress(
      userId,
      addressId,
      updateData
    );
    if (!user) {
      throw new NotFoundException("Không tìm thấy địa chỉ hoặc người dùng");
    }
    // Return the updated address
    const updatedAddress = user.addresses?.find((addr: any) => {
      const addrId = addr._id?.toString() || addr.id;
      return addrId === addressId || addrId?.toString() === addressId;
    });
    return {
      ...updatedAddress,
      _id: (updatedAddress as any)._id,
    };
  }

  @Delete("addresses/:addressId")
  @ApiOperation({ summary: "Xóa địa chỉ" })
  async deleteAddress(
    @CurrentUser("userId") userId: string,
    @Param("addressId") addressId: string
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Put("addresses/:addressId/set-default")
  @ApiOperation({ summary: "Đặt địa chỉ làm mặc định" })
  async setDefaultAddress(
    @CurrentUser("userId") userId: string,
    @Param("addressId") addressId: string
  ) {
    const user = await this.usersService.setDefaultAddress(userId, addressId);
    if (!user) {
      throw new NotFoundException("Không tìm thấy địa chỉ hoặc người dùng");
    }
    // Return the updated address
    const updatedAddress = user.addresses?.find((addr: any) => {
      const addrId = addr._id?.toString() || addr.id;
      return addrId === addressId || addrId?.toString() === addressId;
    });
    return {
      ...updatedAddress,
      _id: (updatedAddress as any)._id,
    };
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Xóa người dùng (Admin only)" })
  async delete(@Param("id") id: string) {
    const user = await this.usersService.delete(id);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return { message: "Đã xóa người dùng thành công" };
  }

  private formatUserResponse(user: any) {
    const { password, ...rest } = user.toObject?.() || user;
    return rest;
  }
}
