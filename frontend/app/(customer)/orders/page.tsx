"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { orderService } from "@/services/orderService";
import { reviewService } from "@/services/reviewService";
import { useAuthStore } from "@/store/authStore";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency, formatDate } from "@/lib/format";
import { Order, OrderItem } from "@/lib/types";
import { useState } from "react";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import Pagination from "@/components/ui/Pagination";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reviewSchema } from "@/lib/validation";
import { FiStar } from "react-icons/fi";
import { toast } from "react-toastify";
import type { z } from "zod";

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, user, accessToken, role, _hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{ productId: string; productName: string } | null>(null);

  // Check authentication - redirect to login if not authenticated
  // Wait for hydration before checking
  useEffect(() => {
    if (!_hasHydrated) {
      return; // Wait for state to be restored
    }
    
    if (!isAuthenticated || !accessToken || !user) {
      router.push("/auth/login?redirect=/orders");
      return;
    }
    // Only allow customer role
    if (role && role !== "customer") {
      router.push("/");
      return;
    }
  }, [_hasHydrated, isAuthenticated, accessToken, user, role, router]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", "my", page],
    queryFn: () => orderService.getMyOrders(),
    enabled: isAuthenticated && !!accessToken && !!user && role === "customer",
  });

  // Get unreviewed products for selected order
  const { data: unreviewedProducts, isLoading: isLoadingUnreviewed, refetch: refetchUnreviewed } = useQuery({
    queryKey: ["reviews", "unreviewed", selectedOrder?.id],
    queryFn: () => reviewService.getUnreviewedProductsFromOrder(selectedOrder!.id),
    enabled: !!selectedOrder?.id && (selectedOrder?.status?.toUpperCase() === "DELIVERED" || selectedOrder?.status?.toUpperCase() === "COMPLETED"),
  });

  // Create a Set of unreviewed product IDs
  // Normalize all productIds to strings for consistent comparison
  // If query is still loading, unreviewedProductIds will be empty Set (show all as reviewable)
  // If query is done and productId is NOT in the set, it means it's already reviewed
  const unreviewedProductIds = new Set<string>(
    unreviewedProducts
      ?.map(p => {
        const pid = String(p.productId?.toString() || p.productId || "");
        return pid && pid !== "undefined" && pid !== "null" ? pid : null;
      })
      .filter((pid): pid is string => pid !== null) || []
  );

  // Review form
  const {
    register: registerReview,
    handleSubmit: handleSubmitReview,
    formState: { errors: reviewErrors },
    reset: resetReview,
    watch: watchReview,
    setValue: setValueReview,
  } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: { productId: "", rating: 5, comment: "" },
  });

  const reviewRating = watchReview("rating");

  const createReviewMutation = useMutation({
    mutationFn: (data: z.infer<typeof reviewSchema>) => {
      // Normalize productId before sending to backend
      const normalizedProductId = String(data.productId || '').trim();
      if (!normalizedProductId || normalizedProductId === 'undefined' || normalizedProductId === 'null') {
        throw new Error('Product ID không hợp lệ');
      }
      return reviewService.create({
        ...data,
        productId: normalizedProductId,
        customerName: user?.fullName || user?.name || "Khách hàng",
      });
    },
    onSuccess: async () => {
      // Invalidate all review-related queries
      queryClient.invalidateQueries({ queryKey: ["reviews", "unreviewed", selectedOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "my"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      
      // Refetch unreviewed products to get updated list
      if (selectedOrder?.id) {
        await refetchUnreviewed();
      }
      
      toast.success("Đánh giá sản phẩm thành công");
      
      // Check if there are more products to review
      const updatedUnreviewed = await queryClient.fetchQuery({
        queryKey: ["reviews", "unreviewed", selectedOrder?.id],
        queryFn: () => reviewService.getUnreviewedProductsFromOrder(selectedOrder!.id),
      });
      
      if (!updatedUnreviewed || updatedUnreviewed.length === 0) {
        // No more products to review, close modal
        setReviewModalOpen(false);
        setSelectedOrder(null);
        setSelectedProduct(null);
      } else {
        // Reset selected product but keep modal open for more reviews
        setSelectedProduct(null);
      }
      resetReview();
    },
    onError: async (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error?.response?.data?.message || "Không thể tạo đánh giá";
      if (errorMessage.includes("đã đánh giá") || errorMessage.includes("chỉ được đánh giá 1 lần")) {
        toast.error("Bạn đã đánh giá sản phẩm này rồi. Mỗi sản phẩm chỉ được đánh giá 1 lần.");
        // Refresh unreviewed products to update UI
        await queryClient.invalidateQueries({ queryKey: ["reviews", "unreviewed", selectedOrder?.id] });
        await refetchUnreviewed();
        setSelectedProduct(null);
        resetReview();
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleReviewClick = (order: Order) => {
    setSelectedOrder(order);
    setSelectedProduct(null);
    setReviewModalOpen(true);
  };

  const handleSelectProduct = (productId: string, productName: string) => {
    // Normalize productId to string to ensure consistency
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId || normalizedProductId === 'undefined' || normalizedProductId === 'null') {
      console.error('Invalid productId:', productId);
      return;
    }
    setSelectedProduct({ productId: normalizedProductId, productName });
    setValueReview("productId", normalizedProductId);
    setValueReview("rating", 5);
    setValueReview("comment", "");
  };

  // Don't render if not hydrated or not authenticated
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated || !accessToken || !user || role !== "customer") {
    return null;
  }

  return (
    <PageShell>
      <PageHeader
        title="Đơn hàng của tôi"
        breadcrumbs={[{ label: "Trang chủ", href: "/" }, { label: "Đơn hàng" }]}
      />
      <main className="space-y-6">

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton className="h-6 w-1/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải đơn hàng"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Bạn chưa có đơn hàng nào"
            description="Bắt đầu mua sắm để tạo đơn hàng đầu tiên"
            action={{ label: "Tiếp tục mua sắm", onClick: () => window.location.href = "/products" }}
          />
        ) : (
          <>
            <div className="space-y-4">
              {data.filter((order: Order) => order && order.id).map((order: Order) => (
          <Card key={order.id} variant="outline">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-secondary-900">
                    Đơn hàng #{order.id.slice(-8).toUpperCase()}
                  </h3>
                  <p className="text-sm text-secondary-600 mt-1">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="space-y-2 mb-4">
                {order.items?.map((item: OrderItem, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm text-secondary-700">
                    <span>
                      {item.product?.name || "Sản phẩm"} x {item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-secondary-200">
                <div>
                  <p className="text-sm text-secondary-600">Tổng cộng</p>
                  <p className="text-xl font-semibold text-secondary-900">
                    {formatCurrency(order.totalAmount || order.totalPrice || 0)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/orders/${order.id}`} prefetch={false}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      Chi tiết
                      <span>→</span>
                    </Button>
                  </Link>
                  {/* Review button - chỉ khi đơn hàng đã giao */}
                  {(order.status?.toUpperCase() === "DELIVERED" || order.status?.toUpperCase() === "COMPLETED") && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleReviewClick(order)}
                    >
                      Đánh giá
                    </Button>
                  )}
                  {/* 2: Cancel order - chỉ khi chưa PACKING */}
                  {(order.status === "pending" || 
                    order.status === "PENDING_CONFIRMATION" || 
                    order.status === "confirmed" || 
                    order.status === "CONFIRMED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
                          try {
                            await orderService.cancelOrder(order.id);
                            window.location.reload();
                          } catch (error: unknown) {
                            const message = error instanceof Error ? error.message : "Không thể hủy đơn hàng";
                            alert(message);
                          }
                        }
                      }}
                    >
                      Hủy đơn
                    </Button>
                  )}
                </div>
              </div>
                </CardContent>
              </Card>
              ))}
            </div>

          </>
        )}
      </main>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedOrder(null);
          setSelectedProduct(null);
          resetReview();
        }}
        title={`Đánh giá đơn hàng #${selectedOrder?.id.slice(-8).toUpperCase() || ""}`}
        size="lg"
      >
        {!selectedProduct ? (
          // Product selection step
          <div className="space-y-4">
            <p className="text-sm text-secondary-600 mb-4">
              Chọn sản phẩm bạn muốn đánh giá:
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoadingUnreviewed ? (
                <div className="text-center py-4 text-secondary-500">Đang tải...</div>
              ) : (
                selectedOrder?.items?.map((item: OrderItem, idx: number) => {
                  // Normalize productId to string for consistent comparison
                  const productId = String(
                    item.productId?.toString() 
                    || item.productId
                    || item.product?.id?.toString()
                    || item.product?.id
                    || item.product?._id?.toString()
                    || item.product?._id
                    || ""
                  );
                  const productName = item.product?.name || item.productName || "Sản phẩm";
                  
                  // Logic: 
                  // - Only mark as reviewed if:
                  //   1. Query is done (not loading)
                  //   2. Query returned data (not undefined/null) AND has items (not empty array)
                  //   3. productId exists and is valid
                  //   4. productId is NOT in unreviewedProductIds (meaning it was reviewed)
                  // - If query is still loading, no data, or empty array, show as reviewable (not reviewed)
                  const hasValidProductId = productId && productId !== "undefined" && productId !== "null" && productId !== "";
                  const queryHasData = unreviewedProducts !== undefined && unreviewedProducts !== null;
                  
                  // IMPORTANT: Only mark as reviewed if:
                  // 1. Query is done (not loading)
                  // 2. Query returned data (successful query, not error) AND is an array
                  // 3. We have a valid productId
                  // 4. Query returned a non-empty array (meaning query succeeded and has data)
                  // 5. productId is NOT in the unreviewed list (this specific product was reviewed)
                  // 
                  // NOTE: We do NOT mark as reviewed if query returns empty array []
                  // because empty array could mean:
                  // - All products are reviewed (correct case)
                  // - Query failed or order not DELIVERED (wrong case - would show false "Đã đánh giá")
                  // To be safe, we only mark as reviewed when we have explicit confirmation
                  // that the product is NOT in the unreviewed list
                  const querySucceeded = !isLoadingUnreviewed 
                    && queryHasData 
                    && Array.isArray(unreviewedProducts);
                  
                  // Only mark as reviewed if:
                  // - Query succeeded
                  // - Query returned non-empty array (has data to compare)
                  // - productId is valid
                  // - productId is NOT in unreviewed list (explicitly reviewed)
                  const isReviewed = querySucceeded
                    && hasValidProductId 
                    && unreviewedProducts.length > 0 // Must have data to compare (non-empty array)
                    && !unreviewedProductIds.has(productId); // Product explicitly not in unreviewed list
                  
                  // Ensure boolean type (not boolean | "")
                  const isDisabled = Boolean(!productId || isReviewed);
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => productId && !isReviewed && handleSelectProduct(productId, productName)}
                      disabled={isDisabled}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        isDisabled
                          ? "bg-secondary-50 border-secondary-200 cursor-not-allowed opacity-60"
                          : "bg-white border-secondary-200 hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-secondary-900">{productName}</p>
                          <p className="text-sm text-secondary-600">
                            Số lượng: {item.quantity} • {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                        {isReviewed ? (
                          <span className="text-xs text-secondary-500">Đã đánh giá</span>
                        ) : (
                          <span className="text-primary-600">→</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {selectedOrder?.items?.length === 0 && (
              <p className="text-center text-secondary-500 py-4">Không có sản phẩm nào</p>
            )}
          </div>
        ) : (
          // Review form step
          <form
            onSubmit={handleSubmitReview((data) => createReviewMutation.mutate(data))}
            className="space-y-6"
          >
            <input type="hidden" {...registerReview("productId")} />

            <div className="bg-secondary-50 p-4 rounded-lg">
              <p className="text-sm text-secondary-600 mb-1">Sản phẩm:</p>
              <p className="font-medium text-secondary-900">{selectedProduct.productName}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-secondary-500 mb-3">
                Bạn cảm thấy sản phẩm thế nào?
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setValueReview("rating", star)}
                    className="text-4xl transition-all transform hover:scale-110 duration-200"
                  >
                    <FiStar
                      className={
                        star <= reviewRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-secondary-200"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
            <Textarea
              {...registerReview("comment")}
              placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này... (tối đa 100 ký tự)"
              rows={4}
              className="resize-none"
              maxLength={100}
            />
            <div className="flex justify-between items-center mt-1">
              <div>
                {reviewErrors.comment && (
                  <p className="text-sm text-red-600">{reviewErrors.comment.message}</p>
                )}
              </div>
              <p className="text-xs text-secondary-500">
                {(() => {
                  const text = watchReview("comment") || "";
                  const charCount = text.length;
                  return `${charCount}/100 ký tự`;
                })()}
              </p>
            </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedProduct(null);
                  resetReview();
                }}
              >
                Quay lại
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={createReviewMutation.isPending}
              >
                Gửi đánh giá
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  );
}

