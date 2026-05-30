"use client";

import { useCartStore } from "@/store/cartStore";
import { useQuery } from "@tanstack/react-query";
import { cartService } from "@/services/cartService";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "react-toastify";
import {
  FiTrash2,
  FiPlus,
  FiMinus,
  FiShoppingBag,
  FiArrowRight,
  FiCheckCircle,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Section from "@/components/ui/Section";
import PageHeader from "@/components/layouts/PageHeader";
import { routes } from "@/lib/config/routes";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const { items, totalAmount, updateQuantity, removeItem, setCart } =
    useCartStore();

  // Sync with backend
  const { data: backendCart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartService.getCart(),
    enabled: typeof window !== "undefined",
  });

  useEffect(() => {
    if (backendCart && backendCart.length > 0) {
      // Ensure branchId is preserved when syncing from backend
      const itemsWithBranchId = backendCart.map(item => ({
        ...item,
        branchId: item.branchId || undefined, // Preserve branchId
      }));
      setCart(itemsWithBranchId);
    }
  }, [backendCart, setCart]);

  const handleUpdateQuantity = async (item: CartItem, quantity: number) => {
    if (!item || !item.id) return;
    updateQuantity(item.id, quantity);
    // Store handles sync automatically
  };

  const handleRemoveItem = async (item: CartItem) => {
    if (!item || !item.id) return;
    removeItem(item.id);
    // Store handles sync automatically
    toast.success("Đã xóa sản phẩm");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Section size="sm" className="pt-4 md:pt-8">
        <PageHeader
          title="Giỏ hàng"
          breadcrumbs={[
            { label: "Trang chủ", href: routes.home },
            { label: "Giỏ hàng" },
          ]}
          className="mb-8"
        />

        {items.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<FiShoppingBag className="w-16 h-16 text-secondary-300" />}
              title="Giỏ hàng của bạn đang trống"
              description="Thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm"
              action={{
                label: "Tiếp tục mua sắm",
                onClick: () => (window.location.href = "/products"),
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-4">
              {items
                .filter(
                  (item) =>
                    item &&
                    (item.id || item.productId) &&
                    (item.product?.id || item.productId)
                )
                .map((item, index) => (
                  <Card
                    key={item.id || item.productId || `cart-item-${index}`}
                    variant="outline"
                    className="overflow-hidden hover:border-secondary-300 transition-colors"
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex gap-4 md:gap-6">
                        <Link
                          href={`/products/${
                            item.product?.id || item.productId
                          }`}
                          prefetch={false}
                          className="w-24 h-24 md:w-32 md:h-32 bg-secondary-50 rounded-lg shrink-0 overflow-hidden group border border-secondary-100"
                        >
                          {item.product?.images &&
                          item.product.images.length > 0 &&
                          item.product.images[0] ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={item.product.images[0]}
                                alt={item.product?.name || "Product"}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="128px"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-secondary-400 text-xs">
                              No Image
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-4">
                              <Link
                                href={`/products/${
                                  item.product?.id || item.productId
                                }`}
                              >
                                <h3 className="font-medium text-base md:text-lg text-secondary-900 hover:text-primary-600 transition-colors line-clamp-2">
                                  {item.product?.name || "Sản phẩm"}
                                </h3>
                              </Link>
                              <p className="text-lg font-bold text-secondary-900 whitespace-nowrap hidden md:block">
                                {formatCurrency(Number(item.price) || 0)}
                              </p>
                            </div>

                            {item.branch && (
                              <p className="text-xs md:text-sm text-secondary-500 mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                Chi nhánh:{" "}
                                {typeof item.branch === "string"
                                  ? item.branch
                                  : item.branch?.name || "N/A"}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <p className="text-lg font-bold text-secondary-900 md:hidden">
                              {formatCurrency(Number(item.price) || 0)}
                            </p>

                            <div className="flex items-center gap-4 ml-auto">
                              <div className="flex items-center gap-1 border border-secondary-200 rounded-lg bg-white p-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-8 h-8 p-0 hover:bg-secondary-50 text-secondary-600"
                                  aria-label="Giảm số lượng"
                                >
                                  <FiMinus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-medium text-sm text-secondary-900">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item,
                                      item.quantity + 1
                                    )
                                  }
                                  className="w-8 h-8 p-0 hover:bg-secondary-50 text-secondary-600"
                                  aria-label="Tăng số lượng"
                                >
                                  <FiPlus className="w-3 h-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item)}
                                className="text-secondary-400 hover:text-error-600 hover:bg-error-50 p-2 rounded-lg transition-colors"
                                aria-label="Xóa sản phẩm"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card
                  variant="elevated"
                  className="border-none shadow-xl shadow-secondary-200/50 ring-1 ring-secondary-100"
                >
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-secondary-900 mb-6">
                      Tóm tắt đơn hàng
                    </h2>
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-600">Tạm tính:</span>
                        <span className="text-secondary-900 font-medium">
                          {formatCurrency(Number(totalAmount) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-secondary-600 flex items-center gap-1">
                          Phí vận chuyển{" "}
                          <span className="text-xs bg-secondary-100 px-1 rounded text-secondary-400">
                            ?
                          </span>
                          :
                        </span>
                        <span className="text-secondary-900 font-medium">
                          30,000 VND
                        </span>
                      </div>
                      <div className="border-t border-dashed border-secondary-200 pt-4 flex justify-between items-end">
                        <span className="font-bold text-secondary-900">
                          Tổng cộng:
                        </span>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-primary-600 block leading-none">
                            {formatCurrency((Number(totalAmount) || 0) + 30000)}
                          </span>
                          <span className="text-xs text-secondary-400 font-normal mt-1 block">
                            (Đã bao gồm VAT)
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-4 text-base font-bold shadow-lg transition-all transform",
                        items.length === 0 || items.some((i) => !i.branchId)
                          ? "opacity-50 cursor-not-allowed"
                          : "shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-0.5"
                      )}
                      disabled={
                        items.length === 0 || items.some((i) => !i.branchId)
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (items.length === 0) {
                          toast.error("Giỏ hàng trống");
                          return;
                        }
                        // 🔧 Validate branch selection
                        const hasMissingBranch = items.some(
                          (item) => !item.branchId
                        );
                        if (hasMissingBranch) {
                          toast.error(
                            "Vui lòng chọn chi nhánh cho tất cả sản phẩm"
                          );
                          return;
                        }
                        // Navigate to checkout
                        window.location.href = "/checkout";
                      }}
                    >
                      <span>Tiến hành thanh toán</span>
                      <FiArrowRight />
                    </Button>

                    <div className="mt-6 flex items-center justify-center gap-4 text-secondary-300">
                      <FiCheckCircle className="w-5 h-5" />
                      <span className="text-xs">Bảo mật thanh toán 100%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
