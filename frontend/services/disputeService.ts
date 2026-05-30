import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Dispute, DisputeType } from "@/lib/types";
import { logger } from "@/lib/logger";

interface CreateDisputeData {
  orderId: string;
  type: DisputeType | "return" | "warranty" | "assembly" | "quality" | "damage" | "missing" | "wrong_item" | "delivery" | "payment" | "other"; // Support both backend and legacy types
  reason: string; // Required by backend, will be filled from description if not provided
  description: string; // Backend requires description
  images?: string[]; // Evidence images
}

export const disputeService = {
  create: async (data: CreateDisputeData): Promise<Dispute> => {
    try {
      // Backend CreateDisputeDto requires: orderId, type (enum), reason, description, images (optional)
      // Map legacy types to backend types
      const typeMap: Record<string, string> = {
        'return': 'other',
        'warranty': 'other',
        'assembly': 'other',
      };
      const backendType = typeMap[data.type] || data.type;
      
      const response = await apiClient.post<Dispute>(endpoints.disputes.create, {
        orderId: data.orderId,
        type: backendType,
        reason: data.reason || data.description.substring(0, 100), // Fallback if reason is empty
        description: data.description,
        ...(data.images && data.images.length > 0 && { images: data.images }),
      });
      return response.data;
    } catch (error: any) {
      // Re-throw with better error message
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể tạo yêu cầu hỗ trợ';
      throw new Error(errorMessage);
    }
  },

  getDisputes: async (status?: string): Promise<Dispute[]> => {
    const params = status ? `?status=${status}` : "";
    const response = await apiClient.get<Dispute[]>(`${endpoints.disputes.list}${params}`);
    return response.data;
  },

  getMyDisputes: async (): Promise<Dispute[]> => {
    const response = await apiClient.get<Dispute[]>(endpoints.disputes.myDisputes);
    return response.data;
  },

  getDispute: async (id: string): Promise<Dispute> => {
    const response = await apiClient.get<Dispute>(endpoints.disputes.detail(id));
    return response.data;
  },

  getByOrderId: async (orderId: string): Promise<Dispute | null> => {
    try {
      const response = await apiClient.get<Dispute>(endpoints.disputes.byOrderId(orderId));
      return response.data;
    } catch (error) {
      logger.apiError(error, "Get Dispute By Order ID");
      // Return null if dispute not found (404) or other errors
      return null;
    }
  },

  getStats: async (): Promise<Record<string, number>> => {
    const response = await apiClient.get<Record<string, number>>(endpoints.disputes.stats);
    return response.data;
  },

  update: async (id: string, data: Partial<Dispute>): Promise<Dispute> => {
    const response = await apiClient.put<Dispute>(endpoints.disputes.update(id), data);
    return response.data;
  },
};

