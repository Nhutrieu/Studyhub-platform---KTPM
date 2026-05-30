import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Product, PaginatedResponse } from "@/lib/types";

interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  material?: string;
  search?: string;
  status?: string;
  rating?: number;
  sortBy?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const productService = {
  getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append("categoryId", filters.categoryId);
    if (filters?.minPrice !== undefined && filters.minPrice !== null) {
      params.append("minPrice", filters.minPrice.toString());
    }
    if (filters?.maxPrice !== undefined && filters.maxPrice !== null) {
      params.append("maxPrice", filters.maxPrice.toString());
    }
    if (filters?.material) params.append("material", filters.material);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.rating !== undefined) params.append("rating", filters.rating.toString());
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Product>>(
      `${endpoints.products.list}?${params.toString()}`
    );
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await apiClient.get<Product>(
      endpoints.products.detail(id)
    );
    return response.data;
  },

  getFeaturedProducts: async (limit = 8): Promise<PaginatedResponse<Product>> => {
    const response = await apiClient.get<PaginatedResponse<Product>>(
      `${endpoints.products.featured}?limit=${limit}`
    );
    return response.data;
  },

  searchProducts: async (query: string, filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const response = await apiClient.get<PaginatedResponse<Product>>(
      `${endpoints.products.search}?${params.toString()}`
    );
    return response.data;
  },

  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.post<Product>(
      endpoints.products.create,
      data
    );
    return response.data;
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.put<Product>(
      endpoints.products.update(id),
      data
    );
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.products.delete(id));
  },
};

