import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Review } from "@/lib/types";

interface CreateReviewData {
  productId: string;
  orderId?: string; // Optional in frontend, but backend may require it
  rating: number;
  comment: string; // Backend requires comment (not optional)
  customerName: string; // Backend requires customerName
  images?: string[];
}

export const reviewService = {
  create: async (data: CreateReviewData): Promise<Review> => {
    // Backend CreateReviewDto requires: productId, rating, comment, customerName, images (optional)
    const response = await apiClient.post<Review>(endpoints.reviews.create, {
      productId: data.productId,
      rating: data.rating,
      comment: data.comment,
      customerName: data.customerName,
      ...(data.images && data.images.length > 0 && { images: data.images }),
    });
    return response.data;
  },

  getProductReviews: async (productId: string): Promise<Review[]> => {
    const response = await apiClient.get<Review[]>(endpoints.reviews.byProduct(productId));
    return response.data;
  },

  getByProduct: async (productId: string): Promise<Review[]> => {
    return reviewService.getProductReviews(productId);
  },

  getMyReviews: async (): Promise<Review[]> => {
    const response = await apiClient.get<Review[]>(endpoints.reviews.myReviews);
    return response.data;
  },

  update: async (id: string, data: Partial<Review>): Promise<Review> => {
    const response = await apiClient.put<Review>(endpoints.reviews.update(id), data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.reviews.delete(id));
  },

  getUnreviewedProductsFromOrder: async (orderId: string): Promise<Array<{ productId: string; productName: string; quantity: number; image?: string }>> => {
    const response = await apiClient.get<Array<{ productId: string; productName: string; quantity: number; image?: string }>>(
      endpoints.reviews.unreviewedFromOrder(orderId)
    );
    return response.data;
  },
};

