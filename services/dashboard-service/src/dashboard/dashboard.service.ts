import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async getStats() {
    const totalOrders = await this.orderModel.countDocuments();
    const totalRevenue = await this.orderModel.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    const totalProducts = await this.productModel.countDocuments({ isActive: true });
    const totalUsers = await this.userModel.countDocuments();
    const totalCustomers = await this.userModel.countDocuments({ role: 'customer' });

    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalProducts,
      totalUsers,
      totalCustomers,
    };
  }

  async getOrderStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.orderModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getTopProducts(limit = 10) {
    return this.productModel.find({ isActive: true }).limit(limit).sort({ rating: -1 });
  }

  async getOrdersByStatus() {
    return this.orderModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
  }

  async getRevenueChart(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.orderModel.aggregate([
      { $match: { createdAt: { $gte: startDate }, isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          revenue: 1,
          orders: 1,
          _id: 0,
        },
      },
    ]);
  }

  async getCategoryStats() {
    // This would typically require joining with products and orders
    // For now, return a simple aggregation
    // In a real implementation, you'd need to join products with orders
    return this.orderModel.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$items.price' },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          category: '$_id',
          totalOrders: 1,
          totalRevenue: 1,
          totalQuantity: 1,
          _id: 0,
        },
      },
    ]);
  }

  async getBranchStats(branchId: string) {
    const totalOrders = await this.orderModel.countDocuments({ branchId });
    const totalRevenue = await this.orderModel.aggregate([
      { $match: { branchId: new Types.ObjectId(branchId), isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalProducts: 0, // Would need to query products by branch
      totalUsers: 0, // Would need to query users by branch
      totalCustomers: 0, // Would need to query customers by branch
    };
  }
}
