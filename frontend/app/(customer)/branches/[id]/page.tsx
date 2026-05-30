"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { branchService } from "@/services/branchService";
import Skeleton from "@/components/ui/Skeleton";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { FiMapPin, FiPhone, FiMail, FiPackage, FiNavigation, FiClock } from "react-icons/fi";
import { routes } from "@/lib/config/routes";

export default function BranchDetailPage() {
  const params = useParams();
  const branchId = params.id as string;

  const { data: branch, isLoading, isError } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => branchService.getBranch(branchId),
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["inventory", branchId],
    queryFn: () => branchService.getBranchInventory(branchId),
    enabled: !!branchId,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200">
          <PageShell className="pt-8 md:pt-12 pb-8">
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </PageShell>
        </div>
        <PageShell className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </PageShell>
      </div>
    );
  }

  if (isError || !branch) {
    return (
      <div className="min-h-screen bg-white">
        <PageShell className="py-12">
          <ErrorState
            title="Không tìm thấy chi nhánh"
            description="Chi nhánh không tồn tại hoặc đã bị xóa"
            action={{ 
              label: "Quay lại danh sách", 
              onClick: () => window.location.href = routes.branches 
            }}
          />
        </PageShell>
      </div>
    );
  }

  const address = formatAddress(branch.address);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80" />
        
        <PageShell className="relative pt-8 md:pt-12 pb-12">
          <PageHeader
            title={branch.name}
            description={branch.description || `Chi nhánh ${branch.name} - Phục vụ bạn với chất lượng tốt nhất`}
            breadcrumbs={[
              { label: "Trang chủ", href: routes.home },
              { label: "Chi nhánh", href: routes.branches },
              { label: branch.name },
            ]}
            className="mb-8"
          />
          
          {/* Branch Stats */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">
                  {branch.totalOrders || 0}
                </div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Đơn hàng
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">
                  {inventory?.length || 0}
                </div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Sản phẩm
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-2xl font-bold text-secondary-900">24/7</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Hỗ trợ
                </div>
              </div>
            </div>
          </div>
        </PageShell>
      </div>

      {/* Main Content */}
      <PageShell className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Branch Information Card */}
          <div className="bg-white rounded-2xl border-2 border-secondary-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-primary-50 to-secondary-50 p-6 border-b border-secondary-200">
              <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                  <FiMapPin className="w-6 h-6 text-white" />
                </div>
                Thông tin chi nhánh
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                  <FiNavigation className="w-6 h-6 text-secondary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                    Địa chỉ
                  </p>
                  <p className="text-base text-secondary-900 leading-relaxed">
                    {address}
                  </p>
                </div>
              </div>

              {/* Phone */}
              {branch.phone && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <FiPhone className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                      Số điện thoại
                    </p>
                    <a
                      href={`tel:${branch.phone}`}
                      className="text-lg text-secondary-900 font-bold hover:text-primary-600 transition-colors"
                    >
                      {branch.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {branch.email && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <FiMail className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                      Email
                    </p>
                    <a
                      href={`mailto:${branch.email}`}
                      className="text-lg text-secondary-900 font-bold hover:text-primary-600 transition-colors"
                    >
                      {branch.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Status */}
              {branch.status && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <FiClock className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                      Trạng thái
                    </p>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                      branch.status === 'active' || branch.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {branch.status === 'active' || branch.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t border-secondary-100">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => window.location.href = routes.products}
                >
                  Xem sản phẩm tại chi nhánh
                </Button>
              </div>
            </div>
          </div>

          {/* Inventory Card */}
          <div className="bg-white rounded-2xl border-2 border-secondary-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-secondary-50 to-primary-50 p-6 border-b border-secondary-200">
              <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                  <FiPackage className="w-6 h-6 text-white" />
                </div>
                Tồn kho
              </h2>
            </div>
            
            <div className="p-6">
              {inventoryLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16 ml-4" />
                    </div>
                  ))}
                </div>
              ) : inventory && inventory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {inventory.map((item: { product?: { name: string }; quantity?: number }, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary-50 hover:bg-secondary-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                          <FiPackage className="w-4 h-4 text-primary-600" />
                        </div>
                        <span className="text-sm font-medium text-secondary-900">
                          {item.product?.name || "Sản phẩm"}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary-600 bg-white px-3 py-1 rounded-full border border-primary-200">
                        {item.quantity || 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có thông tin tồn kho"
                  description="Tồn kho sẽ được hiển thị khi có dữ liệu"
                />
              )}
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
