"use client";

import { ReactNode } from "react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell
 * 
 * Global wrapper for customer/public pages.
 * Provides navbar and footer with consistent layout.
 * 
 * Usage:
 * ```tsx
 * <AppShell>
 *   <PageShell>
 *     <div>Content</div>
 *   </PageShell>
 * </AppShell>
 * ```
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden bg-gradient-to-b from-white via-secondary-50 to-white text-secondary-900">
      <Navbar />
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <div className="relative isolate">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />
          <div className="relative">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

