import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateBranchDto, UpdateBranchDto, ApproveBranchDto } from './dtos/branch.dto';

@Injectable()
export class BranchService {
  private readonly WAREHOUSE_SERVICE_URL = process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-service:3009';

  constructor(
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private httpService: HttpService,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    const branch = new this.branchModel({
      ...createBranchDto,
      status: 'pending',
      isActive: false,
      totalOrders: 0,
      totalRevenue: 0,
    });

    return branch.save();
  }

  async findAll(filters?: any): Promise<Branch[]> {
    const query: any = {};

    // 8: Soft delete - filter out deleted items by default
    if (!filters?.includeDeleted) {
      query.deletedAt = { $exists: false };
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive === 'true';
    }

    if (filters?.city) {
      query['address.city'] = filters.city;
    }

    if (filters?.district) {
      query['address.district'] = filters.district;
    }

    const branches = await this.branchModel.find(query).populate('managerId', 'name email phone').exec();

    if (branches.length === 0) {
      return branches;
    }

    const branchStats = await this.orderModel.aggregate([
      {
        $group: {
          _id: '$branchId',
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: ['$isPaid', '$totalPrice', 0],
            },
          },
        },
      },
    ]);

    const statsByBranchId = new Map(
      branchStats.map((stat) => [stat._id?.toString(), stat]),
    );

    return branches.map((branch) => {
      const stats = statsByBranchId.get(branch._id.toString());
      if (!stats) {
        return branch;
      }
      branch.totalOrders = stats.totalOrders ?? branch.totalOrders ?? 0;
      branch.totalRevenue = stats.totalRevenue ?? branch.totalRevenue ?? 0;
      return branch;
    });
  }

  async findById(id: string): Promise<Branch> {
    const branch = await this.branchModel.findOne({ 
      _id: id,
      deletedAt: { $exists: false }, // 8: Soft delete
    }).populate('managerId', 'name email phone').exec();
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  async getInventory(branchId: string, productId?: string): Promise<any[]> {
    // Call warehouse service to get inventory filtered by branchId
    try {
      const params = new URLSearchParams();
      params.append('branchId', branchId);
      if (productId) {
        params.append('productId', productId);
      }
      // Use internal endpoint that doesn't require authentication
      const url = `${this.WAREHOUSE_SERVICE_URL}/api/warehouse/internal/inventory?${params.toString()}`;
      const response = await firstValueFrom(this.httpService.get(url));
      
      // Handle response data - ResponseInterceptor wraps in { success, statusCode, message, data }
      let rawData = response.data;
      
      // Unwrap if wrapped by ResponseInterceptor
      if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
        if (rawData.data !== undefined) {
          rawData = rawData.data;
        }
      }
      
      // Ensure we have an array
      const inventory = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);
      
      // Log raw data for debugging
      console.log(`[BranchService] Raw inventory data for branch ${branchId}, product ${productId}:`, {
        fullResponse: response,
        responseData: response.data,
        rawData,
        inventory,
        inventoryLength: inventory.length,
      });
      
      // If no inventory found, return empty array
      if (!inventory || inventory.length === 0) {
        console.log(`[BranchService] No inventory found for branch ${branchId}, product ${productId}`);
        return [];
      }
      
      return inventory.map((item: any) => {
        const quantity = item.quantity || 0;
        const reservedQuantity = item.reservedQuantity || 0;
        // Use explicit check for availableQuantity - if it's 0, use it; if undefined/null, calculate
        const availableQuantity = item.availableQuantity !== undefined && item.availableQuantity !== null
          ? item.availableQuantity
          : Math.max(0, quantity - reservedQuantity);
        
        const mapped = {
          id: item._id || item.id,
          productId: item.productId,
          product: { name: item.productName },
          quantity,
          availableQuantity,
          reservedQuantity,
          minStockLevel: item.minStockLevel || 10,
          maxStockLevel: item.maxStockLevel || 100,
          location: item.location || 'Kho chính',
          status: availableQuantity > (item.minStockLevel || 10) ? 'in_stock' : 'low_stock',
        };
        
        console.log(`[BranchService] Mapped inventory item:`, mapped);
        return mapped;
      });
    } catch (error: any) {
      // Log error for debugging
      console.error(`[BranchService] Error fetching inventory for branch ${branchId}, product ${productId}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        stack: error.stack,
      });
      // If warehouse service is not available, return empty array
      return [];
    }
  }

  async findByManagerId(managerId: string): Promise<Branch | null> {
    return this.branchModel.findOne({ managerId, isActive: true }).exec();
  }

  async findActiveBranches(): Promise<Branch[]> {
    return this.branchModel.find({ status: 'active', isActive: true }).exec();
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.branchModel.findByIdAndUpdate(id, updateBranchDto, { new: true }).exec();
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async approve(id: string, adminId: string, approveDto: ApproveBranchDto): Promise<Branch> {
    const branch = await this.findById(id);

    if (branch.status !== 'pending') {
      throw new BadRequestException('Branch is not pending approval');
    }

    const updateData: any = {
      approvedBy: adminId,
      approvedAt: new Date(),
    };

    if (approveDto.status === 'approved') {
      updateData.status = 'approved';
      updateData.isActive = true;
    } else if (approveDto.status === 'rejected') {
      updateData.status = 'rejected';
      updateData.isActive = false;
      updateData.rejectedReason = approveDto.rejectedReason || 'Rejected by administrator';
    }

    const updated = await this.branchModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return updated;
  }

  async activate(id: string): Promise<Branch> {
    const branch = await this.findById(id);
    
    if (branch.status !== 'approved') {
      throw new BadRequestException('Branch must be approved before activation');
    }

    const updated = await this.branchModel.findByIdAndUpdate(
      id,
      { status: 'active', isActive: true },
      { new: true }
    ).exec();
    if (!updated) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return updated;
  }

  async deactivate(id: string): Promise<Branch> {
    await this.findById(id);
    const updated = await this.branchModel.findByIdAndUpdate(
      id,
      { status: 'inactive', isActive: false },
      { new: true }
    ).exec();
    if (!updated) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return updated;
  }

  async assignManager(branchId: string, managerId: string): Promise<Branch> {
    await this.findById(branchId);
    
    // Check if manager is already assigned to another branch
    const existingBranch = await this.findByManagerId(managerId);
    if (existingBranch && String((existingBranch as BranchDocument)._id) !== branchId) {
      throw new BadRequestException('Manager is already assigned to another branch');
    }

    const updated = await this.branchModel.findByIdAndUpdate(
      branchId,
      { managerId },
      { new: true }
    ).exec();
    if (!updated) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }
    return updated;
  }

  async updateStats(branchId: string, orders: number, revenue: number): Promise<void> {
    await this.branchModel.findByIdAndUpdate(branchId, {
      $inc: {
        totalOrders: orders,
        totalRevenue: revenue,
      },
    }).exec();
  }

  async delete(id: string): Promise<void> {
    const branch = await this.findById(id);
    
    // 8: Soft delete - không được xóa đơn hàng đã phát sinh
    // Check if branch has orders
    if (branch.totalOrders > 0) {
      throw new BadRequestException('Không thể xóa chi nhánh đã có đơn hàng. Vui lòng vô hiệu hóa thay vì xóa.');
    }

    // 8: Soft delete instead of hard delete
    await this.branchModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      isActive: false,
      status: 'inactive',
    }).exec();
  }

  /**
   * Tính khoảng cách giữa 2 điểm tọa độ (theo đường chim bay) bằng Haversine formula
   * @param lat1 Vĩ độ điểm 1
   * @param lng1 Kinh độ điểm 1
   * @param lat2 Vĩ độ điểm 2
   * @param lng2 Kinh độ điểm 2
   * @returns Khoảng cách tính bằng km
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Tìm 2 chi nhánh gần nhất dựa trên tọa độ địa chỉ giao hàng
   * @param lat Vĩ độ địa chỉ giao hàng
   * @param lng Kinh độ địa chỉ giao hàng
   * @returns Mảng 2 chi nhánh gần nhất (sắp xếp theo khoảng cách tăng dần)
   */
  async findNearestBranches(lat: number, lng: number, limit: number = 2): Promise<Branch[]> {
    const activeBranches = await this.findActiveBranches();
    
    // Lọc các chi nhánh có tọa độ hợp lệ và tính khoảng cách
    const branchesWithDistance = activeBranches
      .filter(
        (branch) =>
          branch.address?.coordinates?.lat &&
          branch.address?.coordinates?.lng
      )
      .map((branch) => {
        const distance = this.calculateDistance(
          lat,
          lng,
          branch.address.coordinates!.lat,
          branch.address.coordinates!.lng
        );
        return { branch, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((item) => item.branch);

    return branchesWithDistance;
  }

  /**
   * Tìm chi nhánh gần nhất dựa trên tọa độ địa chỉ giao hàng
   * @param lat Vĩ độ địa chỉ giao hàng
   * @param lng Kinh độ địa chỉ giao hàng
   * @returns Chi nhánh gần nhất
   */
  async findNearestBranch(lat: number, lng: number): Promise<Branch | null> {
    const nearestBranches = await this.findNearestBranches(lat, lng, 1);
    return nearestBranches.length > 0 ? nearestBranches[0] : null;
  }
}
