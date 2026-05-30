"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toolbarPattern } from "@/lib/design-system/patterns";
import Input from "@/components/ui/Input";
import { FiSearch, FiX } from "react-icons/fi";

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * FilterBar
 * 
 * Standard filter toolbar for data tables.
 * Provides search, filters, and action buttons.
 * 
 * Usage:
 * ```tsx
 * <FilterBar
 *   search={{
 *     value: searchQuery,
 *     onChange: setSearchQuery,
 *     placeholder: "Search orders..."
 *   }}
 *   filters={
 *     <Select options={statusOptions} />
 *   }
 *   actions={<Button>Export</Button>}
 * />
 * ```
 */
export default function FilterBar({
  search,
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div className={cn(toolbarPattern.container, className)}>
      {/* Left: Search & Filters */}
      <div className={toolbarPattern.left}>
        {search && (
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder || "Search..."}
              className="pl-10 pr-10"
            />
            {search.value && (
              <button
                onClick={() => search.onChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {filters}
      </div>

      {/* Right: Actions */}
      {actions && <div className={toolbarPattern.right}>{actions}</div>}
    </div>
  );
}

