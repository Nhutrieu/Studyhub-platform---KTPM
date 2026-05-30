import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dtos/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryDocument> {
    return this.categoryModel.create(createCategoryDto);
  }

  async findAll(includeInactive = false): Promise<CategoryDocument[]> {
    const query: any = includeInactive ? {} : { isActive: true };
    // 8: Soft delete - filter out deleted items
    query.deletedAt = { $exists: false };
    return this.categoryModel.find(query).sort({ sortOrder: 1, name: 1 }).exec();
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ 
      _id: id,
      deletedAt: { $exists: false }, // 8: Soft delete
    }).exec();
    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }
    return category;
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ 
      slug,
      deletedAt: { $exists: false }, // 8: Soft delete
    }).exec();
    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }
    return category;
  }

  async findByParent(parentId?: string): Promise<CategoryDocument[]> {
    const query: any = parentId 
      ? { parentId, isActive: true } 
      : { $or: [{ parentId: null }, { parentId: { $exists: false } }], isActive: true };
    query.deletedAt = { $exists: false }; // 8: Soft delete
    return this.categoryModel.find(query).sort({ sortOrder: 1, name: 1 }).exec();
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryDocument> {
    const category = await this.findById(id);
    Object.assign(category, updateCategoryDto);
    return category.save();
  }

  async delete(id: string): Promise<void> {
    // 8: Soft delete
    const category = await this.findById(id);
    await this.categoryModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      isActive: false,
    }).exec();
  }
}

