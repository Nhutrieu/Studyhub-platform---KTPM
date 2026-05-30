"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { categoryService } from "@/services/categoryService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { normalizeImageUrl } from "@/lib/imageUtils";
import { FiArrowRight, FiGrid } from "react-icons/fi";
import { routes } from "@/lib/config/routes";

export default function CategoriesPage() {
  const { data: categories, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200">
        <PageShell className="pt-8 md:pt-12 pb-12">
      <PageHeader
        title="Danh mục sản phẩm"
            description="Khám phá bộ sưu tập nội thất được phân loại theo không gian và phong cách. Dễ dàng tìm kiếm sản phẩm hoàn hảo cho ngôi nhà của bạn."
        breadcrumbs={[
              { label: "Trang chủ", href: routes.home },
          { label: "Danh mục" },
        ]}
            className="mb-8"
      />
          
          {/* Stats */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FiGrid className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-900">
                  {categories?.length || 0}
                </div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Danh mục
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">🛋️</div>
                <div className="text-2xl font-bold text-secondary-900">100+</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Sản phẩm
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">✨</div>
                <div className="text-2xl font-bold text-secondary-900">New</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Hàng tuần
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">🎯</div>
                <div className="text-2xl font-bold text-secondary-900">100%</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Chính hãng
                </div>
              </div>
            </div>
          </div>
        </PageShell>
          </div>

      {/* Main Content */}
      <PageShell className="py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải danh mục"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const imageUrl = normalizeImageUrl(category.image) || category.image;
              const initial = category.name?.charAt(0)?.toUpperCase() || "D";
              
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug || category.id}`}
                  className="group block h-full"
                >
                  <div className="bg-white rounded-2xl overflow-hidden border-2 border-secondary-200 hover:border-primary-400 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                    {/* Image Container */}
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary-50 to-secondary-100">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={category.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 via-secondary-100 to-secondary-200">
                          <span className="text-6xl font-bold text-primary-600">
                            {initial}
                          </span>
                        </div>
                      )}
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Badge */}
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-secondary-900 shadow-lg border border-white/50">
                          <FiGrid className="w-3 h-3" />
                        Bộ sưu tập
                      </span>
                    </div>
                      
                      {/* View CTA on hover */}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                          Xem ngay
                          <FiArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col bg-white">
                      <h3 className="text-xl font-bold text-secondary-900 group-hover:text-primary-700 transition-colors mb-2">
                            {category.name}
                          </h3>
                          {category.description && (
                        <p className="text-sm text-secondary-600 line-clamp-2 mb-4">
                              {category.description}
                            </p>
                          )}
                      
                      <div className="mt-auto pt-4 border-t border-secondary-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-primary-600 uppercase tracking-wide">
                            Khám phá
                          </span>
                          <span className="text-secondary-900 font-semibold group-hover:text-primary-600 transition-colors">
                            →
                          </span>
                        </div>
                      </div>
                        </div>
                      </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-100 mb-4">
              <FiGrid className="w-8 h-8 text-secondary-400" />
            </div>
            <h3 className="text-xl font-bold text-secondary-900 mb-2">
              Chưa có danh mục nào
            </h3>
            <p className="text-secondary-600">
              Hệ thống đang cập nhật danh mục mới
            </p>
              </div>
        )}
    </PageShell>
    </div>
  );
}
