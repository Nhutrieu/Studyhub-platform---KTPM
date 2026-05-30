"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { errorStatePattern } from "@/lib/design-system/patterns";
import Button from "./Button";
import { FiAlertCircle } from "react-icons/fi";

interface ErrorStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * ErrorState
 * 
 * Standard error state component for when something goes wrong.
 * 
 * Usage:
 * ```tsx
 * <ErrorState
 *   title="Failed to load orders"
 *   description="Please try again later"
 *   action={{ label: "Retry", onClick: handleRetry }}
 * />
 * ```
 */
export default function ErrorState({
  icon,
  title = "Something went wrong",
  description = "An error occurred while loading this content.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn(errorStatePattern.container, className)}>
      {icon || (
        <FiAlertCircle className={cn(errorStatePattern.icon)} />
      )}
      <h3 className={cn(errorStatePattern.title)}>{title}</h3>
      {description && (
        <p className={cn(errorStatePattern.description)}>{description}</p>
      )}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

