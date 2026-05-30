import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

/**
 * Base service với các method CRUD chung
 * Giảm code trùng lặp trong các service
 */
@Injectable()
export abstract class BaseService<T> {
  protected abstract model: Model<T>;

  async create(createDto: any): Promise<T> {
    return this.model.create(createDto) as Promise<T>;
  }

  async findAll(filters?: any): Promise<T[]> {
    if (filters && Object.keys(filters).length > 0) {
      return this.model.find(filters).exec() as Promise<T[]>;
    }
    return this.model.find().exec() as Promise<T[]>;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec() as Promise<T | null>;
  }

  async update(id: string, updateDto: any): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, updateDto, { new: true }).exec() as Promise<T | null>;
  }

  async delete(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec() as Promise<T | null>;
  }
}


