"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { promotionService } from "@/services/promotionService";
import { formatCurrency } from "@/lib/format";
import { FiTag, FiCalendar, FiCopy, FiCheck, FiPercent, FiDollarSign, FiTruck, FiGift } from "react-icons/fi";
import { Promotion } from "@/lib/types";
import { routes } from "@/lib/config/routes";
import { toast } from "react-toastify";

export default function PromotionsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: promotions, isLoading, isError, refetch } = useQuery({
    queryKey: ["promotions", "public"],
    queryFn: () => promotionService.getPromotions(),
  });

  const activePromotions = promotions?.filter((p: Promotion) => {
    const now = new Date();
    const startDate = new Date(p.startDate);
    const endDate = new Date(p.endDate);
    return p.isActive && now >= startDate && now <= endDate;
  }) || [];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <FiPercent className="w-6 h-6" />;
      case "fixed":
        return <FiDollarSign className="w-6 h-6" />;
      case "free_shipping":
        return <FiTruck className="w-6 h-6" />;
      default:
        return <FiGift className="w-6 h-6" />;
    }
  };

  const getPromotionColor = (type: string) => {
    switch (type) {
      case "percentage":
        return "from-orange-500 to-red-500";
      case "fixed":
        return "from-blue-500 to-purple-500";
      case "free_shipping":
        return "from-green-500 to-emerald-500";
      default:
        return "from-primary-500 to-primary-600";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 border-b border-secondary-200">
        <PageShell className="pt-8 md:pt-12 pb-12">
          <PageHeader
            title="Khuyến mãi"
            description="Khám phá các chương trình khuyến mãi hấp dẫn, giảm giá đặc biệt và ưu đãi độc quyền dành cho bạn."
            breadcrumbs={[
              { label: "Trang chủ", href: routes.home },
              { label: "Khuyến mãi" },
            ]}
            className="mb-8"
          />
          
          {/* Stats */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FiTag className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-900">
                  {activePromotions.length}
                </div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Khuyến mãi
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">🎁</div>
                <div className="text-2xl font-bold text-secondary-900">Hot</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Đang diễn ra
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">💰</div>
                <div className="text-2xl font-bold text-secondary-900">Tiết kiệm</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Tối đa
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border-2 border-secondary-200 p-4 text-center">
                <div className="text-3xl mb-1">⚡</div>
                <div className="text-2xl font-bold text-secondary-900">Nhanh</div>
                <div className="text-xs font-medium text-secondary-600 mt-1">
                  Áp dụng ngay
                </div>
              </div>
            </div>
          </div>
        </PageShell>
      </div>

      {/* Main Content */}
      <PageShell className="py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải khuyến mãi"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : activePromotions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-100 mb-4">
              <FiTag className="w-8 h-8 text-secondary-400" />
            </div>
            <h3 className="text-xl font-bold text-secondary-900 mb-2">
              Hiện tại không có khuyến mãi nào
            </h3>
            <p className="text-secondary-600 mb-6">
              Hãy quay lại sau để xem các chương trình khuyến mãi mới
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = routes.products}
            >
              Xem sản phẩm
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activePromotions.map((promotion: Promotion) => {
              const daysRemaining = getDaysRemaining(promotion.endDate);
              const gradientColor = getPromotionColor(promotion.type);
              
              return (
                <div
                  key={promotion.id}
                  className="group bg-white rounded-2xl overflow-hidden border-2 border-secondary-200 hover:border-primary-400 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  {/* Header with Gradient */}
                  <div className={`relative bg-gradient-to-br ${gradientColor} p-6 text-white`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          {getPromotionIcon(promotion.type)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">
                            {promotion.name}
                          </h3>
                          {promotion.code && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                                {promotion.code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Discount Value */}
                    <div className="mb-4">
                      {promotion.type === "percentage" && (
                        <div className="text-4xl font-black text-white">
                          {promotion.value}%
                        </div>
                      )}
                      {promotion.type === "fixed" && (
                        <div className="text-3xl font-black text-white">
                          {formatCurrency(promotion.value)}
                        </div>
                      )}
                      {promotion.type === "free_shipping" && (
                        <div className="text-2xl font-black text-white">
                          Miễn phí vận chuyển
                        </div>
                      )}
                    </div>

                    {/* Days Remaining Badge */}
                    {daysRemaining > 0 && (
                      <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
                        <FiCalendar className="w-3 h-3" />
                        Còn {daysRemaining} ngày
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col space-y-4">
                    {/* Description */}
                    {promotion.description && (
                      <p className="text-sm text-secondary-700 leading-relaxed">
                        {promotion.description}
                      </p>
                    )}

                    {/* Date Range */}
                    <div className="flex items-center gap-2 text-sm text-secondary-600">
                      <FiCalendar className="w-4 h-4" />
                      <span>
                        {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                      </span>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-2">
                      {promotion.minPurchaseAmount && (
                        <div className="text-xs text-secondary-600">
                          <span className="font-semibold">Áp dụng cho đơn hàng từ: </span>
                          <span className="font-bold text-secondary-900">
                            {formatCurrency(promotion.minPurchaseAmount)}
                          </span>
                        </div>
                      )}
                      
                      {promotion.maxDiscountAmount && promotion.type === "percentage" && (
                        <div className="text-xs text-secondary-600">
                          <span className="font-semibold">Giảm tối đa: </span>
                          <span className="font-bold text-secondary-900">
                            {formatCurrency(promotion.maxDiscountAmount)}
                          </span>
                        </div>
                      )}

                      {promotion.usageLimit && (
                        <div className="text-xs text-secondary-600">
                          <span className="font-semibold">Còn lại: </span>
                          <span className="font-bold text-secondary-900">
                            {promotion.usageLimit - (promotion.usageCount || 0)} lượt
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Copy Code Button */}
                    {promotion.code && (
                      <div className="mt-auto pt-4 border-t border-secondary-100">
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-center gap-2"
                          onClick={() => handleCopyCode(promotion.code!)}
                        >
                          {copiedCode === promotion.code ? (
                            <>
                              <FiCheck className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-semibold">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <FiCopy className="w-4 h-4" />
                              <span>Sao chép mã</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Use Now Button */}
                    {!promotion.code && (
                      <div className="mt-auto pt-4 border-t border-secondary-100">
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={() => window.location.href = routes.products}
                        >
                          Áp dụng ngay
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
}
