"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { orderService } from "@/services/orderService";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/store/authStore";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
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
import { Order, User } from "@/lib/types";

export default function EmployeeOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [assignShipperModalOpen, setAssignShipperModalOpen] = useState(false);
  const [selectedShipperId, setSelectedShipperId] = useState("");

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["employee", "order", orderId],
    queryFn: () => orderService.getOrder(orderId),
  });

  // Get shippers for assignment - load when order is loaded and user has branchId
  const { data: shippers, isLoading: isLoadingShippers } = useQuery({
    queryKey: ["employee", "shippers", user?.branchId],
    queryFn: () => userService.getUsers("shipper"),
    enabled: !!user?.branchId && !!order, // Load when order is loaded, not just when modal opens
  });

  const branchShippers = shippers?.filter((shipper: User) => {
    // Compare branchId as strings to handle both string and ObjectId cases
    const shipperBranchId = shipper.branchId?.toString();
    const userBranchId = user?.branchId?.toString();
    return shipperBranchId === userBranchId;
  }) || [];

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => orderService.updateStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["employee", "orders"] });
      toast.success("Cập nhật trạng thái thành công");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái";
      toast.error(message);
    },
  });

  const assignShipperMutation = useMutation({
    mutationFn: (shipperId: string) => orderService.assignShipper(orderId, shipperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["employee", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["shipper", "deliveries"] }); // Invalidate shipper queries
      toast.success("Phân công shipper thành công");
      setAssignShipperModalOpen(false);
      setSelectedShipperId("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể phân công shipper";
      toast.error(message);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết đơn hàng"
          breadcrumbs={[
            { label: "Dashboard", href: "/employee" },
            { label: "Đơn hàng", href: "/employee/orders" },
            { label: "Chi tiết" },
          ]}
        />
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Card>
            <CardContent>
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  if (isError || !order) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết đơn hàng"
          breadcrumbs={[
            { label: "Dashboard", href: "/employee" },
            { label: "Đơn hàng", href: "/employee/orders" },
            { label: "Chi tiết" },
          ]}
        />
        <ErrorState
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc bạn không có quyền xem đơn hàng này"
          action={{
            label: "Quay lại",
            onClick: () => router.push("/employee/orders"),
          }}
        />
      </PageShell>
    );
  }

  // EMPLOYEE: Chỉ được xem đơn được phân công
  if (order.assignedEmployeeId && order.assignedEmployeeId !== user?.id) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết đơn hàng"
          breadcrumbs={[
            { label: "Dashboard", href: "/employee" },
            { label: "Đơn hàng", href: "/employee/orders" },
            { label: "Chi tiết" },
          ]}
        />
        <ErrorState
          title="Không có quyền truy cập"
          description="Bạn chỉ được xem đơn hàng được phân công cho mình"
          action={{
            label: "Quay lại",
            onClick: () => router.push("/employee/orders"),
          }}
        />
      </PageShell>
    );
  }

  const status = order.status.toUpperCase();
  const canUpdate = status === "CONFIRMED" || status === "PACKING";
  const canAssignShipper = status === "READY_TO_SHIP" || status === "CONFIRMED" || status === "PACKING";

  return (
    <PageShell>
      <PageHeader
        title={`Đơn hàng #${order.id.slice(-8).toUpperCase()}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/employee" },
          { label: "Đơn hàng", href: "/employee/orders" },
          { label: `#${order.id.slice(-8).toUpperCase()}` },
        ]}
        actions={order && <OrderStatusBadge status={order.status} />}
      />
      <main className="space-y-6">
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
            {/* EMPLOYEE: Status Update Actions */}
            {canUpdate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Cập nhật trạng thái</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {status === "CONFIRMED" && (
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange("PACKING")}
                      isLoading={updateStatusMutation.isPending}
                      className="w-full"
                    >
                      Bắt đầu đóng gói
                    </Button>
                  )}
                  {status === "PACKING" && (
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange("READY_TO_SHIP")}
                      isLoading={updateStatusMutation.isPending}
                      className="w-full"
                    >
                      Sẵn sàng giao
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* EMPLOYEE: Assign Shipper */}
            {canAssignShipper && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Phân công shipper</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.shipperId ? (
                    <div className="space-y-2">
                      <p className="text-sm text-secondary-500">Shipper đã được phân công</p>
                      <p className="font-medium text-secondary-900">
                        {order.shipper?.fullName || order.shipper?.name || "N/A"}
                      </p>
                      {order.shipper?.phone && (
                        <p className="text-sm text-secondary-600">{order.shipper.phone}</p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => setAssignShipperModalOpen(true)}
                      className="w-full"
                    >
                      Phân công shipper
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

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
                  <p className="font-semibold">{formatDateTime(order.createdAt)}</p>
                </div>
                {order.branch && (
                  <div>
                    <p className="text-sm text-secondary-500">Chi nhánh xử lý</p>
                    <p className="font-semibold">{order.branch.name}</p>
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
          </div>
        </div>
      </main>

      {/* Assign Shipper Modal */}
      <Modal
        isOpen={assignShipperModalOpen}
        onClose={() => {
          setAssignShipperModalOpen(false);
          setSelectedShipperId("");
        }}
        title="Phân công shipper"
      >
        <div className="space-y-4">
          {isLoadingShippers ? (
            <div className="text-center py-4">
              <p className="text-sm text-secondary-500">Đang tải danh sách shipper...</p>
            </div>
          ) : (
            <>
              <Select
                label="Chọn shipper"
                options={[
                  { value: "", label: "Chọn shipper..." },
                  ...branchShippers.map((shipper: User) => ({
                    value: shipper.id,
                    label: `${shipper.fullName || shipper.name} - ${shipper.phone || ""}`,
                  })),
                ]}
                value={selectedShipperId}
                onChange={(e) => setSelectedShipperId(e.target.value)}
                disabled={isLoadingShippers || branchShippers.length === 0}
              />
              {branchShippers.length === 0 && !isLoadingShippers && (
                <p className="text-sm text-secondary-500">
                  Chưa có shipper nào trong chi nhánh. Vui lòng thêm shipper trước.
                </p>
              )}
            </>
          )}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAssignShipperModalOpen(false);
                setSelectedShipperId("");
              }}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selectedShipperId) {
                  toast.error("Vui lòng chọn shipper");
                  return;
                }
                assignShipperMutation.mutate(selectedShipperId);
              }}
              isLoading={assignShipperMutation.isPending}
              disabled={!selectedShipperId || branchShippers.length === 0}
              className="flex-1"
            >
              Phân công
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

