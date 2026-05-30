import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Branch } from "@/lib/types";
import { logger } from "@/lib/logger";

interface BranchFilters {
  status?: string;
  city?: string;
  [key: string]: unknown;
}

interface InventoryItem {
  id?: string;
  _id?: string;
  productId: string;
  product?: { name: string; id: string };
  quantity: number;
  availableQuantity?: number;
  reservedQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  [key: string]: unknown;
}

export const branchService = {
  getBranches: async (filters?: BranchFilters): Promise<Branch[]> => {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, String(value));
        });
      }
      const url = params.toString() ? `${endpoints.branches.list}?${params.toString()}` : endpoints.branches.list;
      const response = await apiClient.get<Branch[]>(url);
      return response.data;
    } catch (error) {
      logger.apiError(error, "Get Branches");
      // Return empty array on error to prevent UI crashes
      return [];
    }
  },

  getActiveBranches: async (): Promise<Branch[]> => {
    const response = await apiClient.get<Branch[]>(endpoints.branches.active);
    return response.data;
  },

  getNearestBranches: async (lat: number, lng: number): Promise<Branch[]> => {
    const response = await apiClient.get<Branch[]>(`${endpoints.branches.nearest}?lat=${lat}&lng=${lng}`);
    return response.data;
  },

  getNearestBranch: async (lat: number, lng: number): Promise<Branch | null> => {
    const response = await apiClient.get<Branch>(`${endpoints.branches.nearestSingle}?lat=${lat}&lng=${lng}`);
    return response.data;
  },

  getMyBranch: async (): Promise<Branch | null> => {
    const response = await apiClient.get<Branch>(endpoints.branches.myBranch);
    return response.data;
  },

  getBranch: async (id: string): Promise<Branch> => {
    try {
      const response = await apiClient.get<Branch>(endpoints.branches.detail(id));
      return response.data;
    } catch (error) {
      throw new Error("Không thể tải thông tin chi nhánh");
    }
  },

  getBranchInventory: async (branchId: string, productId?: string): Promise<InventoryItem[]> => {
    try {
      const params = productId ? `?productId=${productId}` : "";
      const response = await apiClient.get<InventoryItem[]>(`${endpoints.branches.inventory(branchId)}${params}`);
      return response.data || [];
    } catch (error) {
      logger.apiError(error, "Get Branch Inventory");
      // Return empty array on error to prevent UI crashes
      // The UI will handle empty array as "no inventory" or show error state
      throw error; // Re-throw to let React Query handle retry logic
    }
  },

  create: async (data: Partial<Branch>): Promise<Branch> => {
    const response = await apiClient.post<Branch>(endpoints.branches.create, data);
    return response.data;
  },

  update: async (id: string, data: Partial<Branch>): Promise<Branch> => {
    const response = await apiClient.put<Branch>(endpoints.branches.update(id), data);
    return response.data;
  },

  approve: async (id: string, data: { approved: boolean; reason?: string }): Promise<Branch> => {
    // Backend ApproveBranchDto requires: status ('approved' | 'rejected'), rejectedReason (optional)
    const response = await apiClient.put<Branch>(endpoints.branches.approve(id), {
      status: data.approved ? 'approved' : 'rejected',
      ...(data.reason && { rejectedReason: data.reason }),
    });
    return response.data;
  },

  activate: async (id: string): Promise<Branch> => {
    const response = await apiClient.put<Branch>(endpoints.branches.activate(id));
    return response.data;
  },

  deactivate: async (id: string): Promise<Branch> => {
    const response = await apiClient.put<Branch>(endpoints.branches.deactivate(id));
    return response.data;
  },

  assignManager: async (id: string, managerId: string): Promise<Branch> => {
    const response = await apiClient.put<Branch>(endpoints.branches.assignManager(id), { managerId });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.branches.delete(id));
  },
};

