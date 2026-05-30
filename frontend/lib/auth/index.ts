/**
 * Auth Utilities
 * 
 * Centralized authentication utilities.
 */

export * from "./guards";
export * from "./roles";

// Token storage utilities
// Using sessionStorage instead of localStorage to ensure each tab has its own session
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("accessToken");
  },

  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("refreshToken");
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("accessToken", accessToken);
    sessionStorage.setItem("refreshToken", refreshToken);
  },

  clearTokens: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
  },
};

