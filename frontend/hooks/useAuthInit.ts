"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Hook to ensure auth state is properly initialized after page refresh
 * Waits for zustand persist to restore state from sessionStorage
 * Each tab has its own session, so tokens are isolated per tab
 */
export function useAuthInit() {
  const { accessToken, user, _hasHydrated } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Wait for hydration to complete
    if (!_hasHydrated) {
      // Check periodically until hydrated
      const interval = setInterval(() => {
        const state = useAuthStore.getState();
        if (state._hasHydrated) {
          clearInterval(interval);
          setIsInitialized(true);
        }
      }, 50);
      
      return () => clearInterval(interval);
    }
    
    setIsInitialized(true);
  }, [_hasHydrated]);

  // Update isAuthenticated when state changes (after hydration)
  useEffect(() => {
    if (!_hasHydrated) return;
    
    const state = useAuthStore.getState();
    if (state.accessToken && state.user) {
      if (!state.isAuthenticated) {
        useAuthStore.setState({ isAuthenticated: true });
      }
    } else if ((!state.accessToken || !state.user) && state.isAuthenticated) {
      useAuthStore.setState({ isAuthenticated: false });
    }
  }, [accessToken, user, _hasHydrated]);

  return isInitialized;
}

