// Custom Hook - Filters State Management
// Hook để quản lý filter state cho pages như products, orders, etc
import { useState, useCallback } from "react";

export interface FilterState {
  [key: string]: string | number | boolean | string[] | null;
}

/**
 * Hook để quản lý filter state
 * @returns Object với filters, methods để update filters
 *
 * Ví dụ sử dụng:
 * const { filters, updateFilter, updateFilters, clearFilters } = useFilters({
 *   category: '',
 *   minPrice: 0,
 *   maxPrice: 100000000,
 *   search: '',
 *   sortBy: 'newest'
 * })
 */
export function useFilters(initialFilters: FilterState = {}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Update một filter duy nhất
  const updateFilter = useCallback(
    (key: string, value: FilterState[keyof FilterState]) => {
      setFilters((prev) => {
        const updated = { ...prev };
        updated[key] = value;
        return updated;
      });
    },
    []
  );

  // Update nhiều filters cùng lúc
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev };
      Object.assign(updated, newFilters);
      return updated;
    });
  }, []);

  // Xóa tất cả filters, quay lại initial state
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  // Reset một filter về initial value
  const resetFilter = useCallback(
    (key: string) => {
      setFilters((prev) => {
        const updated = { ...prev };
        updated[key] = initialFilters[key];
        return updated;
      });
    },
    [initialFilters]
  );

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilters,
    resetFilter,
  };
}

export default useFilters;
