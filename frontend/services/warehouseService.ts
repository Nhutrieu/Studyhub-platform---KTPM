import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";

interface Warehouse {
  id: string;
  name: string;
  branchId?: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  product?: { id: string; name: string; [key: string]: unknown };
  branchId?: string;
  branch?: { id: string; name: string; [key: string]: unknown };
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

interface WarehouseTransaction {
  id: string;
  warehouseId: string;
  type: "import" | "export" | "adjust";
  quantity: number;
  reason?: string;
  performedBy: string;
  createdAt: string;
}

export const warehouseService = {
  create: async (data: { productId: string; productName: string; quantity: number; location?: string; minStockLevel?: number; maxStockLevel?: number; branchId?: string }): Promise<Warehouse> => {
    // Backend CreateWarehouseDto requires: productId, productName, quantity
    // Backend optional: location, minStockLevel, maxStockLevel, branchId
    const response = await apiClient.post<Warehouse>(endpoints.warehouse.create, {
      productId: data.productId,
      productName: data.productName,
      quantity: data.quantity,
      ...(data.location && { location: data.location }),
      ...(data.minStockLevel !== undefined && { minStockLevel: data.minStockLevel }),
      ...(data.maxStockLevel !== undefined && { maxStockLevel: data.maxStockLevel }),
      ...(data.branchId && { branchId: data.branchId }), // CRITICAL: Pass branchId for branch inventory
    });
    return response.data;
  },

  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await apiClient.get<Warehouse[]>(endpoints.warehouse.list);
    return response.data;
  },

  getInventory: async (branchId?: string, productId?: string): Promise<InventoryItem[]> => {
    const params = new URLSearchParams();
    if (branchId) params.append("branchId", branchId);
    if (productId) params.append("productId", productId);
    const queryString = params.toString();
    const url = queryString ? `${endpoints.warehouse.inventory}?${queryString}` : endpoints.warehouse.inventory;
    const response = await apiClient.get<InventoryItem[]>(url);
    return response.data;
  },

  getWarehouse: async (id: string): Promise<Warehouse> => {
    const response = await apiClient.get<Warehouse>(endpoints.warehouse.detail(id));
    return response.data;
  },

  getLowStock: async (threshold?: number): Promise<InventoryItem[]> => {
    const params = threshold ? `?threshold=${threshold}` : "";
    const response = await apiClient.get<InventoryItem[]>(`${endpoints.warehouse.lowStock}${params}`);
    return response.data;
  },

  getByProduct: async (productId: string): Promise<InventoryItem[]> => {
    const response = await apiClient.get<InventoryItem[]>(endpoints.warehouse.byProduct(productId));
    return response.data;
  },

  addTransaction: async (warehouseId: string, data: { type: string; quantity: number; reason?: string; productId?: string; orderId?: string }): Promise<WarehouseTransaction> => {
    // Backend WarehouseTransactionDto requires: productId, quantity, type (enum), orderId (optional), note (optional)
    const response = await apiClient.post<WarehouseTransaction>(endpoints.warehouse.addTransaction(warehouseId), {
      productId: data.productId || '',
      quantity: data.quantity,
      type: data.type, // Must be one of: 'import', 'export', 'adjustment', 'damaged', 'returned'
      ...(data.orderId && { orderId: data.orderId }),
      ...(data.reason && { note: data.reason }), // Backend uses 'note', not 'reason'
    });
    return response.data;
  },

  adjustStock: async (warehouseId: string, data: { quantity: number; reason?: string }): Promise<InventoryItem> => {
    // Backend AdjustStockDto requires: quantity, note (optional)
    const response = await apiClient.put<InventoryItem>(endpoints.warehouse.adjustStock(warehouseId), {
      quantity: data.quantity,
      ...(data.reason && { note: data.reason }), // Backend uses 'note', not 'reason'
    });
    return response.data;
  },

  reserveStock: async (productId: string, quantity: number, branchId?: string): Promise<InventoryItem> => {
    // Backend requires: { quantity: number; branchId?: string }
    const response = await apiClient.post<InventoryItem>(endpoints.warehouse.reserveStock(productId), { 
      quantity,
      ...(branchId && { branchId }), // CRITICAL: Pass branchId for branch-specific reservation
    });
    return response.data;
  },

  releaseStock: async (productId: string, quantity: number, branchId?: string): Promise<InventoryItem> => {
    // Backend requires: { quantity: number; branchId?: string }
    const response = await apiClient.post<InventoryItem>(endpoints.warehouse.releaseStock(productId), { 
      quantity,
      ...(branchId && { branchId }), // CRITICAL: Pass branchId for branch-specific release
    });
    return response.data;
  },
};

