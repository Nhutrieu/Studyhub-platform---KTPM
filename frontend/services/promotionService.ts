import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Promotion as LibPromotion } from "@/lib/types";

type Promotion = LibPromotion;

interface ApplyPromotionData {
  code?: string; // Optional - can use promotionId instead
  promotionId?: string; // Optional - can use code instead
  items: Array<{ productId: string; quantity: number; price: number }>; // Backend requires items array
  totalAmount: number; // Backend uses totalAmount (not orderAmount)
  orderAmount?: number; // Alias for backward compatibility
}

interface PromotionFilters {
  isActive?: boolean;
  code?: string;
  [key: string]: unknown;
}

export const promotionService = {
  getPromotions: async (filters?: PromotionFilters): Promise<Promotion[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const url = params.toString() ? `${endpoints.promotions.list}?${params.toString()}` : endpoints.promotions.list;
    const response = await apiClient.get<Promotion[]>(url);
    return response.data;
  },

  getActivePromotions: async (filters?: PromotionFilters): Promise<Promotion[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const url = params.toString() ? `${endpoints.promotions.active}?${params.toString()}` : endpoints.promotions.active;
    const response = await apiClient.get<Promotion[]>(url);
    return response.data;
  },

  getPromotion: async (id: string): Promise<Promotion> => {
    const response = await apiClient.get<Promotion>(endpoints.promotions.detail(id));
    return response.data;
  },

  getPromotionByCode: async (code: string): Promise<Promotion> => {
    const response = await apiClient.get<Promotion>(endpoints.promotions.byCode(code));
    return response.data;
  },

  create: async (data: Partial<Promotion>): Promise<Promotion> => {
    const response = await apiClient.post<Promotion>(endpoints.promotions.create, data);
    return response.data;
  },

  update: async (id: string, data: Partial<Promotion>): Promise<Promotion> => {
    const response = await apiClient.put<Promotion>(endpoints.promotions.update(id), data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.promotions.delete(id));
  },

  apply: async (data: ApplyPromotionData): Promise<{ discount: number; promotionId?: string }> => {
    // Transform data to match backend DTO
    const requestData = {
      code: data.code,
      promotionId: data.promotionId,
      items: data.items || [],
      totalAmount: data.totalAmount || data.orderAmount || 0,
    };
    const response = await apiClient.post<{ discount: number; promotionId?: string }>(
      endpoints.promotions.apply,
      requestData
    );
    return response.data;
  },
};

