import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Order, PaginatedResponse } from "@/lib/types";

interface CreateOrderData {
  items: Array<{
    productId: string;
    productName?: string; // Backend requires productName
    quantity: number;
    price: number;
    discount?: number;
  }>;
  shippingAddress: string;
  phone: string;
  paymentMethod?: "COD" | "WALLET" | "VNPAY" | "MOMO" | "ZALOPAY" | "STRIPE" | "cod" | "stripe" | "momo" | "vnpay";
  notes?: string;
  shippingCoordinates?: {
    lat: number;
    lng: number;
  };
  promotionId?: string;
  promotionCode?: string;
  discount?: number; // Promotion discount amount
}

export const orderService = {
  getMyOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>(endpoints.orders.myOrders);
    return response.data;
  },

  getOrdersForShipper: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>(endpoints.orders.forShipper);
    return response.data;
  },

  getOrders: async (page = 1, limit = 10, filters?: Record<string, unknown>): Promise<PaginatedResponse<Order>> => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const response = await apiClient.get<PaginatedResponse<Order>>(
      `${endpoints.orders.list}?${params.toString()}`
    );
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(
      endpoints.orders.detail(id)
    );
    return response.data;
  },

  createOrder: async (data: CreateOrderData): Promise<Order> => {
    // Build shipping address object if needed
    let shippingAddress: string;
    if (typeof data.shippingAddress === "string") {
      shippingAddress = data.shippingAddress;
    } else if (data.shippingAddress && typeof data.shippingAddress === "object") {
      const addr = data.shippingAddress as { street?: string; ward?: string; district?: string; city?: string };
      shippingAddress = `${addr.street || ""}, ${addr.ward || ""}, ${addr.district || ""}, ${addr.city || ""}`.trim();
    } else {
      shippingAddress = "";
    }
    
    // Ensure items have productName (required by backend)
    const items = data.items.map(item => ({
      productId: item.productId,
      productName: item.productName || "Product", // Backend requires this
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
    }));
    
    const response = await apiClient.post<Order>(
      endpoints.orders.create,
      {
        items,
        shippingAddress,
        phone: data.phone || "",
        paymentMethod: data.paymentMethod?.toLowerCase() || "cod",
        notes: data.notes,
        shippingCoordinates: data.shippingCoordinates,
        promotionId: data.promotionId,
        promotionCode: data.promotionCode,
        discount: data.discount, // Send promotion discount amount
      }
    );
    return response.data;
  },

  updateStatus: async (id: string, status: string, notes?: string, deliveryConfirmation?: string, deliveryProof?: string, adminReason?: string): Promise<Order> => {
    // Backend UpdateOrderStatusDto: status, deliveryConfirmation, deliveryNotes, deliveryProof, adminReason
    const response = await apiClient.put<Order>(
      endpoints.orders.updateStatus(id),
      { 
        status,
        ...(notes && { deliveryNotes: notes }),
        ...(deliveryConfirmation && { deliveryConfirmation }),
        ...(deliveryProof && { deliveryProof }),
        ...(adminReason && { adminReason }),
      }
    );
    return response.data;
  },

  assignShipper: async (id: string, shipperId: string): Promise<Order> => {
    const response = await apiClient.put<Order>(
      endpoints.orders.assignShipper(id),
      { shipperId }
    );
    return response.data;
  },

  assignEmployee: async (id: string, employeeId: string): Promise<Order> => {
    const response = await apiClient.put<Order>(
      endpoints.orders.assignEmployee(id),
      { employeeId }
    );
    return response.data;
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const response = await apiClient.put<Order>(
      endpoints.orders.cancel(id),
      { reason }
    );
    return response.data;
  },

  getAuditLogs: async (id: string): Promise<Array<{
    id: string;
    orderId: string;
    action: string;
    performedBy: string;
    performedByName?: string;
    oldStatus?: string;
    newStatus?: string;
    notes?: string;
    createdAt: string;
  }>> => {
    const response = await apiClient.get<Array<{
      id: string;
      orderId: string;
      action: string;
      performedBy: string;
      performedByName?: string;
      oldStatus?: string;
      newStatus?: string;
      notes?: string;
      createdAt: string;
    }>>(endpoints.orders.auditLogs(id));
    return response.data;
  },

  updateItemQuantity: async (orderId: string, productId: string, quantity: number): Promise<Order> => {
    const response = await apiClient.patch<Order>(
      endpoints.orders.updateItemQuantity(orderId, productId),
      { quantity }
    );
    return response.data;
  },
};

