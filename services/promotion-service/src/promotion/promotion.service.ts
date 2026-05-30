import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Promotion, PromotionDocument } from './schemas/promotion.schema';
import { CreatePromotionDto, UpdatePromotionDto, ApplyPromotionDto } from './dtos/promotion.dto';

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(Promotion.name) private promotionModel: Model<PromotionDocument>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    // Generate code if not provided and code is required
    if (createPromotionDto.isCodeRequired && !createPromotionDto.code) {
      createPromotionDto.code = this.generatePromoCode();
    }

    const promotion = new this.promotionModel({
      ...createPromotionDto,
      startDate: new Date(createPromotionDto.startDate),
      endDate: new Date(createPromotionDto.endDate),
      isActive: true,
      usageCount: 0,
      usedBy: [],
    });

    return promotion.save();
  }

  async findAll(filters?: any): Promise<Promotion[]> {
    const query: any = {};
    
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive === 'true';
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    // Only return active promotions that are currently valid
    if (filters?.activeOnly === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }

    return this.promotionModel.find(query).exec();
  }

  async findById(id: string): Promise<Promotion> {
    const promotion = await this.promotionModel.findById(id).exec();
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    return promotion;
  }

  async findByCode(code: string): Promise<Promotion | null> {
    return this.promotionModel.findOne({ code, isActive: true }).exec();
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findById(id);
    
    if (updatePromotionDto.startDate) {
      updatePromotionDto.startDate = new Date(updatePromotionDto.startDate) as any;
    }
    if (updatePromotionDto.endDate) {
      updatePromotionDto.endDate = new Date(updatePromotionDto.endDate) as any;
    }

    const updated = await this.promotionModel.findByIdAndUpdate(id, updatePromotionDto, { new: true }).exec();
    if (!updated) {
      throw new NotFoundException(`Promotion with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.promotionModel.findByIdAndDelete(id).exec();
  }

  async applyPromotion(userId: string, applyDto: ApplyPromotionDto): Promise<any> {
    let promotion: Promotion | null = null;

    if (applyDto.code) {
      promotion = await this.findByCode(applyDto.code);
      if (!promotion) {
        throw new BadRequestException('Invalid promotion code');
      }
    } else if (applyDto.promotionId) {
      promotion = await this.findById(applyDto.promotionId);
    } else {
      throw new BadRequestException('Promotion code or ID is required');
    }

    // Check if promotion is valid
    const now = new Date();
    if (!promotion.isActive) {
      throw new BadRequestException('Promotion is not active');
    }

    if (promotion.startDate > now || promotion.endDate < now) {
      throw new BadRequestException('Promotion is not valid at this time');
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      throw new BadRequestException('Promotion usage limit reached');
    }

    // Check if user already used this promotion
    if (promotion.usedBy.includes(userId)) {
      throw new BadRequestException('You have already used this promotion');
    }

    // Check minimum purchase amount
    if (promotion.minPurchaseAmount && applyDto.totalAmount < promotion.minPurchaseAmount) {
      throw new BadRequestException(`Minimum purchase amount is ${promotion.minPurchaseAmount}`);
    }

    // Calculate discount
    let discount = 0;
    if (promotion.type === 'percentage') {
      discount = (applyDto.totalAmount * promotion.value) / 100;
      if (promotion.maxDiscountAmount) {
        discount = Math.min(discount, promotion.maxDiscountAmount);
      }
    } else if (promotion.type === 'fixed') {
      discount = promotion.value;
    } else if (promotion.type === 'free_shipping') {
      discount = 0; // Free shipping is handled separately
    }

    // Check if products/categories are applicable
    if (promotion.applicableProducts.length > 0 || promotion.applicableCategories.length > 0) {
      const applicableItems = applyDto.items.filter((item: any) => {
        if (promotion.applicableProducts.includes(item.productId)) {
          return true;
        }
        if (promotion.applicableCategories.includes(item.categoryId)) {
          return true;
        }
        return false;
      });

      if (applicableItems.length === 0) {
        throw new BadRequestException('No applicable items for this promotion');
      }
    }

    return {
      promotionId: String((promotion as any)._id || promotion),
      promotionName: promotion.name,
      type: promotion.type,
      discount,
      freeShipping: promotion.type === 'free_shipping',
    };
  }

  async usePromotion(promotionId: string, userId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('User ID is required to use promotion');
    }

    const promotion = await this.findById(promotionId);
    
    if (!promotion) {
      throw new NotFoundException(`Promotion with ID ${promotionId} not found`);
    }
    
    // Check if promotion is still valid
    const now = new Date();
    if (!promotion.isActive) {
      throw new BadRequestException('Promotion is not active');
    }

    if (promotion.startDate > now || promotion.endDate < now) {
      throw new BadRequestException('Promotion is not valid at this time');
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      throw new BadRequestException(`Promotion usage limit reached (${promotion.usageCount}/${promotion.usageLimit})`);
    }
    
    // Only update if user hasn't used this promotion yet
    // Convert both to string for comparison (handle ObjectId and string)
    const userIdStr = String(userId);
    const hasUsed = promotion.usedBy.some((id: any) => String(id) === userIdStr);
    
    if (!hasUsed) {
      const updateResult = await this.promotionModel.findByIdAndUpdate(
        promotionId,
        {
          $push: { usedBy: userIdStr },
          $inc: { usageCount: 1 },
        },
        { new: true } // Return updated document
      ).exec();
      
      if (!updateResult) {
        throw new BadRequestException('Failed to update promotion usage count');
      }
      
      // Verify the update was successful
      const updatedPromotion = await this.findById(promotionId);
      if (updatedPromotion.usageCount === promotion.usageCount) {
        console.error(`❌ Promotion usage count was not updated (still ${promotion.usageCount})`);
        throw new BadRequestException(`Promotion usage count was not updated (still ${promotion.usageCount})`);
      }
      
      // Log success
      console.log(`✅ Promotion ${promotionId} usage updated: ${promotion.usageCount} -> ${updatedPromotion.usageCount} for user ${userIdStr}`);
      console.log(`📊 Promotion details: usageLimit=${promotion.usageLimit}, usedBy count=${updatedPromotion.usedBy.length}`);
    } else {
      // User has already used this promotion
      console.warn(`⚠️ User ${userIdStr} has already used promotion ${promotionId}`);
      throw new BadRequestException('User has already used this promotion');
    }
  }

  private generatePromoCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

