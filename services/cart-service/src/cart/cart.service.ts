import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { SyncCartDto, AddToCartDto } from './dtos/cart.dto';

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private cartModel: Model<CartDocument>) {}

  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }
    return cart;
  }

  async syncCart(userId: string, syncDto: SyncCartDto): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId }).exec();
    
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: syncDto.items });
    } else {
      cart.items = syncDto.items;
      await cart.save();
    }
    
    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId }).exec();
    
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === addToCartDto.productId,
    );

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += addToCartDto.quantity;
      if (addToCartDto.branchId) {
        cart.items[existingItemIndex].branchId = addToCartDto.branchId;
      }
    } else {
      cart.items.push({
        productId: addToCartDto.productId,
        quantity: addToCartDto.quantity,
        ...(addToCartDto.branchId && { branchId: addToCartDto.branchId }),
      });
    }

    return cart.save();
  }

  async removeFromCart(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId }).exec();
    
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId,
    );

    return cart.save();
  }

  async updateQuantity(userId: string, productId: string, quantity: number): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId }).exec();
    
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find((item) => item.productId.toString() === productId);
    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    if (quantity <= 0) {
      return this.removeFromCart(userId, productId);
    }

    item.quantity = quantity;
    return cart.save();
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId }).exec();
    
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    cart.items = [];
    return cart.save();
  }
}

