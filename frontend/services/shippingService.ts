import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Shipping } from "@/lib/types";

export const shippingService = {
  getByOrderId: async (orderId: string): Promise<Shipping> => {
    const response = await apiClient.get<Shipping>(endpoints.shipping.byOrderId(orderId));
    return response.data;
  },

  getMyDeliveries: async (): Promise<Shipping[]> => {
    const response = await apiClient.get<Shipping[]>(endpoints.shipping.myDeliveries);
    return response.data;
  },

  updateStatus: async (orderId: string, data: { status: string; notes?: string; proofImage?: string; proofOfDeliveryImages?: string[]; currentLocation?: string; deliveryNote?: string; deliveryFailedReason?: string; estimatedDelivery?: string }): Promise<Shipping> => {
    // Backend UpdateShippingDto supports: status, currentLocation, proofOfDeliveryImages, proofOfDeliveryImage, customerSignature, deliveryNote, deliveryFailedReason, deliveryFailedProofs, estimatedDelivery
    interface UpdateShippingDto {
      status: string;
      deliveryNote?: string;
      currentLocation?: string;
      proofOfDeliveryImage?: string;
      proofOfDeliveryImages?: string[];
      deliveryFailedReason?: string;
      estimatedDelivery?: string;
    }

    const requestData: UpdateShippingDto = {
      status: data.status,
      ...(data.notes && { deliveryNote: data.notes }),
      ...(data.currentLocation && { currentLocation: data.currentLocation }),
      ...(data.proofImage && { proofOfDeliveryImage: data.proofImage }),
      ...(data.proofOfDeliveryImages && { proofOfDeliveryImages: data.proofOfDeliveryImages }),
      ...(data.deliveryNote && { deliveryNote: data.deliveryNote }),
      ...(data.deliveryFailedReason && { deliveryFailedReason: data.deliveryFailedReason }),
      ...(data.estimatedDelivery && { estimatedDelivery: data.estimatedDelivery }),
    };
    const response = await apiClient.put<Shipping>(endpoints.shipping.updateStatus(orderId), requestData);
    return response.data;
  },

  getHistory: async (): Promise<Shipping[]> => {
    const response = await apiClient.get<Shipping[]>(endpoints.shipping.history);
    return response.data;
  },
};

