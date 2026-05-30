/**
 * AppShell Protected
 * 
 * Layout wrapper for authenticated pages (dashboard, account, etc.)
 * Includes: Sidebar (role-based), Topbar, Main content area
 * Requires authentication and role-based access control
 */

"use client";

import { ReactNode, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FiMenu, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface AppShellProtectedProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function AppShellProtected({ children, allowedRoles }: AppShellProtectedProps) {
  const { isAuthenticated, role, user, accessToken, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Wait for hydration before checking auth
  const needsAuthRedirect = _hasHydrated && (!isAuthenticated || !accessToken || !user);
  const needsRoleRedirect =
    _hasHydrated && !needsAuthRedirect && !!allowedRoles && (!role || !allowedRoles.includes(role));
  const isChecking = !_hasHydrated || needsAuthRedirect || needsRoleRedirect;

  useEffect(() => {
    // Don't check until hydrated
    if (!_hasHydrated) {
      return;
    }

    // Check authentication
    if (needsAuthRedirect) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/auth/login?returnUrl=${returnUrl}`);
      return;
    }

    // Check role if specified
    if (needsRoleRedirect) {
      router.push("/");
      return;
    }
  }, [_hasHydrated, needsAuthRedirect, needsRoleRedirect, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken || !user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-secondary-50 w-full max-w-full overflow-x-hidden">
      {/* Mobile menu button */}
      <button
        className={cn(
          "lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md",
          "transition-all duration-200 ease-out",
          "hover:bg-secondary-50 active:scale-95",
          "[@media(prefers-reduced-motion:reduce)]:active:scale-100"
        )}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <FiX className="w-6 h-6 text-secondary-700" />
        ) : (
          <FiMenu className="w-6 h-6 text-secondary-700" />
        )}
      </button>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64 w-full max-w-full overflow-x-hidden">
        <Topbar />
        <main className="min-h-screen w-full max-w-full overflow-x-hidden p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

