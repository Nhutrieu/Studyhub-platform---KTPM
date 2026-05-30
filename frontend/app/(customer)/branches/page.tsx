"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { branchService } from "@/services/branchService";
import Skeleton from "@/components/ui/Skeleton";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { routes } from "@/lib/config/routes";
import { FiMapPin, FiPhone, FiMail, FiArrowRight, FiMap, FiNavigation } from "react-icons/fi";

export default function BranchesPage() {
  const { data: branches, isLoading, isError, refetch } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchService.getBranches(),
  });

  const formatAddress = (address: string | { street?: string; ward?: string; district?: string; city?: string } | undefined) => {
    if (!address) return "N/A";
    if (typeof address === 'string') return address;
    const parts = [
      address.street,
      address.ward,
      address.district,
      address.city,
    ].filter(Boolean);
    return parts.join(", ") || "N/A";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200">
        <PageShell className="pt-8 md:pt-12 pb-12">
          <PageHeader
            title="Chi nhánh"
            description="Tìm chi nhánh gần bạn nhất. Tất cả chi nhánh đều có sẵn hàng và sẵn sàng phục vụ bạn."
            breadcrumbs={[
              { label: "Trang chủ", href: routes.home },
              { label: "Chi nhánh" },
            ]}
            className="mb-8"
          />
          
          {/* Stats */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FiMap className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-900">
                  {branches?.length || 0}
                </div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Chi nhánh
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">📍</div>
                <div className="text-2xl font-bold text-secondary-900">24/7</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Hỗ trợ
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">🚚</div>
                <div className="text-2xl font-bold text-secondary-900">Nhanh</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Giao hàng
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">💯</div>
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải danh sách chi nhánh"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : branches && branches.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {branches.filter(branch => branch && branch.id).map((branch) => {
              const address = formatAddress(branch.address);
              const city = typeof branch.address === 'object' && branch.address?.city 
                ? branch.address.city 
                : address.split(',').pop()?.trim() || '';
              
              return (
                <Link
                  key={branch.id}
                  href={routes.branchDetail(branch.id)}
                  className="group block h-full"
                  prefetch={false}
                >
                  <div className="bg-white rounded-2xl overflow-hidden border-2 border-secondary-200 hover:border-primary-400 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                    {/* Header with Map Icon */}
                    <div className="relative bg-gradient-to-br from-primary-50 to-secondary-50 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg">
                            <FiMapPin className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">
                              {branch.name}
                            </h3>
                            {city && (
                              <p className="text-sm text-primary-600 font-medium mt-1">
                                {city}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                            <FiArrowRight className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col space-y-4">
                      {/* Address */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <FiNavigation className="w-5 h-5 text-secondary-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-secondary-600 mb-1">
                            Địa chỉ
                          </p>
                          <p className="text-sm text-secondary-900 leading-relaxed">
                            {address}
                          </p>
                        </div>
                      </div>

                      {/* Phone */}
                      {branch.phone && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                            <FiPhone className="w-5 h-5 text-secondary-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-secondary-600 mb-0.5">
                              Điện thoại
                            </p>
                            <a
                              href={`tel:${branch.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-secondary-900 font-semibold hover:text-primary-600 transition-colors"
                            >
                              {branch.phone}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      {branch.email && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                            <FiMail className="w-5 h-5 text-secondary-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-secondary-600 mb-0.5">
                              Email
                            </p>
                            <a
                              href={`mailto:${branch.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm text-secondary-900 font-semibold hover:text-primary-600 transition-colors"
                            >
                              {branch.email}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Stats Footer */}
                      {branch.totalOrders !== undefined && (
                        <div className="mt-auto pt-4 border-t border-secondary-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-secondary-600">Đơn hàng: </span>
                                <span className="font-bold text-secondary-900">
                                  {branch.totalOrders}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-100 mb-4">
              <FiMap className="w-8 h-8 text-secondary-400" />
            </div>
            <h3 className="text-xl font-bold text-secondary-900 mb-2">
              Chưa có chi nhánh nào
            </h3>
            <p className="text-secondary-600">
              Chi nhánh sẽ được hiển thị tại đây khi có dữ liệu
            </p>
          </div>
        )}
      </PageShell>
    </div>
  );
}
