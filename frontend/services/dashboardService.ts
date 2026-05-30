import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import {
  DashboardStats,
  RevenueChartData,
  TopProduct,
  CategoryStat,
  OrdersByStatus,
} from "@/lib/types";

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>(endpoints.dashboard.stats);
    return response.data;
  },

  getOrdersStats: async (days = 30): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByDay: Array<{ date: string; count: number; revenue: number }>;
  }> => {
    const response = await apiClient.get<{
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
      ordersByDay: Array<{ date: string; count: number; revenue: number }>;
    }>(`${endpoints.dashboard.ordersStats}?days=${days}`);
    return response.data;
  },

  getOrdersByStatus: async (): Promise<OrdersByStatus> => {
    const response = await apiClient.get<OrdersByStatus>(endpoints.dashboard.ordersByStatus);
    return response.data;
  },

  getRevenueChart: async (days = 30): Promise<RevenueChartData[]> => {
    const response = await apiClient.get<RevenueChartData[]>(
      `${endpoints.dashboard.revenueChart}?days=${days}`
    );
    return response.data;
  },

  getTopProducts: async (limit = 10): Promise<TopProduct[]> => {
    const response = await apiClient.get<TopProduct[]>(
      `${endpoints.dashboard.topProducts}?limit=${limit}`
    );
    return response.data;
  },

  getCategoryStats: async (): Promise<CategoryStat[]> => {
    const response = await apiClient.get<CategoryStat[]>(endpoints.dashboard.categoryStats);
    return response.data;
  },

  getBranchStats: async (branchId: string): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>(
      `${endpoints.dashboard.stats}?branchId=${branchId}`
    );
    return response.data;
  },
};

