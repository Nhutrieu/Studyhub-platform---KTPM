/**
 * FiltersBar
 * 
 * Standard toolbar for search, filters, and actions above data tables.
 * Uses design system patterns for consistency.
 */

"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toolbarPattern } from "@/lib/design-system";
import Input from "./Input";
import Button from "./Button";
import Select from "./Select";

interface FiltersBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: Array<{
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
  }>;
  actions?: ReactNode;
  className?: string;
}

export default function FiltersBar({
  search,
  filters,
  actions,
  className,
}: FiltersBarProps) {
  return (
    <div className={cn(toolbarPattern.container, className)}>
      {/* Left: Search & Filters */}
      <div className={toolbarPattern.left}>
        {search && (
          <div className="w-full sm:w-auto sm:min-w-[300px]">
            <Input
              type="text"
              placeholder={search.placeholder || "Tìm kiếm..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
        )}
        {filters && filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter, index) => (
              <div key={index} className="w-full sm:w-auto sm:min-w-[200px]">
                <Select
                  label={filter.label}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  options={filter.options}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      {actions && <div className={toolbarPattern.right}>{actions}</div>}
    </div>
  );
}

