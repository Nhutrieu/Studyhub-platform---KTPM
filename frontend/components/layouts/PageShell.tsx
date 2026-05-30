"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pageContainer } from "@/lib/design-system/theme";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * PageShell
 * 
 * Universal page container that enforces consistent max-width and padding.
 * MUST be used on every page to ensure layout consistency.
 * 
 * Usage:
 * ```tsx
 * <PageShell>
 *   <PageHeader title="Orders" />
 *   <div>Content here</div>
 * </PageShell>
 * ```
 */
export default function PageShell({
  children,
  className,
  maxWidth = "xl",
}: PageShellProps) {
  const maxWidthClasses = {
    sm: "max-w-[640px]",
    md: "max-w-[768px]",
    lg: "max-w-[1024px]",
    xl: "max-w-[1280px]",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        pageContainer,
        maxWidthClasses[maxWidth],
        "w-full",
        className
      )}
    >
      {children}
    </div>
  );
}

