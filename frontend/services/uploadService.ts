import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { logger } from "@/lib/logger";

interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export const uploadService = {
  uploadImage: async (fileOrFormData: File | FormData): Promise<UploadResult> => {
    try {
      let formData: FormData;
      if (fileOrFormData instanceof File) {
        formData = new FormData();
        formData.append("file", fileOrFormData);
      } else {
        formData = fileOrFormData;
      }
      
      // Don't set Content-Type header - let browser set it with boundary
      const response = await apiClient.post<UploadResult>(
        endpoints.upload.image,
        formData,
        {
          headers: {
            // Remove Content-Type to let browser set it automatically with boundary
          },
        }
      );
      return response.data;
    } catch (error: unknown) {
      logger.error("Upload image error:", error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                           (error as { message?: string })?.message || 
                           "Không thể upload ảnh";
      throw new Error(errorMessage);
    }
  },

  uploadImages: async (files: File[]): Promise<UploadResult[]> => {
    try {
      if (!files || files.length === 0) {
        throw new Error("Không có file nào được chọn");
      }
      
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      
      // Don't set Content-Type header - let browser set it with boundary
      const response = await apiClient.post<UploadResult[]>(
        endpoints.upload.images,
        formData,
        {
          headers: {
            // Remove Content-Type to let browser set it automatically with boundary
          },
        }
      );
      return response.data;
    } catch (error: unknown) {
      logger.error("Upload images error:", error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                           (error as { message?: string })?.message || 
                           "Không thể upload ảnh";
      throw new Error(errorMessage);
    }
  },

  uploadFile: async (file: File): Promise<UploadResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Don't set Content-Type header - let browser set it with boundary
      const response = await apiClient.post<UploadResult>(
        endpoints.upload.file,
        formData,
        {
          headers: {
            // Remove Content-Type to let browser set it automatically with boundary
          },
        }
      );
      return response.data;
    } catch (error: unknown) {
      logger.error("Upload file error:", error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                           (error as { message?: string })?.message || 
                           "Không thể upload file";
      throw new Error(errorMessage);
    }
  },

  uploadHero: async (file: File): Promise<UploadResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await apiClient.post<UploadResult>(
        endpoints.upload.hero,
        formData,
        {
          headers: {
            // Remove Content-Type to let browser set it automatically with boundary
          },
        }
      );
      return response.data;
    } catch (error: unknown) {
      logger.error("Upload hero image error:", error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                           (error as { message?: string })?.message || 
                           "Không thể upload ảnh hero";
      throw new Error(errorMessage);
    }
  },

  uploadCategory: async (file: File): Promise<UploadResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await apiClient.post<UploadResult>(
        endpoints.upload.category,
        formData,
        {
          headers: {
            // Remove Content-Type to let browser set it automatically with boundary
          },
        }
      );
      return response.data;
    } catch (error: unknown) {
      logger.error("Upload category image error:", error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                           (error as { message?: string })?.message || 
                           "Không thể upload ảnh category";
      throw new Error(errorMessage);
    }
  },
};

