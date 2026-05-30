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
import { FiCheck, FiUser, FiTruck } from "react-icons/fi";

export default function ManagerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [assignEmployeeModalOpen, setAssignEmployeeModalOpen] = useState(false);
  const [assignShipperModalOpen, setAssignShipperModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedShipperId, setSelectedShipperId] = useState("");

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["manager", "order", orderId],
    queryFn: () => orderService.getOrder(orderId),
  });

  // Get employees and shippers for assignment
  const { data: employees } = useQuery({
    queryKey: ["manager", "employees", user?.branchId],
    queryFn: () => userService.getUsers("employee"),
    enabled: !!user?.branchId && assignEmployeeModalOpen,
  });

  const { data: shippers } = useQuery({
    queryKey: ["manager", "shippers", user?.branchId],
    queryFn: () => userService.getUsers("shipper"),
    enabled: !!user?.branchId && assignShipperModalOpen,
  });

  const branchEmployees = employees?.filter((emp: User) => emp.branchId === user?.branchId) || [];
  const branchShippers = shippers?.filter((shipper: User) => shipper.branchId === user?.branchId) || [];

  const confirmOrderMutation = useMutation({
    mutationFn: () => orderService.updateStatus(orderId, "CONFIRMED"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["manager", "orders"] });
      toast.success("Xác nhận đơn hàng thành công");
      setConfirmModalOpen(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể xác nhận đơn hàng";
      toast.error(message);
    },
  });

  const assignShipperMutation = useMutation({
    mutationFn: (shipperId: string) => orderService.assignShipper(orderId, shipperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["manager", "orders"] });
      toast.success("Phân công shipper thành công");
      setAssignShipperModalOpen(false);
      setSelectedShipperId("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể phân công shipper";
      toast.error(message);
    },
  });

  const assignEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => orderService.assignEmployee(orderId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["manager", "orders"] });
      toast.success("Phân công nhân viên thành công");
      setAssignEmployeeModalOpen(false);
      setSelectedEmployeeId("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể phân công nhân viên";
      toast.error(message);
    },
  });

  const handleAssignEmployee = () => {
    if (!order || !selectedEmployeeId) {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }
    assignEmployeeMutation.mutate(selectedEmployeeId);
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết đơn hàng"
          breadcrumbs={[
            { label: "Dashboard", href: routes.manager.dashboard },
            { label: "Đơn hàng", href: routes.manager.orders },
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
            { label: "Dashboard", href: routes.manager.dashboard },
            { label: "Đơn hàng", href: routes.manager.orders },
            { label: "Chi tiết" },
          ]}
        />
        <ErrorState
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng không tồn tại hoặc đã bị xóa"
          action={{
            label: "Quay lại",
            onClick: () => router.push(routes.manager.orders),
          }}
        />
      </PageShell>
    );
  }

  const status = order.status.toUpperCase();
  const canConfirm = status === "PENDING_CONFIRMATION";
  const canAssignShipper = status === "READY_TO_SHIP" || status === "CONFIRMED" || status === "PACKING";
  const canAssignEmployee = status === "CONFIRMED" || status === "PACKING"; // Employees handle packing

  return (
    <PageShell>
      <PageHeader
        title={`Đơn hàng #${order.id.slice(-8).toUpperCase()}`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.manager.dashboard },
          { label: "Đơn hàng", href: routes.manager.orders },
          { label: `#${order.id.slice(-8).toUpperCase()}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {order && <OrderStatusBadge status={order.status} />}
          </div>
        }
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
            {/* Manager Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Thao tác</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canConfirm && (
                  <Button
                    variant="primary"
                    onClick={() => setConfirmModalOpen(true)}
                    className="w-full"
                  >
                    <FiCheck className="w-4 h-4 mr-2" />
                    Xác nhận đơn hàng
                  </Button>
                )}
                {canAssignShipper && (
                  <Button
                    variant="outline"
                    onClick={() => setAssignShipperModalOpen(true)}
                    className="w-full"
                    disabled={!!order.shipperId}
                  >
                    <FiTruck className="w-4 h-4 mr-2" />
                    {order.shipperId ? "Đã phân công shipper" : "Phân công shipper"}
                  </Button>
                )}
                {canAssignEmployee && (
                  <Button
                    variant="outline"
                    onClick={() => setAssignEmployeeModalOpen(true)}
                    className="w-full"
                    disabled={!!order.assignedEmployeeId}
                  >
                    <FiUser className="w-4 h-4 mr-2" />
                    {order.assignedEmployeeId ? "Đã phân công nhân viên" : "Phân công nhân viên"}
                  </Button>
                )}
              </CardContent>
            </Card>

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
                <div>
                  <p className="text-sm text-secondary-500">Phương thức thanh toán</p>
                  <p className="font-semibold capitalize">{order.paymentMethod || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Trạng thái thanh toán</p>
                  <Badge
                    variant={
                      order.paymentStatus === "paid" || order.paymentStatus === "PAID"
                        ? "success"
                        : order.paymentStatus === "pending" || order.paymentStatus === "UNPAID"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {order.paymentStatus === "paid" || order.paymentStatus === "PAID"
                      ? "Đã thanh toán"
                      : order.paymentStatus === "pending" || order.paymentStatus === "UNPAID"
                      ? "Chờ thanh toán"
                      : "Thất bại"}
                  </Badge>
                </div>
                {order.branch && (
                  <div>
                    <p className="text-sm text-secondary-500">Chi nhánh xử lý</p>
                    <p className="font-semibold">{order.branch.name}</p>
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
          </div>
        </div>
      </main>

      {/* Confirm Order Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận đơn hàng"
      >
        <div className="space-y-4">
          <p className="text-secondary-700">
            Bạn có chắc chắn muốn xác nhận đơn hàng này không?
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => confirmOrderMutation.mutate()}
              isLoading={confirmOrderMutation.isPending}
              className="flex-1"
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>

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
          />
          {branchShippers.length === 0 && (
            <p className="text-sm text-secondary-500">
              Chưa có shipper nào trong chi nhánh. Vui lòng thêm shipper trước.
            </p>
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

