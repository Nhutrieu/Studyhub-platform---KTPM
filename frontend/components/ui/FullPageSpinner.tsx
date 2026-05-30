"use client";

import { cn } from "@/lib/utils";

interface FullPageSpinnerProps {
  message?: string;
  className?: string;
}

/**
 * FullPageSpinner
 * 
 * Full-page loading spinner for authentication checks and initial loads.
 * 
 * Usage:
 * ```tsx
 * <FullPageSpinner message="Đang tải..." />
 * ```
 */
export default function FullPageSpinner({ message, className }: FullPageSpinnerProps) {
  return (
    <div
      className={cn(
        "min-h-screen w-full max-w-full overflow-x-hidden",
        "flex items-center justify-center",
        "bg-secondary-50",
        className
      )}
    >
      <div className="text-center">
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary-200 border-t-secondary-900 mx-auto mb-4"></div>
        </div>
        {message && (
          <p className="text-sm text-secondary-600 mt-4">{message}</p>
        )}
      </div>
    </div>
  );
}

