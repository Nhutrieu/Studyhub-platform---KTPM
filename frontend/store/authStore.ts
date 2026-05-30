import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, UserRole, AuthResponse } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  branchId: string | null;
  _hasHydrated?: boolean; // Flag to track when state has been restored from sessionStorage
  setAuth: (authData: AuthResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      role: null,
      branchId: null,
      _hasHydrated: false, // Initialize as false, will be set to true after hydration
      setAuth: (authData: AuthResponse) => {
        set({
          user: authData.user,
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          isAuthenticated: true,
          role: authData.user.role,
          branchId: authData.user.branchId || null,
        });
        // No cookies - all auth state is in sessionStorage (tab-specific)
      },
      setTokens: (accessToken: string, refreshToken: string) => {
        set({
          accessToken,
          refreshToken,
          // Keep isAuthenticated true if we have tokens
          isAuthenticated: !!accessToken && !!refreshToken,
        });
        // No cookies - all auth state is in sessionStorage (tab-specific)
      },
      setUser: (user: User) => {
        set({
          user,
          role: user.role,
          branchId: user.branchId || null,
        });
      },
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          role: null,
          branchId: null,
        });
        // No cookies to clear - all auth state is in sessionStorage (tab-specific)
      },
    }),
    {
      name: "auth-storage",
      // Use sessionStorage instead of localStorage to ensure each tab has its own session
      storage: createJSONStorage(() => sessionStorage),
      // Custom merge function to ensure isAuthenticated is calculated correctly
      merge: (persistedState: unknown, currentState: AuthState) => {
        const persisted = persistedState as Partial<AuthState>;
        // If we have accessToken and user in persisted state, set isAuthenticated to true
        const mergedState = { ...currentState, ...persisted };
        if (persisted?.accessToken && persisted?.user) {
          mergedState.isAuthenticated = true;
        } else {
          mergedState.isAuthenticated = false;
        }
        // Mark as hydrated after merge (even if no persisted state)
        mergedState._hasHydrated = true;
        return mergedState;
      },
      // Skip hydration if no persisted state exists
      skipHydration: false,
      // Exclude _hasHydrated from persistence (it's a runtime flag)
      partialize: (state: AuthState) => {
        const { _hasHydrated, ...persistedState } = state;
        return persistedState;
      },
      onRehydrateStorage: () => {
        return (state: AuthState | undefined) => {
          if (state) {
            state._hasHydrated = true;
            // Update isAuthenticated based on restored state
            if (state.accessToken && state.user) {
              state.isAuthenticated = true;
            } else {
              state.isAuthenticated = false;
            }
          }
        };
      },
    }
  )
);

