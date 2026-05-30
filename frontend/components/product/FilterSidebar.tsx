"use client";

import { useState, useEffect } from "react";
import { Category } from "@/lib/types";
import Card from "@/components/ui/Card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

interface FilterSidebarProps {
  categories?: Category[];
  filters: {
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    material?: string;
  };
  onFilterChange: (filters: FilterSidebarProps["filters"]) => void;
}

export default function FilterSidebar({
  categories = [],
  filters,
  onFilterChange,
}: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    rating: true,
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Helper to update both price filters at once
  const updatePriceFilter = (minPrice: number | undefined, maxPrice: number | undefined) => {
    const newFilters = {
      ...localFilters,
      minPrice,
      maxPrice,
    };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleFilterChange = (key: string, value: unknown) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const cleared = {};
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = Object.values(localFilters).some((v) => v !== undefined && v !== "");

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getActiveFilterLabel = () => {
    const labels: string[] = [];
    if (localFilters.categoryId) {
      const category = categories.find((c) => c.id === localFilters.categoryId);
      if (category) labels.push(category.name);
    }
    if (localFilters.minPrice !== undefined || localFilters.maxPrice !== undefined) {
      labels.push("Giá");
    }
    if (localFilters.rating !== undefined) {
      labels.push(`${localFilters.rating} sao`);
    }
    return labels;
  };

  const activeFilterLabels = getActiveFilterLabel();

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 w-full max-w-full">
        <h3 className="text-xl font-bold text-secondary-900 tracking-tight">BỘ LỌC</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-error hover:text-red-700">
            <FiX className="w-4 h-4 mr-1" />
            Xóa tất cả
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFilterLabels.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-secondary-600 mb-2">Bộ lọc đang áp dụng:</p>
          <div className="flex flex-wrap gap-2">
            {activeFilterLabels.map((label, index) => (
              <Badge
                key={index}
                variant="success"
                className="bg-primary-100 text-primary-700 border-primary-200 flex items-center gap-1"
              >
                {label}
                <button
                  onClick={() => {
                    if (label === "Giá") {
                      handleFilterChange("minPrice", undefined);
                      handleFilterChange("maxPrice", undefined);
                    } else if (label.includes("sao")) {
                      handleFilterChange("rating", undefined);
                    } else {
                      handleFilterChange("categoryId", undefined);
                    }
                  }}
                  className="ml-1 hover:text-primary-900"
                  aria-label={`Xóa bộ lọc ${label}`}
                >
                  <FiX className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="border border-secondary-200 rounded-lg overflow-hidden bg-white w-full max-w-full">
        <button
          onClick={() => toggleSection("category")}
          className="w-full max-w-full flex items-center justify-between px-4 py-3 bg-secondary-50 hover:bg-secondary-100 transition-colors"
        >
          <span className="text-sm font-semibold text-secondary-900 uppercase">DANH MỤC</span>
          {expandedSections.category ? (
            <FiChevronUp className="w-4 h-4 text-secondary-600" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-secondary-600" />
          )}
        </button>
        {expandedSections.category && (
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-secondary-50 p-2 rounded-md transition-colors">
              <input
                type="checkbox"
                checked={!localFilters.categoryId}
                onChange={() => handleFilterChange("categoryId", undefined)}
                className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-700">Tất cả danh mục</span>
            </label>
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-secondary-50 p-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={localFilters.categoryId === category.id}
                  onChange={() =>
                    handleFilterChange("categoryId", localFilters.categoryId === category.id ? undefined : category.id)
                  }
                  className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-secondary-700">{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Filter */}
      <div className="border border-secondary-200 rounded-lg overflow-hidden bg-white w-full max-w-full">
        <button
          onClick={() => toggleSection("price")}
          className="w-full max-w-full flex items-center justify-between px-4 py-3 bg-secondary-50 hover:bg-secondary-100 transition-colors"
        >
          <span className="text-sm font-semibold text-secondary-900 uppercase">GIÁ SẢN PHẨM</span>
          {expandedSections.price ? (
            <FiChevronUp className="w-4 h-4 text-secondary-600" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-secondary-600" />
          )}
        </button>
        {expandedSections.price && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Từ (₫)"
                value={localFilters.minPrice || ""}
                onChange={(e) =>
                  handleFilterChange("minPrice", e.target.value ? Number(e.target.value) : undefined)
                }
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Đến (₫)"
                value={localFilters.maxPrice || ""}
                onChange={(e) =>
                  handleFilterChange("maxPrice", e.target.value ? Number(e.target.value) : undefined)
                }
                className="text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Dưới 1 triệu", min: 0, max: 1000000 },
                { label: "1-5 triệu", min: 1000000, max: 5000000 },
                { label: "5-10 triệu", min: 5000000, max: 10000000 },
                { label: "Trên 10 triệu", min: 10000000, max: null as number | null },
              ].map((range) => {
                // Check if this range is active
                const isActive = 
                  localFilters.minPrice === range.min && 
                  (range.max === null 
                    ? localFilters.maxPrice === undefined 
                    : localFilters.maxPrice === range.max);
                
                return (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        // If already active, clear the filter
                        updatePriceFilter(undefined, undefined);
                      } else {
                        // Set the filter - update both at once
                        updatePriceFilter(range.min, range.max === null ? undefined : range.max);
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md border transition-colors font-medium",
                      isActive
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-secondary-700 border-secondary-300 hover:border-primary-500 hover:text-primary-600"
                    )}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div className="border border-secondary-200 rounded-lg overflow-hidden bg-white w-full max-w-full">
        <button
          onClick={() => toggleSection("rating")}
          className="w-full max-w-full flex items-center justify-between px-4 py-3 bg-secondary-50 hover:bg-secondary-100 transition-colors"
        >
          <span className="text-sm font-semibold text-secondary-900 uppercase">ĐÁNH GIÁ</span>
          {expandedSections.rating ? (
            <FiChevronUp className="w-4 h-4 text-secondary-600" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-secondary-600" />
          )}
        </button>
        {expandedSections.rating && (
          <div className="p-4 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <label
                key={rating}
                className="flex items-center gap-2 cursor-pointer hover:bg-secondary-50 p-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={localFilters.rating === rating}
                  onChange={() =>
                    handleFilterChange("rating", localFilters.rating === rating ? undefined : rating)
                  }
                  className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                />
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-sm",
                        i < rating ? "text-orange-500" : "text-secondary-300"
                      )}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-secondary-700">Trở lên</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

