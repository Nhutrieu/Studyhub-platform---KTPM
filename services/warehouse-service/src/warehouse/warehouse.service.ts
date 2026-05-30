import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Warehouse, WarehouseDocument, WarehouseTransaction } from './schemas/warehouse.schema';
import { CreateWarehouseDto, WarehouseTransactionDto, AdjustStockDto } from './dtos/warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(@InjectModel(Warehouse.name) private warehouseModel: Model<WarehouseDocument>) { }

  async create(createWarehouseDto: CreateWarehouseDto, userId: string): Promise<WarehouseDocument> {
    // Check if product already exists in this branch (or globally if no branchId)
    const query: any = { productId: createWarehouseDto.productId };
    if (createWarehouseDto.branchId) {
      query.branchId = createWarehouseDto.branchId;
    } else {
      // If no branchId, check for global inventory (branchId is null/undefined)
      query.$or = [{ branchId: null }, { branchId: { $exists: false } }];
    }

    const existing = await this.warehouseModel.findOne(query).exec();
    if (existing) {
      throw new BadRequestException(
        createWarehouseDto.branchId
          ? 'Sản phẩm đã có trong kho chi nhánh này'
          : 'Sản phẩm đã có trong kho'
      );
    }

    try {
      const warehouse = await this.warehouseModel.create({
        ...createWarehouseDto,
        // Ensure branchId is explicitly set or undefined (not null) for sparse index
        branchId: createWarehouseDto.branchId || undefined,
        availableQuantity: createWarehouseDto.quantity,
        reservedQuantity: 0,
      });

      // Add initial transaction
      if (createWarehouseDto.quantity > 0) {
        await this.addTransaction(warehouse._id.toString(), {
          productId: createWarehouseDto.productId,
          quantity: createWarehouseDto.quantity,
          type: 'import',
          userId,
        });
      }

      return warehouse;
    } catch (error: any) {
      // Handle duplicate key error from MongoDB
      if (error.code === 11000) {
        throw new BadRequestException(
          createWarehouseDto.branchId
            ? 'Sản phẩm đã có trong kho chi nhánh này'
            : 'Sản phẩm đã có trong kho'
        );
      }
      throw error;
    }
  }

  async findAll(branchId?: string): Promise<WarehouseDocument[]> {
    const query: any = { isActive: true };
    if (branchId) {
      query.branchId = branchId;
    }
    return this.warehouseModel.find(query).sort({ productName: 1 }).exec();
  }

  async findById(id: string): Promise<WarehouseDocument> {
    const warehouse = await this.warehouseModel.findById(id).exec();
    if (!warehouse) {
      throw new NotFoundException('Kho không tồn tại');
    }
    return warehouse;
  }

  async findByProductId(productId: string, branchId?: string): Promise<WarehouseDocument | null> {
    const query: any = { productId, isActive: true };
    if (branchId) {
      query.branchId = branchId;
    }
    return this.warehouseModel.findOne(query).exec();
  }

  async addTransaction(warehouseId: string, transaction: WarehouseTransactionDto & { userId: string }): Promise<WarehouseDocument> {
    const warehouse = await this.findById(warehouseId);

    const newTransaction: WarehouseTransaction = {
      productId: transaction.productId,
      productName: warehouse.productName,
      quantity: transaction.quantity,
      type: transaction.type as any,
      orderId: transaction.orderId,
      userId: transaction.userId,
      note: transaction.note,
      createdAt: new Date(),
    };

    warehouse.transactions.push(newTransaction);

    // Update quantities based on transaction type
    if (transaction.type === 'import') {
      warehouse.quantity += transaction.quantity;
      // availableQuantity will be recalculated by pre-save hook
      warehouse.availableQuantity = warehouse.quantity - warehouse.reservedQuantity;
    } else if (transaction.type === 'export') {
      // Check available quantity before export
      const exportQuantity = Math.abs(transaction.quantity);
      if (warehouse.availableQuantity < exportQuantity) {
        throw new BadRequestException(`Không đủ hàng trong kho. Còn ${warehouse.availableQuantity} sản phẩm`);
      }
      warehouse.quantity += transaction.quantity; // quantity is negative
      // availableQuantity will be recalculated by pre-save hook
      warehouse.availableQuantity = Math.max(0, warehouse.quantity - warehouse.reservedQuantity);
    } else if (transaction.type === 'adjustment') {
      warehouse.quantity += transaction.quantity;
      // availableQuantity will be recalculated by pre-save hook
      warehouse.availableQuantity = warehouse.quantity - warehouse.reservedQuantity;
    } else if (transaction.type === 'damaged' || transaction.type === 'returned') {
      warehouse.quantity += transaction.quantity; // negative
      // availableQuantity will be recalculated by pre-save hook
      warehouse.availableQuantity = warehouse.quantity - warehouse.reservedQuantity;
    }

    return warehouse.save();
  }

  async reserveStock(productId: string, quantity: number, branchId?: string): Promise<WarehouseDocument> {
    const warehouse = await this.findByProductId(productId, branchId);
    if (!warehouse) {
      throw new NotFoundException(
        branchId
          ? 'Sản phẩm không có trong kho chi nhánh này'
          : 'Sản phẩm không có trong kho'
      );
    }

    if (warehouse.availableQuantity < quantity) {
      throw new BadRequestException(
        `Không đủ hàng trong kho. Còn ${warehouse.availableQuantity} sản phẩm, yêu cầu ${quantity}`
      );
    }

    warehouse.reservedQuantity += quantity;
    // availableQuantity will be recalculated by pre-save hook
    warehouse.availableQuantity = warehouse.quantity - warehouse.reservedQuantity;
    return warehouse.save();
  }

  async releaseReservedStock(productId: string, quantity: number, branchId?: string): Promise<WarehouseDocument> {
    const warehouse = await this.findByProductId(productId, branchId);
    if (!warehouse) {
      throw new NotFoundException(
        branchId
          ? 'Sản phẩm không có trong kho chi nhánh này'
          : 'Sản phẩm không có trong kho'
      );
    }

    // Ensure we don't release more than reserved
    const releaseQuantity = Math.min(quantity, warehouse.reservedQuantity);
    warehouse.reservedQuantity = Math.max(0, warehouse.reservedQuantity - quantity);
    // availableQuantity will be recalculated by pre-save hook
    warehouse.availableQuantity = warehouse.quantity - warehouse.reservedQuantity;
    return warehouse.save();
  }

  async adjustStock(warehouseId: string, adjustStockDto: AdjustStockDto, userId: string): Promise<WarehouseDocument> {
    const warehouse = await this.findById(warehouseId);

    await this.addTransaction(warehouseId, {
      productId: warehouse.productId.toString(),
      quantity: adjustStockDto.quantity - warehouse.quantity,
      type: 'adjustment',
      userId,
      note: adjustStockDto.note,
    });

    return this.findById(warehouseId);
  }

  async getLowStockItems(threshold?: number): Promise<WarehouseDocument[]> {
    const minStock = threshold || 10;
    return this.warehouseModel
      .find({
        isActive: true,
        availableQuantity: { $lte: minStock },
      })
      .sort({ availableQuantity: 1 })
      .exec();
  }

  async getInventory(branchId?: string, productId?: string): Promise<WarehouseDocument[]> {
    const query: any = { isActive: true };

    if (branchId) {
      query.branchId = branchId;
    }

    if (productId) {
      query.productId = productId;
    }

    return this.warehouseModel.find(query).sort({ productName: 1 }).exec();
  }
}

