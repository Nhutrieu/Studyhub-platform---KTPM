"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { categoryService } from "@/services/categoryService";
import { productService } from "@/services/productService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import ProductGrid from "@/components/product/ProductGrid";
import FilterSidebar from "@/components/product/FilterSidebar";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { useState } from "react";
import { FiGrid, FiList, FiFilter, FiX } from "react-icons/fi";
import Drawer from "@/components/ui/Drawer";
import { routes } from "@/lib/config/routes";
import Image from "next/image";
import { normalizeImageUrl } from "@/lib/imageUtils";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [filters, setFilters] = useState({
    categoryId: "",
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    rating: undefined as number | undefined,
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount = [
    filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0,
    filters.rating !== undefined ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const { data: category, isLoading: categoryLoading, isError: categoryError } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => categoryService.getCategoryBySlug(slug),
  });

  const { data: products, isLoading: productsLoading, isError: productsError, refetch } = useQuery({
    queryKey: ["products", "category", slug, filters, page, sortBy],
    queryFn: () =>
      productService.getProducts({
        categoryId: category?.id || filters.categoryId || undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        page,
        limit: 12,
      }),
    enabled: !!category,
  });

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200">
          <PageShell className="pt-8 md:pt-12 pb-8">
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </PageShell>
        </div>
        <PageShell className="py-8">
          <Skeleton className="h-64 w-full" />
        </PageShell>
      </div>
    );
  }

  if (categoryError || !category) {
    return (
      <div className="min-h-screen bg-white">
        <PageShell className="py-12">
          <ErrorState
            title="Không tìm thấy danh mục"
            description="Danh mục không tồn tại hoặc đã bị xóa"
            action={{ label: "Quay lại danh mục", onClick: () => window.location.href = "/categories" }}
          />
        </PageShell>
      </div>
    );
  }

  const imageUrl = normalizeImageUrl(category.image) || category.image;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Category Banner */}
      <div className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200 overflow-hidden">
        {imageUrl && (
          <div className="absolute inset-0 opacity-10">
            <Image
              src={imageUrl}
              alt={category.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80" />
        
        <PageShell className="relative pt-8 md:pt-12 pb-12">
          <PageHeader
            title={category.name}
            description={category.description || `Khám phá bộ sưu tập ${category.name} cao cấp`}
            breadcrumbs={[
              { label: "Trang chủ", href: routes.home },
              { label: "Danh mục", href: routes.categories },
              { label: category.name },
            ]}
            className="mb-8"
          />
          
          {/* Category Stats */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">
                  {products?.total || 0}
                </div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Sản phẩm
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">✨</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Chất lượng cao
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">🚚</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Giao hàng nhanh
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">💯</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Chính hãng
                </div>
              </div>
            </div>
          </div>
        </PageShell>
      </div>

      {/* Main Content */}
      <PageShell className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <div className="rounded-2xl border-2 border-secondary-200 bg-white p-6 shadow-sm">
                <FilterSidebar
                  categories={[]}
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
            {/* Sort & Filter Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border-2 border-secondary-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex items-center gap-4">
                <p className="text-sm font-semibold text-secondary-900">
                  {products?.total ? (
                    <>
                      <span className="text-primary-600">{products.total}</span> sản phẩm
                    </>
                  ) : (
                    "Đang tải..."
                  )}
                </p>
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary-700">
                    <FiFilter className="w-3 h-3" />
                    {activeFilterCount} bộ lọc
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
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
                
                <Select
                  options={[
                    { value: "newest", label: "Mới nhất" },
                    { value: "price_asc", label: "Giá tăng dần" },
                    { value: "price_desc", label: "Giá giảm dần" },
                    { value: "name_asc", label: "Tên A-Z" },
                    { value: "rating", label: "Đánh giá cao" },
                  ]}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>

            {/* Products */}
            {productsError ? (
              <ErrorState
                title="Không thể tải sản phẩm"
                description="Vui lòng thử lại sau"
                action={{ label: "Thử lại", onClick: () => refetch() }}
              />
            ) : (
              <>
                <ProductGrid
                  products={products?.items}
                  isLoading={productsLoading}
                  columns={3}
                />
                {products && products.totalPages > 1 && (
                  <div className="pt-8 flex justify-center">
                    <Pagination
                      currentPage={page}
                      totalPages={products.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
                
                {!productsLoading && (!products?.items || products.items.length === 0) && (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-100 mb-4">
                      <FiGrid className="w-8 h-8 text-secondary-400" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary-900 mb-2">
                      Chưa có sản phẩm
                    </h3>
                    <p className="text-secondary-600 mb-6">
                      Danh mục này hiện chưa có sản phẩm nào
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => window.location.href = "/products"}
                    >
                      Xem tất cả sản phẩm
                    </Button>
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
            categories={[]}
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
      </PageShell>
    </div>
  );
}
