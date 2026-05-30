"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/orderService";
import { useAuthStore } from "@/store/authStore";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
// ADMIN: Order page read-only - không cần Button, Modal, Select, Textarea
import Skeleton from "@/components/ui/Skeleton";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency, formatDateTime } from "@/lib/format";
import OrderTimeline from "@/components/order/OrderTimeline";
import OrderItemsTable from "@/components/order/OrderItemsTable";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { routes } from "@/lib/config/routes";
import { toast } from "react-toastify";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user } = useAuthStore();
  // ADMIN: Order page read-only - không có state/mutation cho status change

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "order", orderId],
    queryFn: () => orderService.getOrder(orderId),
  });

  // ADMIN: Order page read-only - không có mutation update status

  return (
    <PageShell>
      <PageHeader
        title={`Đơn hàng #${order?.id.slice(-8).toUpperCase() || "..."}`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.admin.dashboard },
          { label: "Đơn hàng", href: routes.admin.orders },
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
            action={{ 
              label: "Quay lại", 
              onClick: () => window.location.href = routes.admin.orders 
            }}
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
                    <OrderItemsTable items={order.items || []} showImage={true} />
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

                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Thông tin khách hàng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium text-secondary-900">
                        {order.user?.fullName || order.user?.name || "N/A"}
                      </p>
                      <p className="text-secondary-600">{order.user?.email || "N/A"}</p>
                      {order.user?.phone && (
                        <p className="text-secondary-600">{order.user.phone}</p>
                      )}
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
                      <p className="text-sm text-secondary-500">Mã đơn hàng</p>
                      <p className="font-semibold font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Ngày đặt</p>
                      <p className="font-semibold">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Phương thức thanh toán</p>
                      <p className="font-semibold capitalize">{order.paymentMethod || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-500">Trạng thái thanh toán</p>
                      <Badge
                        variant={
                          (order.paymentStatus?.toLowerCase() === "paid" || order.paymentStatus === "PAID" || order.isPaid)
                            ? "success"
                            : (order.paymentStatus?.toLowerCase() === "pending" || order.paymentStatus === "UNPAID" || order.paymentStatus === "REFUND_PENDING")
                            ? "warning"
                            : "danger"
                        }
                      >
                        {(order.paymentStatus?.toLowerCase() === "paid" || order.paymentStatus === "PAID" || order.isPaid)
                          ? "Đã thanh toán"
                          : (order.paymentStatus?.toLowerCase() === "pending" || order.paymentStatus === "UNPAID")
                          ? "Chờ thanh toán"
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
                    {order.notes && (
                      <div>
                        <p className="text-sm text-secondary-500">Ghi chú</p>
                        <p className="text-secondary-600">{order.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ADMIN: Order page read-only - không có nút xác nhận/giao hàng */}
                {user?.role === "admin" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Thông tin quản trị</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-secondary-50 rounded-md border border-secondary-200">
                        <p className="text-sm text-secondary-700 font-medium mb-2">
                          📋 Chế độ xem chỉ đọc (Read-only)
                        </p>
                        <p className="text-sm text-secondary-600">
                          Admin chỉ xem thông tin đơn hàng. Để can thiệp đặc biệt, vui lòng liên hệ quản lý chi nhánh hoặc sử dụng công cụ quản trị hệ thống.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ADMIN: Order page read-only - không có modal thay đổi trạng thái */}
    </PageShell>
  );
}

