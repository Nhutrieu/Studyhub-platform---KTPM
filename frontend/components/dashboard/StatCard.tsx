"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statCardPattern } from "@/lib/design-system/patterns";
import Card from "@/components/ui/Card";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon?: ReactNode;
  className?: string;
}

/**
 * StatCard
 * 
 * Standard stat card for dashboard metrics.
 * 
 * Usage:
 * ```tsx
 * <StatCard
 *   title="Total Orders"
 *   value={1234}
 *   change={{ value: 12.5, label: "vs last month", isPositive: true }}
 * />
 * ```
 */
export default function StatCard({
  title,
  value,
  change,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn(statCardPattern.container, className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(statCardPattern.label)}>{title}</p>
          <p className={cn(statCardPattern.value, "mt-2")}>
            {typeof value === "number"
              ? value.toLocaleString("vi-VN")
              : value}
          </p>
          {change && (
            <div className={cn(statCardPattern.change, "flex items-center gap-1")}>
              {change.isPositive ? (
                <FiArrowUp className="w-4 h-4 text-success" />
              ) : (
                <FiArrowDown className="w-4 h-4 text-error" />
              )}
              <span
                className={cn(
                  "font-medium",
                  change.isPositive ? "text-success" : "text-error"
                )}
              >
                {Math.abs(change.value)}%
              </span>
              {change.label && (
                <span className="text-secondary-500">{change.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-secondary-300">{icon}</div>
        )}
      </div>
    </Card>
  );
}

