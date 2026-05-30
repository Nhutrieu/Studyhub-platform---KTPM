import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { ApiResponse } from "./types";
import { endpoints } from "./endpoints";
import { useAuthStore } from "@/store/authStore";

// Get API base URL - ensure it ends with /api
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    // If it already ends with /api, use as is
    if (envUrl.endsWith('/api')) {
      return envUrl;
    }
    // If it ends with /, remove it and add /api
    if (envUrl.endsWith('/')) {
      return `${envUrl}api`;
    }
    // Otherwise add /api
    return `${envUrl}/api`;
  }
  return "http://localhost:3001/api";
};

const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = useAuthStore.getState().accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // For FormData, remove Content-Type to let browser set it with boundary
      if (config.data instanceof FormData && config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to transform _id to id recursively
const transformId = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(transformId) as T;
  }
  
  if (typeof data === "object" && data.constructor === Object) {
    const transformed: Record<string, unknown> = {};
    const dataObj = data as Record<string, unknown>;
    for (const key in dataObj) {
      if (key === "_id") {
        // Always set id from _id if _id exists
        const idValue = dataObj[key]?.toString() || dataObj[key];
        if (idValue) {
          transformed.id = idValue;
        }
        // Also keep _id for backward compatibility
        transformed._id = dataObj[key];
      } else if (key === "id") {
        // If id already exists, keep it; otherwise it will be set from _id above
        transformed.id = dataObj[key]?.toString() || dataObj[key];
      } else {
        transformed[key] = transformId(dataObj[key]);
      }
    }
    // Ensure id exists if _id exists but id doesn't
    if (dataObj._id && !transformed.id) {
      transformed.id = dataObj._id?.toString() || dataObj._id;
    }
    return transformed as unknown as T;
  }
  
  return data;
};

// Response interceptor - unwrap data and handle refresh
apiClient.interceptors.response.use(
  (response) => {
    // Check if response.data is the standard ApiResponse format
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      const apiResponse = response.data as ApiResponse;
      
      // If it's an error response
      if (!apiResponse.success || (apiResponse.statusCode && apiResponse.statusCode >= 400)) {
        const error = new Error(apiResponse.message || "Request failed") as Error & { statusCode: number };
        error.statusCode = apiResponse.statusCode || response.status;
        return Promise.reject(error);
      }
      
      // Success response - unwrap data and transform _id to id
      const transformedData = transformId(apiResponse.data);
      return { ...response, data: transformedData };
    }
    
    // Response doesn't follow standard format - might be direct data
    // Transform _id to id anyway
    const transformedData = transformId(response.data);
    return { ...response, data: transformedData };
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (typeof window !== "undefined") {
          const authStore = useAuthStore.getState();
          const refreshToken = authStore.refreshToken;

          if (!refreshToken) {
            authStore.logout();
            return Promise.reject(error);
          }

          // Use axios directly for refresh to avoid interceptor recursion
          // Refresh endpoint should not require auth token
          const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            endpoints.auth.refresh,
            { refreshToken },
            {
              baseURL: getApiBaseUrl(),
              headers: { "Content-Type": "application/json" },
              withCredentials: true,
            }
          );

          // Unwrap ApiResponse manually
          if (!response.data.success || !response.data.data) {
            throw new Error(response.data.message || "Refresh token failed");
          }

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          authStore.setTokens(accessToken, newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
          isRefreshing = false;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;
        
        if (typeof window !== "undefined") {
          useAuthStore.getState().logout();
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors - unwrap ApiResponse if present
    let message = "Đã xảy ra lỗi. Vui lòng thử lại.";
    let statusCode = error.response?.status || 500;

    if (error.response?.data) {
      const responseData = error.response.data as ApiResponse | { message?: string | string[]; statusCode?: number; error?: string; errors?: Array<{ message?: string }> };
      
      // Check if it's the standard ApiResponse format
      if (responseData && typeof responseData === "object" && "success" in responseData) {
        const apiResponse = responseData as ApiResponse;
        message = apiResponse.message || message;
        statusCode = apiResponse.statusCode || statusCode;
      } 
      // Check if it's a validation error with message array
      else if (responseData && typeof responseData === "object" && "message" in responseData) {
        const msg = responseData.message;
        if (Array.isArray(msg)) {
          message = msg.join(", ");
        } else if (typeof msg === "string") {
          message = msg;
        }
        statusCode = responseData.statusCode || statusCode;
      }
      // Check if message is directly in responseData
      else if (typeof responseData === "string") {
        message = responseData;
      }
      // Check for nested error message
      else if (responseData && typeof responseData === "object") {
        if ("error" in responseData && typeof responseData.error === "string") {
          message = responseData.error;
        } else if ("errors" in responseData && Array.isArray(responseData.errors)) {
          message = responseData.errors.map((e: { message?: string } | string) => (typeof e === 'object' ? e.message : e) || String(e)).join(", ");
        }
      }
    } else if (error.message) {
      message = error.message;
    }

    const apiError = new Error(message) as Error & { statusCode: number; response?: unknown };
    apiError.statusCode = statusCode;
    apiError.response = error.response;
    return Promise.reject(apiError);
  }
);

export default apiClient;

