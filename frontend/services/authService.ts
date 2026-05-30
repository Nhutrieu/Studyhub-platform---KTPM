import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { AuthResponse, User } from "@/lib/types";

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      endpoints.auth.login,
      { email, password }
    );
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    role?: string,
    branchId?: string
  ): Promise<AuthResponse> => {
    // Backend RegisterDto requires: email, password, name (not fullName), phone (optional), role (optional), branchId (optional)
    const response = await apiClient.post<AuthResponse>(
      endpoints.auth.register,
      { 
        email, 
        password, 
        name: fullName, // Backend expects 'name', not 'fullName'
        ...(phone && { phone }),
        ...(role && { role }),
        ...(branchId && { branchId }),
      }
    );
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.post<User>(endpoints.auth.me);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      endpoints.auth.refresh,
      { refreshToken }
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(endpoints.auth.logout);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      endpoints.auth.forgotPassword,
      { email }
    );
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      endpoints.auth.resetPassword,
      { token, password }
    );
    return response.data;
  },
};

