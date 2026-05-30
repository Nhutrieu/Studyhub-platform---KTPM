"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { useDebounce } from "@/hooks/useDebounce";
import ProductGrid from "@/components/product/ProductGrid";
import FilterSidebar from "@/components/product/FilterSidebar";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import { FiSearch, FiFilter, FiX, FiGrid, FiList } from "react-icons/fi";
import Drawer from "@/components/ui/Drawer";
import { routes } from "@/lib/config/routes";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    categoryId: "",
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    rating: undefined as number | undefined,
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const debouncedSearch = useDebounce(search, 500);
  
  const activeFilterCount = [
    filters.categoryId ? 1 : 0,
    filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0,
    filters.rating !== undefined ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
  });

  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ["products", debouncedSearch, filters, page, sortBy],
    queryFn: () =>
      productService.getProducts({
        search: debouncedSearch || undefined,
        categoryId: filters.categoryId || undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sortBy: sortBy,
        page,
        limit: 12,
      }),
  });

  // Filter by rating on frontend if backend doesn't support it
  const data = rawData && filters.rating !== undefined
    ? {
        ...rawData,
        items: rawData.items.filter((product: Product) => 
          (product.rating || 0) >= filters.rating!
        ),
        total: rawData.items.filter((product: Product) => 
          (product.rating || 0) >= filters.rating!
        ).length,
      }
    : rawData;

  const clearAllFilters = () => {
    setFilters({
      categoryId: "",
      minPrice: undefined,
      maxPrice: undefined,
      rating: undefined,
    });
    setSearch("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section with Search */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200">
        <PageShell className="pt-8 md:pt-12 pb-8">
          <PageHeader
            title="Sản phẩm"
            description="Khám phá bộ sưu tập nội thất tinh tế, chọn lọc theo phong cách hiện đại và tiện nghi."
            breadcrumbs={[{ label: "Trang chủ", href: routes.home }, { label: "Sản phẩm" }]}
            className="mb-8"
          />
          
          {/* Enhanced Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-2xl shadow-lg border-2 border-secondary-200"></div>
              <div className="relative bg-white rounded-2xl p-2 flex items-center gap-2">
                <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm sofa, bàn ăn, đèn trang trí..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                    className="w-full pl-12 pr-4 py-4 text-secondary-900 placeholder-secondary-400 focus:outline-none rounded-xl bg-transparent"
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="primary"
                  className="px-6 py-4 rounded-xl font-semibold"
                  onClick={() => setPage(1)}
                >
                  Tìm kiếm
                </Button>
              </div>
              </div>

            {/* Results Count & Active Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-secondary-900">
                  {data?.total ? (
                    <>
                      <span className="text-primary-600">{data.total}</span> sản phẩm
                    </>
                  ) : (
                    "Đang tải..."
                  )}
                </p>
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1.5 text-sm font-semibold text-primary-700">
                      <FiFilter className="w-4 h-4" />
                      {activeFilterCount} bộ lọc
                  </span>
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-secondary-600 hover:text-primary-600 font-medium transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </PageShell>
      </div>

      {/* Main Content */}
      <Section size="md" className="pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <div className="rounded-2xl border-2 border-secondary-200 bg-white p-6 shadow-sm">
              <FilterSidebar
                categories={categories}
                filters={filters}
                onFilterChange={(newFilters) => {
                  setFilters({
                    categoryId: newFilters.categoryId || "",
                    minPrice: newFilters.minPrice,
                    maxPrice: newFilters.maxPrice,
                    rating: newFilters.rating,
                  });
                  setPage(1);
                }}
              />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sort & View Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-secondary-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-secondary-900">
                  Sắp xếp theo:
                </p>
                <Select
                  options={[
                    { value: "newest", label: "Mới nhất" },
                    { value: "price_asc", label: "Giá tăng dần" },
                    { value: "price_desc", label: "Giá giảm dần" },
                    { value: "name_asc", label: "Tên A-Z" },
                    { value: "rating", label: "Đánh giá cao nhất" },
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border-2 border-secondary-200 rounded-xl text-sm font-semibold text-secondary-700 hover:bg-secondary-50 hover:border-primary-400 transition-all relative"
                >
                  <FiFilter className="w-4 h-4" />
                  Bộ lọc
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                
                {/* View Mode Toggle - Future feature */}
                <div className="hidden md:flex items-center gap-1 border-2 border-secondary-200 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary-600 text-white"
                        : "text-secondary-600 hover:bg-secondary-50"
                    }`}
                    aria-label="Grid view"
                  >
                    <FiGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "list"
                        ? "bg-primary-600 text-white"
                        : "text-secondary-600 hover:bg-secondary-50"
                    }`}
                    aria-label="List view"
                  >
                    <FiList className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            {isError ? (
              <ErrorState
                title="Không thể tải sản phẩm"
                description="Vui lòng thử lại sau"
                action={{ label: "Thử lại", onClick: () => refetch() }}
              />
            ) : (
              <>
                <ProductGrid
                  products={data?.items}
                  isLoading={isLoading}
                  columns={3}
                />
                {data && data.totalPages > 1 && (
                  <div className="pt-8 flex justify-center">
                    <Pagination
                      currentPage={page}
                      totalPages={data.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        <Drawer
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          title="Bộ lọc"
        >
          <FilterSidebar
            categories={categories}
            filters={filters}
            onFilterChange={(newFilters) => {
              setFilters({
                categoryId: newFilters.categoryId || "",
                minPrice: newFilters.minPrice,
                maxPrice: newFilters.maxPrice,
                rating: newFilters.rating,
              });
              setPage(1);
            }}
          />
        </Drawer>
      </Section>
    </div>
  );
}
