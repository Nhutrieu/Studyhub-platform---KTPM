"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { orderService } from "@/services/orderService";
import { disputeService } from "@/services/disputeService";
import { reviewService } from "@/services/reviewService";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { toast } from "react-toastify";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { OrderItem } from "@/lib/types";
import OrderTimeline from "@/components/order/OrderTimeline";
import OrderItemsTable from "@/components/order/OrderItemsTable";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { routes } from "@/lib/config/routes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { disputeSchema, reviewSchema } from "@/lib/validation";
import { FiAlertCircle, FiStar } from "react-icons/fi";
import type { AxiosError } from "axios";
import type { z } from "zod";
import { useAuthStore } from "@/store/authStore";

type DisputeForm = z.infer<typeof disputeSchema>;

const statusColors: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  confirmed: "info",
  preparing: "info",
  ready: "info",
  shipping: "info",
  delivered: "success",
  cancelled: "danger",
};

const statusLabels: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<{ productId: string; productName: string } | null>(null);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getOrder(orderId),
  });

  // Check if dispute already exists for this order
  const { data: existingDispute } = useQuery({
    queryKey: ["dispute", "order", orderId],
    queryFn: () => disputeService.getByOrderId(orderId),
    enabled: !!orderId,
  });

  // Get unreviewed products from this order
  const orderStatusUpper = order?.status?.toUpperCase();
  const canReview = orderStatusUpper === "DELIVERED" || orderStatusUpper === "COMPLETED";
  
  const { data: unreviewedProducts, isLoading: isLoadingUnreviewed, error: unreviewedError, refetch: refetchUnreviewed } = useQuery({
    queryKey: ["reviews", "unreviewed", orderId],
    queryFn: () => reviewService.getUnreviewedProductsFromOrder(orderId),
    enabled: !!orderId && !!canReview,
    retry: 1,
  });

  // Handle error separately using useEffect
  useEffect(() => {
    if (unreviewedError) {
      console.error("Error fetching unreviewed products:", unreviewedError);
    }
  }, [unreviewedError]);

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

  // Debug log and error handling
  useEffect(() => {
    if (order) {
      console.log("Order status:", order.status, "canReview:", canReview);
      console.log("Unreviewed products:", unreviewedProducts);
      console.log("Unreviewed product IDs:", unreviewedProductIds);
    }
    if (unreviewedError) {
      console.error("Error fetching unreviewed products:", unreviewedError);
    }
  }, [order, canReview, unreviewedProducts, unreviewedProductIds, unreviewedError]);

  // 2: Cancel order mutation - chỉ khi chưa PACKING
  const cancelOrderMutation = useMutation({
    mutationFn: (reason?: string) => orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      toast.success("Đã hủy đơn hàng thành công");
      setCancelModalOpen(false);
      setCancelReason("");
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error?.response?.data?.message || "Không thể hủy đơn hàng");
    },
  });

  // Check if order can be cancelled (2: chỉ khi chưa PACKING)
  const canCancel = order && (
    order.status === "PENDING_CONFIRMATION" ||
    order.status === "pending" ||
    order.status === "CONFIRMED" ||
    order.status === "confirmed"
  );

  // 0.4: Check if order can have dispute (SHIPPING, DELIVERED, COMPLETED, FAILED_DELIVERY)
  const canCreateDispute = order && !existingDispute && (
    order.status === "SHIPPING" ||
    order.status === "DELIVERED" ||
    order.status === "COMPLETED" ||
    order.status === "FAILED_DELIVERY"
  );

  // Dispute form
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<DisputeForm>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      orderId: orderId,
      type: "other" as const,
      reason: "",
      description: "",
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: (data: DisputeForm) => {
      // Ensure reason is always provided
      const reason = (data.reason && data.reason.trim().length >= 10) 
        ? data.reason.trim() 
        : data.description.trim().substring(0, 100);
      
      return disputeService.create({
        ...data,
        reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispute", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["disputes", "my"] });
      toast.success("Tạo yêu cầu hỗ trợ thành công");
      setDisputeModalOpen(false);
      reset();
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error?.response?.data?.message || "Không thể tạo yêu cầu hỗ trợ");
    },
  });

  const onSubmitDispute = (data: DisputeForm) => {
    createDisputeMutation.mutate(data);
  };

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
      queryClient.invalidateQueries({ queryKey: ["reviews", "unreviewed", orderId] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["reviews", "my"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      
      // Refetch unreviewed products to get updated list
      await refetchUnreviewed();
      
      toast.success("Đánh giá sản phẩm thành công");
      setReviewModalOpen(false);
      setSelectedProductForReview(null);
      resetReview();
    },
    onError: async (error: Error & { response?: { data?: { message?: string } } }) => {
      const errorMessage = error?.response?.data?.message || "Không thể tạo đánh giá";
      if (errorMessage.includes("đã đánh giá") || errorMessage.includes("chỉ được đánh giá 1 lần")) {
        toast.error("Bạn đã đánh giá sản phẩm này rồi. Mỗi sản phẩm chỉ được đánh giá 1 lần.");
        // Refresh unreviewed products to update UI
        await queryClient.invalidateQueries({ queryKey: ["reviews", "unreviewed", orderId] });
        await refetchUnreviewed();
        setReviewModalOpen(false);
        setSelectedProductForReview(null);
        resetReview();
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleReviewClick = (productId: string, productName: string) => {
    // Normalize productId to string to ensure consistency
    const normalizedProductId = String(productId || '').trim();
    if (!normalizedProductId || normalizedProductId === 'undefined' || normalizedProductId === 'null') {
      console.error('Invalid productId:', productId);
      return;
    }
    setSelectedProductForReview({ productId: normalizedProductId, productName });
    setValueReview("productId", normalizedProductId);
    setValueReview("rating", 5);
    setValueReview("comment", "");
    setReviewModalOpen(true);
  };

  useEffect(() => {
    if (order) {
      console.log("Order data:", order);
      console.log("Order items:", order.items);
      console.log("Items length:", order.items?.length);
      if (order.items) {
        order.items.forEach((item, idx) => {
          console.log(`Item ${idx}:`, item);
        });
      }
    }
  }, [order]);

  // Note: getTracking method doesn't exist yet, will be implemented when tracking service is ready
  // const { data: tracking } = useQuery({
  //   queryKey: ["tracking", orderId],
  //   queryFn: () => orderService.getTracking(orderId),
  //   enabled: !!orderId,
  // });
  const tracking = null;

  return (
    <PageShell>
      <PageHeader
        title={`Đơn hàng #${order?.id.slice(-8).toUpperCase() || "..."}`}
        breadcrumbs={[
          { label: "Trang chủ", href: routes.home },
          { label: "Đơn hàng", href: routes.customer.orders },
          { label: `#${order?.id.slice(-8).toUpperCase() || "..."}` },
        ]}
        actions={order && <OrderStatusBadge status={order.status} />}
      />
      <main className="space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/4" />
            <Card>
              <CardContent>
                <Skeleton className="h-6 w-full mb-4" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
        ) : isError || !order ? (
          <ErrorState
            title="Không tìm thấy đơn hàng"
            description="Đơn hàng không tồn tại hoặc đã bị xóa"
            action={{ label: "Quay lại", onClick: () => window.location.href = routes.customer.orders }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Order Timeline */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-6">
                    <OrderTimeline order={order} />
                  </CardContent>
                </Card>
              </div>

              {/* Order Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Sản phẩm</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OrderItemsTable 
                      items={(order.items || []) as OrderItem[]} 
                      showImage={true}
                      orderId={order.id || orderId}
                      orderStatus={order.status}
                      canEdit={canCancel} // Can edit if can cancel (PENDING or CONFIRMED)
                      onReviewClick={handleReviewClick}
                      unreviewedProductIds={unreviewedProductIds}
                      isLoadingUnreviewed={isLoadingUnreviewed}
                      unreviewedProductsData={unreviewedProducts}
                    />
                    <div className="border-t mt-4 pt-4">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Tổng cộng:</span>
                        <span className="text-primary-600">
                          {formatCurrency(order.totalPrice || order.totalAmount || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Địa chỉ giao hàng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {typeof order.shippingAddress === "string" ? (
                        <p className="text-secondary-600">{order.shippingAddress}</p>
                      ) : (
                        <>
                          <p className="font-medium">
                            {order.shippingAddress?.fullName || "N/A"}
                          </p>
                          <p className="text-secondary-600">{order.shippingAddress?.phone}</p>
                          <p className="text-secondary-600">
                            {order.shippingAddress?.address}, {order.shippingAddress?.ward}, {order.shippingAddress?.district}, {order.shippingAddress?.city}
                          </p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Thông tin đơn hàng</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-secondary-500">Ngày đặt</p>
                      <p className="font-semibold">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Phương thức thanh toán</p>
                      <p className="font-semibold capitalize">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Trạng thái thanh toán</p>
                      <Badge
                        variant={
                          (order.paymentStatus?.toLowerCase() === "paid" || order.paymentStatus === "PAID" || order.isPaid)
                            ? "success"
                            : (order.paymentStatus?.toLowerCase() === "pending" || order.paymentStatus === "UNPAID" || order.paymentStatus === "REFUND_PENDING")
                              ? "warning"
                              : (order.paymentStatus === "REFUNDED")
                                ? "info"
                                : "danger"
                        }
                      >
                        {(order.paymentStatus?.toLowerCase() === "paid" || order.paymentStatus === "PAID" || order.isPaid)
                          ? "Đã thanh toán"
                          : (order.paymentStatus?.toLowerCase() === "pending" || order.paymentStatus === "UNPAID")
                            ? order.paymentMethod?.toLowerCase() === "cod" 
                              ? "Thanh toán khi nhận hàng"
                              : "Chờ thanh toán"
                            : (order.paymentStatus === "REFUND_PENDING")
                              ? "Đang hoàn tiền"
                              : (order.paymentStatus === "REFUNDED")
                                ? "Đã hoàn tiền"
                                : "Thất bại"}
                      </Badge>
                    </div>
                    {order.branch && (
                      <div>
                        <p className="text-sm text-secondary-500">Chi nhánh xử lý</p>
                        <p className="font-semibold">{order.branch.name}</p>
                        {typeof order.branch.address === "string" ? (
                          <p className="text-sm text-secondary-600">{order.branch.address}</p>
                        ) : (
                          <p className="text-sm text-secondary-600">
                            {order.branch.address?.street}, {order.branch.address?.ward}, {order.branch.address?.district}
                          </p>
                        )}
                      </div>
                    )}
                    {order.trackingNumber && (
                      <div>
                        <p className="text-sm text-secondary-500">Mã vận đơn</p>
                        <p className="font-semibold font-mono">{order.trackingNumber}</p>
                      </div>
                    )}
                    {order.shipper && (
                      <div>
                        <p className="text-sm text-secondary-500">Shipper</p>
                        <p className="font-semibold">
                          {order.shipper.fullName || order.shipper.name} - {order.shipper.phone}
                        </p>
                      </div>
                    )}
                    {/* 2: Cancel order button - chỉ khi chưa PACKING */}
                    {canCancel && (
                      <div className="pt-4 border-t border-secondary-200">
                        <Button
                          variant="outline"
                          className="w-full border-error-300 text-error-600 hover:bg-error-50"
                          onClick={() => setCancelModalOpen(true)}
                        >
                          Hủy đơn hàng
                        </Button>
                      </div>
                    )}
                    {/* 0.4: Dispute button - chỉ khi order ở trạng thái cho phép */}
                    {canCreateDispute && (
                      <div className="pt-4 border-t border-secondary-200">
                        <Button
                          variant="outline"
                          className="w-full border-warning-300 text-warning-600 hover:bg-warning-50"
                          onClick={() => setDisputeModalOpen(true)}
                        >
                          <FiAlertCircle className="w-4 h-4 mr-2" />
                          Tạo yêu cầu hỗ trợ
                        </Button>
                      </div>
                    )}
                    {existingDispute && (
                      <div className="pt-4 border-t border-secondary-200">
                        <Link href={routes.customer.disputes} className="block">
                          <Button
                            variant="outline"
                            className="w-full"
                          >
                            Xem yêu cầu hỗ trợ
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelReason("");
        }}
        title="Hủy đơn hàng"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Lý do hủy (tùy chọn)</label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy đơn hàng..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setCancelReason("");
              }}
              className="flex-1"
            >
              Không
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelOrderMutation.mutate(cancelReason || undefined)}
              isLoading={cancelOrderMutation.isPending}
              className="flex-1"
            >
              Xác nhận hủy
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Dispute Modal */}
      <Modal
        isOpen={disputeModalOpen}
        onClose={() => {
          setDisputeModalOpen(false);
          reset();
        }}
        title="Tạo yêu cầu hỗ trợ"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmitDispute)} className="space-y-4">
          <input type="hidden" {...register("orderId")} value={orderId} />

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Loại yêu cầu
            </label>
            <Select
              {...register("type")}
              error={errors.type?.message}
              options={[
                { value: "", label: "Chọn loại yêu cầu" },
                { value: "quality", label: "Chất lượng sản phẩm" },
                { value: "damage", label: "Sản phẩm bị hư hỏng" },
                { value: "missing", label: "Thiếu sản phẩm" },
                { value: "wrong_item", label: "Sai sản phẩm" },
                { value: "delivery", label: "Vấn đề giao hàng" },
                { value: "payment", label: "Vấn đề thanh toán" },
                { value: "other", label: "Khác" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Lý do
            </label>
            <Textarea
              {...register("reason")}
              error={errors.reason?.message}
              placeholder="Lý do yêu cầu hỗ trợ..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...register("description")}
              error={errors.description?.message}
              placeholder="Mô tả chi tiết vấn đề, tình huống cụ thể... (tối đa 100 ký tự)"
              rows={5}
              maxLength={100}
            />
            <div className="flex justify-end mt-1">
              <p className="text-xs text-secondary-500">
                {(() => {
                  const text = watch("description") || "";
                  const charCount = text.length;
                  return `${charCount}/100 ký tự`;
                })()}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={createDisputeMutation.isPending}
            >
              Gửi yêu cầu
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDisputeModalOpen(false);
                reset();
              }}
            >
              Hủy
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedProductForReview(null);
          resetReview();
        }}
        title={`Đánh giá ${selectedProductForReview?.productName || "sản phẩm"}`}
      >
        <form
          onSubmit={handleSubmitReview((data) => createReviewMutation.mutate(data))}
          className="space-y-6"
        >
          <input type="hidden" {...registerReview("productId")} />

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
          <Button
            type="submit"
            variant="primary"
            className="w-full text-base py-3"
            isLoading={createReviewMutation.isPending}
          >
            Gửi đánh giá
          </Button>
        </form>
      </Modal>
    </PageShell>
  );
}
