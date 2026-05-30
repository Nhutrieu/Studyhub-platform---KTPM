/**
 * Auth Guards
 * 
 * Components to protect routes based on authentication and roles.
 */

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard - Protects routes that require authentication
 */
export function AuthGuard({ children, redirectTo = "/auth/login" }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, accessToken, user, _hasHydrated } = useAuthStore();

  // Wait for hydration before checking auth
  useEffect(() => {
    if (!_hasHydrated) {
      return; // Wait for state to be restored
    }

    if (!isAuthenticated || !accessToken || !user) {
      // Save the current path to redirect back after login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
    }
  }, [_hasHydrated, isAuthenticated, accessToken, user, router, pathname, redirectTo]);

  // Show loading while waiting for hydration
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken || !user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleGuard - Protects routes based on user role
 */
export function RoleGuard({ children, allowedRoles, redirectTo = "/" }: RoleGuardProps) {
  const router = useRouter();
  const { role, isAuthenticated, accessToken, user, _hasHydrated } = useAuthStore();

  // Wait for hydration before checking
  useEffect(() => {
    if (!_hasHydrated) {
      return; // Wait for state to be restored
    }

    if (isAuthenticated && accessToken && user) {
      if (!role || !allowedRoles.includes(role)) {
        router.push(redirectTo);
      }
    }
  }, [_hasHydrated, role, allowedRoles, isAuthenticated, accessToken, user, router, redirectTo]);

  // Show loading while waiting for hydration
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken || !user || !role || !allowedRoles.includes(role)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

/**
 * PublicOnly - Only allows access when NOT authenticated
 */
export function PublicOnly({ children, redirectTo = "/" }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, accessToken, user, _hasHydrated } = useAuthStore();

  // Wait for hydration before checking
  useEffect(() => {
    if (!_hasHydrated) {
      return; // Wait for state to be restored
    }

    if (isAuthenticated && accessToken && user) {
      router.push(redirectTo);
    }
  }, [_hasHydrated, isAuthenticated, accessToken, user, router, redirectTo]);

  // Show loading while waiting for hydration
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated && accessToken && user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

