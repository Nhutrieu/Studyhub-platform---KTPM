import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Category } from "@/lib/types";

export const categoryService = {
  getCategories: async (includeInactive = false): Promise<Category[]> => {
    const params = includeInactive ? "?includeInactive=true" : "";
    const response = await apiClient.get<Category[]>(`${endpoints.categories.list}${params}`);
    return response.data;
  },

  getCategoriesByParent: async (parentId?: string): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>(endpoints.categories.byParent(parentId));
    return response.data;
  },

  getCategoryBySlug: async (slug: string): Promise<Category> => {
    const response = await apiClient.get<Category>(endpoints.categories.bySlug(slug));
    return response.data;
  },

  getCategory: async (id: string): Promise<Category> => {
    const response = await apiClient.get<Category>(endpoints.categories.detail(id));
    return response.data;
  },

  create: async (data: Partial<Category>): Promise<Category> => {
    const response = await apiClient.post<Category>(endpoints.categories.create, data);
    return response.data;
  },

  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    const response = await apiClient.put<Category>(endpoints.categories.update(id), data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.categories.delete(id));
  },
};

