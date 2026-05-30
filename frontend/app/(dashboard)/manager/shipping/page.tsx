"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/orderService";
import { userService } from "@/services/userService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Order, User } from "@/lib/types";
import { formatCurrency, formatShippingAddress } from "@/lib/format";
import { FiTruck, FiUserPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import Modal from "@/components/ui/Modal";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    PACKING: { label: "Đang đóng gói", variant: "warning" },
    OUT_FOR_DELIVERY: { label: "Đang giao", variant: "info" },
    DELIVERED: { label: "Đã giao", variant: "success" },
    DELIVERY_FAILED: { label: "Giao thất bại", variant: "danger" },
  };
  const normalized = status.toUpperCase();
  return statusMap[normalized] || { label: status, variant: "info" };
};

export default function ManagerShippingPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const branchId = user?.branchId;
  const [statusFilter, setStatusFilter] = useState("PACKING");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedShipperId, setSelectedShipperId] = useState("");

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["manager", "shipping", branchId, statusFilter],
    queryFn: () => orderService.getOrders(1, 100, {
      ...(statusFilter !== "all" && { status: statusFilter }),
    }),
    enabled: !!branchId,
  });

  const { data: shippers } = useQuery({
    queryKey: ["manager", "shippers", branchId],
    queryFn: () => userService.getUsers("shipper"),
    enabled: !!branchId,
  });

  const filteredOrders = orders?.items?.filter((order: Order) => {
    if (!branchId || order.branchId !== branchId) return false;
    const status = order.status.toUpperCase();
    // 0.2: Filter theo status flow mới
    return status === "PACKING" || status === "READY_TO_SHIP" || status === "SHIPPING" || status === "DELIVERED" || status === "FAILED_DELIVERY";
  }) || [];

  const assignShipperMutation = useMutation({
    mutationFn: ({ orderId, shipperId }: { orderId: string; shipperId: string }) =>
      orderService.assignShipper(orderId, shipperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "shipping"] });
      toast.success("Phân công shipper thành công");
      setAssignModalOpen(false);
      setSelectedOrder(null);
      setSelectedShipperId("");
    },
    onError: () => {
      toast.error("Không thể phân công shipper");
    },
  });

  const handleAssignShipper = () => {
    if (!selectedOrder || !selectedShipperId) {
      toast.error("Vui lòng chọn shipper");
      return;
    }
    assignShipperMutation.mutate({
      orderId: selectedOrder.id,
      shipperId: selectedShipperId,
    });
  };

  const branchShippers = shippers?.filter((shipper: User) => shipper.branchId === branchId) || [];

  const columns = [
    {
      key: "id",
      header: "Mã đơn",
      render: (order: Order) => (
        <span className="font-mono text-xs text-emerald-600">
          #{order.id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (order: Order) => (
        <div>
          <p className="font-medium">{order.user?.fullName || order.user?.name || "N/A"}</p>
          <p className="text-xs text-stone-500">{order.user?.phone || "N/A"}</p>
        </div>
      ),
    },
    {
      key: "address",
      header: "Địa chỉ giao hàng",
      render: (order: Order) => (
        <div className="max-w-xs">
          <p className="text-sm">
            {formatShippingAddress(order.shippingAddress)}
          </p>
        </div>
      ),
    },
    {
      key: "shipper",
      header: "Shipper",
      render: (order: Order) => (
        <div>
          {order.shipper ? (
            <>
              <p className="font-medium text-sm">{order.shipper.fullName || order.shipper.name || "N/A"}</p>
              <p className="text-xs text-stone-500">{order.shipper.phone || "N/A"}</p>
            </>
          ) : (
            <span className="text-sm text-stone-400">Chưa phân công</span>
          )}
        </div>
      ),
    },
    {
      key: "total",
      header: "Tổng tiền",
      render: (order: Order) => (
        <span className="font-semibold text-emerald-600">
          {formatCurrency(order.totalPrice || order.totalAmount || 0)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (order: Order) => {
        const statusInfo = getStatusBadge(order.status);
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (order: Order) => (
        <div className="flex gap-2">
          {order.status.toUpperCase() === "PACKING" && !order.shipperId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedOrder(order);
                setAssignModalOpen(true);
              }}
            >
              <FiUserPlus className="w-4 h-4 mr-1" />
              Phân công
            </Button>
          )}
        </div>
      ),
    },
  ];

  const packingCount = filteredOrders.filter((o: Order) => o.status.toUpperCase() === "PACKING").length;
  const readyToShipCount = filteredOrders.filter((o: Order) => o.status.toUpperCase() === "READY_TO_SHIP").length;
  const shippingCount = filteredOrders.filter((o: Order) => o.status.toUpperCase() === "SHIPPING").length;
  const deliveredCount = filteredOrders.filter((o: Order) => o.status.toUpperCase() === "DELIVERED").length;

  if (!branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Quản lý giao hàng"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Giao hàng" }]}
        />
        <EmptyState
          title="Bạn chưa được gán cho chi nhánh nào"
          description="Vui lòng liên hệ quản trị viên"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Quản lý giao hàng"
        breadcrumbs={[
          { label: "Dashboard", href: "/manager" },
          { label: "Giao hàng" },
        ]}
      />
      <main className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Đang đóng gói
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{packingCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Đang giao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{shippingCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Đã giao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">{deliveredCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Shipping Table */}
        <DataTable
          columns={columns}
          data={filteredOrders}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              filters={
                <Select
                  options={[
                    { value: "PACKING", label: "Đang đóng gói" },
                    { value: "READY_TO_SHIP", label: "Sẵn sàng giao" },
                    { value: "SHIPPING", label: "Đang giao" },
                    { value: "DELIVERED", label: "Đã giao" },
                    { value: "all", label: "Tất cả" },
                  ]}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-48"
                />
              }
            />
          }
          emptyState={
            <EmptyState
              icon={<FiTruck className="w-16 h-16 text-stone-300" />}
              title="Chưa có đơn hàng nào"
              description="Đơn hàng cần giao sẽ hiển thị tại đây"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải đơn hàng"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}

        {/* Assign Shipper Modal */}
        <Modal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedOrder(null);
            setSelectedShipperId("");
          }}
          title="Phân công shipper"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-stone-600 mb-1">Đơn hàng</p>
                <p className="font-medium">#{selectedOrder.id.slice(-8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600 mb-1">Khách hàng</p>
                <p className="font-medium">{selectedOrder.user?.fullName || selectedOrder.user?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600 mb-2">Chọn shipper</p>
                <Select
                  options={[
                    { value: "", label: "Chọn shipper..." },
                    ...branchShippers.map((shipper: User) => ({
                      value: shipper.id,
                      label: `${shipper.fullName || shipper.name} - ${shipper.phone || "N/A"}`,
                    })),
                  ]}
                  value={selectedShipperId}
                  onChange={(e) => setSelectedShipperId(e.target.value)}
                />
              </div>
              {branchShippers.length === 0 && (
                <p className="text-sm text-amber-600">
                  Chưa có shipper nào trong chi nhánh. Vui lòng thêm shipper trước.
                </p>
              )}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignModalOpen(false);
                    setSelectedOrder(null);
                    setSelectedShipperId("");
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAssignShipper}
                  isLoading={assignShipperMutation.isPending}
                  disabled={!selectedShipperId || branchShippers.length === 0}
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </PageShell>
  );
}

