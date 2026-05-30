import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(userData: any): Promise<UserDocument> {
    return this.userModel.create(userData);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email,
      deletedAt: { $exists: false }, // 8: Soft delete
    });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      _id: id,
      deletedAt: { $exists: false }, // 8: Soft delete
    });
  }

  async findAll(filters?: { role?: string | string[]; branchId?: string }): Promise<UserDocument[]> {
    const query: any = { deletedAt: { $exists: false } }; // 8: Soft delete
    if (filters?.role) {
      query.role = Array.isArray(filters.role) ? { $in: filters.role } : filters.role;
    }
    if (filters?.branchId) {
      query.branchId = filters.branchId;
    }
    return this.userModel.find(query);
  }

  async update(id: string, userData: any): Promise<UserDocument | null> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    return this.userModel.findByIdAndUpdate(id, userData, { new: true });
  }

  async delete(id: string): Promise<UserDocument | null> {
    // 8: Soft delete - không được xóa đơn hàng đã phát sinh
    // Check if user has orders (via order service if needed)
    // For now, just soft delete
    return this.userModel.findByIdAndUpdate(
      id,
      {
        deletedAt: new Date(), // 8: Soft delete
        isActive: false, // Also deactivate
      },
      { new: true }
    );
  }

  async addAddress(userId: string, address: any): Promise<UserDocument | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    // Nếu đây là địa chỉ đầu tiên hoặc được đặt làm mặc định, đặt làm mặc định
    if (!user.addresses || user.addresses.length === 0 || address.isDefault) {
      if (user.addresses) {
        user.addresses.forEach((addr) => (addr.isDefault = false));
      }
      address.isDefault = true;
    }

    user.addresses = user.addresses || [];
    user.addresses.push(address);
    return user.save();
  }

  async updateAddress(
    userId: string,
    addressId: string,
    addressData: any
  ): Promise<UserDocument | null> {
    const user = await this.findById(userId);
    if (!user || !user.addresses) {
      return null;
    }

    const addressIndex = user.addresses.findIndex((addr) => {
      const addrId = (addr as any)._id?.toString() || (addr as any).id;
      return addrId === addressId || addrId?.toString() === addressId;
    });

    if (addressIndex === -1) {
      return null;
    }

    // If setting as default, unset default for others
    if (addressData.isDefault) {
      user.addresses.forEach((addr, index) => {
        if (index !== addressIndex) {
          addr.isDefault = false;
        }
      });
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      ...addressData,
    };
    return user.save();
  }

  async deleteAddress(
    userId: string,
    addressId: string
  ): Promise<UserDocument | null> {
    const user = await this.findById(userId);
    if (!user || !user.addresses) {
      return null;
    }

    user.addresses = user.addresses.filter((addr) => {
      const addrId = (addr as any)._id?.toString() || (addr as any).id;
      return !(addrId === addressId || addrId?.toString() === addressId);
    });
    return user.save();
  }

  async setDefaultAddress(
    userId: string,
    addressId: string
  ): Promise<UserDocument | null> {
    const user = await this.findById(userId);
    if (!user || !user.addresses) {
      return null;
    }

    user.addresses.forEach((addr) => {
      const addrId = (addr as any)._id?.toString() || (addr as any).id;
      addr.isDefault = addrId === addressId || addrId?.toString() === addressId;
    });

    return user.save();
  }
}
