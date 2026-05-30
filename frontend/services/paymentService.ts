import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";

interface CreatePaymentData {
  orderId: string;
  amount: number;
  method: PaymentMethod | string;
  orderDescription?: string;
}

interface VnpayPaymentData {
  orderId: string;
  amount: number;
  orderDescription?: string;
  bankCode?: string;
  orderType?: string;
  language?: string;
}

export interface PaymentFilters {
  status?: string;
  method?: string;
  orderId?: string;
}

export const paymentService = {
  create: async (data: CreatePaymentData): Promise<Payment> => {
    const response = await apiClient.post<Payment>(endpoints.payments.create, data);
    return response.data;
  },

  createVnpayUrl: async (data: VnpayPaymentData): Promise<{ paymentUrl: string; paymentId: string }> => {
    const response = await apiClient.post<{ paymentUrl: string; paymentId: string }>(
      endpoints.payments.createVnpayUrl,
      data
    );
    return response.data;
  },

  getMyPayments: async (): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>(endpoints.payments.myPayments);
    return response.data;
  },

  getPaymentByOrderId: async (orderId: string): Promise<Payment | null> => {
    const response = await apiClient.get<Payment>(endpoints.payments.byOrderId(orderId));
    return response.data;
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await apiClient.get<Payment>(endpoints.payments.detail(id));
    return response.data;
  },

  updateStatus: async (id: string, status: PaymentStatus | string): Promise<Payment> => {
    const response = await apiClient.put<Payment>(endpoints.payments.updateStatus(id), { status });
    return response.data;
  },

  getPayments: async (filters?: PaymentFilters): Promise<Payment[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const url = params.toString() ? `${endpoints.payments.list}?${params.toString()}` : endpoints.payments.list;
    const response = await apiClient.get<Payment[]>(url);
    return response.data;
  },
};

