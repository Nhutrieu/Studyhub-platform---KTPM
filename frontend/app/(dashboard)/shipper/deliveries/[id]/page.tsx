"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/orderService";
import { uploadService } from "@/services/uploadService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import OrderItemsTable from "@/components/order/OrderItemsTable";
import UploadProof from "@/components/shipping/UploadProof";
import { Order } from "@/lib/types";
import { formatCurrency, formatShippingAddress } from "@/lib/format";
import { FiMapPin, FiPhone, FiMail, FiNavigation } from "react-icons/fi";
import { toast } from "react-toastify";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useState } from "react";

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [deliveryConfirmModalOpen, setDeliveryConfirmModalOpen] = useState(false);
  const [deliveryConfirmation, setDeliveryConfirmation] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getOrder(orderId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes, deliveryConfirmation, deliveryProof }: { status: string; notes?: string; deliveryConfirmation?: string; deliveryProof?: string }) =>
      orderService.updateStatus(orderId, status, notes, deliveryConfirmation, deliveryProof),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["shipper", "deliveries"] });
      toast.success("Cập nhật trạng thái thành công");
    },
    onError: () => {
      toast.error("Không thể cập nhật trạng thái");
    },
  });

  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      // uploadService.uploadImage expects File or FormData with field name "file"
      // Pass File directly, uploadService will handle FormData creation
      const response = await uploadService.uploadImage(file);
      return response.url;
    },
    onSuccess: (imageUrl) => {
      // Update order with proof image
      updateStatusMutation.mutate({
        status: order?.status || "DELIVERED",
        deliveryProof: imageUrl,
      });
    },
    onError: () => {
      toast.error("Không thể tải ảnh");
    },
  });

  const handleStatusUpdate = (newStatus: string, deliveryConfirmation?: string) => {
    if (newStatus === "DELIVERED" && !order?.shipperId) {
      toast.error("Bạn chưa được phân công cho đơn hàng này");
      return;
    }
    // 6: DELIVERED phải có delivery confirmation
    if (newStatus === "DELIVERED" && !deliveryConfirmation) {
      toast.error("Cần có xác nhận giao hàng (OTP/chữ ký/ảnh)");
      return;
    }
    updateStatusMutation.mutate({ 
      status: newStatus,
      ...(deliveryConfirmation && { deliveryConfirmation }),
    });
  };

  const handleUploadProof = async (file: File) => {
    await uploadProofMutation.mutateAsync(file);
  };

  const getMapUrl = () => {
    const address = formatShippingAddress(order?.shippingAddress);
    return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết giao hàng"
          breadcrumbs={[
            { label: "Dashboard", href: "/shipper" },
            { label: "Giao hàng", href: "/shipper/deliveries" },
            { label: "Chi tiết" },
          ]}
        />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError || !order) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết giao hàng"
          breadcrumbs={[
            { label: "Dashboard", href: "/shipper" },
            { label: "Giao hàng", href: "/shipper/deliveries" },
            { label: "Chi tiết" },
          ]}
        />
        <ErrorState
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc đã bị xóa"
          action={{ label: "Quay lại", onClick: () => router.push("/shipper/deliveries") }}
        />
      </PageShell>
    );
  }

  const status = order.status.toUpperCase();
  // 6: Shipper chỉ được update khi order ở READY_TO_SHIP hoặc SHIPPING
  const canUpdate = status === "READY_TO_SHIP" || status === "SHIPPING";

  return (
    <PageShell>
      <PageHeader
        title={`Đơn hàng #${order.id.slice(-8).toUpperCase()}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/shipper" },
          { label: "Giao hàng", href: "/shipper/deliveries" },
          { label: "Chi tiết" },
        ]}
      />
      {/* SHIPPER: Mobile-first layout - tối giản, nút lớn, dễ thao tác */}
      <main className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsTable items={order.items || []} showImage={true} />
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-emerald-600">
                    {formatCurrency(order.totalPrice || order.totalAmount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin giao hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FiMapPin className="w-4 h-4 text-stone-500" />
                  <p className="font-semibold">Khách hàng</p>
                </div>
                <p className="font-medium">{order.user?.fullName || order.user?.name || "N/A"}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-stone-600">
                  <FiPhone className="w-4 h-4" />
                  <span>{order.user?.phone || "N/A"}</span>
                </div>
                {order.user?.email && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-stone-600">
                    <FiMail className="w-4 h-4" />
                    <span>{order.user.email}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FiMapPin className="w-4 h-4 text-stone-500" />
                  <p className="font-semibold">Địa chỉ giao hàng</p>
                </div>
                <p className="text-secondary-600">
                  {formatShippingAddress(order.shippingAddress)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open(getMapUrl(), "_blank")}
                >
                  <FiNavigation className="w-4 h-4 mr-2" />
                  Mở bản đồ
                </Button>
              </div>

              {order.branch && (
                <div>
                  <p className="text-sm text-stone-500 mb-1">Chi nhánh</p>
                  <p className="font-medium">{order.branch.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Update */}
        {canUpdate && (
          <Card>
            <CardHeader>
              <CardTitle>Cập nhật trạng thái</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              {/* SHIPPER: Mobile-first - nút lớn, dễ thao tác */}
              <div className="flex flex-col sm:flex-row gap-3">
                {status === "READY_TO_SHIP" && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleStatusUpdate("SHIPPING")}
                    isLoading={updateStatusMutation.isPending}
                    className="flex-1 text-base py-3"
                  >
                    🚚 Bắt đầu giao hàng
                  </Button>
                )}
                {status === "SHIPPING" && (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        // 6: DELIVERED phải có delivery confirmation - show modal
                        setDeliveryConfirmModalOpen(true);
                      }}
                      isLoading={updateStatusMutation.isPending}
                      className="flex-1 text-base py-3"
                    >
                      ✅ Đã giao thành công
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleStatusUpdate("FAILED_DELIVERY")}
                      isLoading={updateStatusMutation.isPending}
                      className="flex-1 text-base py-3"
                    >
                      ❌ Giao thất bại
                    </Button>
                  </>
                )}
              </div>

              {status === "SHIPPING" && (
                <div>
                  <UploadProof
                    onUpload={handleUploadProof}
                    isLoading={uploadProofMutation.isPending}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {status === "DELIVERED" && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <p className="font-semibold text-lg text-emerald-600">Đơn hàng đã được giao thành công</p>
                <p className="text-sm text-stone-600 mt-2">
                  {order.updatedAt && new Date(order.updatedAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SHIPPER: Modal xác nhận giao hàng (OTP/chữ ký/ảnh) */}
        <Modal
          isOpen={deliveryConfirmModalOpen}
          onClose={() => {
            setDeliveryConfirmModalOpen(false);
            setDeliveryConfirmation("");
            setDeliveryNotes("");
          }}
          title="Xác nhận giao hàng thành công"
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary-600">
              Vui lòng nhập thông tin xác nhận giao hàng (OTP/chữ ký/ghi chú):
            </p>
            <Input
              label="Xác nhận giao hàng (OTP/chữ ký)"
              value={deliveryConfirmation}
              onChange={(e) => setDeliveryConfirmation(e.target.value)}
              placeholder="Nhập OTP hoặc tên người nhận/chữ ký"
              required
            />
            <Textarea
              label="Ghi chú (tùy chọn)"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Ghi chú về việc giao hàng..."
              rows={3}
            />
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeliveryConfirmModalOpen(false);
                  setDeliveryConfirmation("");
                  setDeliveryNotes("");
                }}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!deliveryConfirmation.trim()) {
                    toast.error("Vui lòng nhập xác nhận giao hàng");
                    return;
                  }
                  handleStatusUpdate("DELIVERED", deliveryConfirmation);
                  setDeliveryConfirmModalOpen(false);
                  setDeliveryConfirmation("");
                  setDeliveryNotes("");
                }}
                isLoading={updateStatusMutation.isPending}
                className="flex-1"
              >
                Xác nhận giao hàng
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </PageShell>
  );
}

