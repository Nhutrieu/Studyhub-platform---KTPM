import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";

@ApiTags("Users Internal")
@Controller("users")
export class UsersInternalController {
  constructor(private usersService: UsersService) {}

  @Get("internal/:id")
  @ApiOperation({ summary: "Lấy thông tin người dùng theo ID (Internal service call - không cần auth)" })
  async findByIdInternal(@Param("id") id: string) {
    // Internal endpoint for other services - no auth required
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return this.formatUserResponse(user);
  }

  private formatUserResponse(user: any) {
    const { password, ...rest } = user.toObject?.() || user;
    return rest;
  }
}



