"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { emptyStatePattern } from "@/lib/design-system/patterns";
import Button from "./Button";
import { FiPackage } from "react-icons/fi";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState
 * 
 * Standard empty state component for when there's no data to display.
 * 
 * Usage:
 * ```tsx
 * <EmptyState
 *   title="No orders found"
 *   description="Get started by creating your first order"
 *   action={{ label: "Create Order", onClick: handleCreate }}
 * />
 * ```
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStatePattern.container, className)}>
      {icon || (
        <FiPackage className={cn(emptyStatePattern.icon)} />
      )}
      <h3 className={cn(emptyStatePattern.title)}>{title}</h3>
      {description && (
        <p className={cn(emptyStatePattern.description)}>{description}</p>
      )}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

