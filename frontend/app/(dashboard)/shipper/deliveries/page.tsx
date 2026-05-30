"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/orderService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import { Order } from "@/lib/types";
import { formatCurrency, formatShippingAddress } from "@/lib/format";
import { FiCheckCircle, FiClock, FiTruck } from "react-icons/fi";
import { toast } from "react-toastify";
import Link from "next/link";
import { routes } from "@/lib/config/routes";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    READY_TO_SHIP: { label: "Sẵn sàng giao", variant: "info" },
    SHIPPING: { label: "Đang giao", variant: "info" },
    DELIVERED: { label: "Đã giao", variant: "success" },
    COMPLETED: { label: "Hoàn tất", variant: "success" },
    FAILED_DELIVERY: { label: "Giao thất bại", variant: "danger" },
    // Legacy
    PACKING: { label: "Đang đóng gói", variant: "warning" },
    OUT_FOR_DELIVERY: { label: "Đang giao", variant: "info" },
    DELIVERY_FAILED: { label: "Giao thất bại", variant: "danger" },
  };
  const normalized = status.toUpperCase();
  return statusMap[normalized] || { label: status, variant: "info" };
};

export default function ShipperDeliveriesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("READY_TO_SHIP");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shipper", "deliveries", user?.branchId, statusFilter],
    queryFn: () => orderService.getOrdersForShipper(),
    enabled: !!user?.branchId,
  });

  const readyToShipCount = data?.filter((order: Order) => order.status.toUpperCase() === "READY_TO_SHIP").length || 0;
  const shippingCount = data?.filter((order: Order) => order.status.toUpperCase() === "SHIPPING").length || 0;
  const deliveredCount = data?.filter((order: Order) => order.status.toUpperCase() === "DELIVERED").length || 0;

  const filteredData = data?.filter((order: Order) => {
    if (statusFilter === "all") return true;
    return order.status.toUpperCase() === statusFilter;
  }) || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, deliveryConfirmation }: { orderId: string; status: string; deliveryConfirmation?: string }) =>
      orderService.updateStatus(orderId, status, undefined, deliveryConfirmation, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipper", "deliveries"] });
      toast.success("Cập nhật trạng thái thành công");
    },
    onError: () => {
      toast.error("Không thể cập nhật trạng thái");
    },
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const columns = [
    {
      key: "id",
      header: "Mã đơn",
      render: (order: Order) => (
        <Link href={`/shipper/deliveries/${order.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
          #{order.id.slice(-8).toUpperCase()}
        </Link>
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
      render: (order: Order) => {
        const status = order.status.toUpperCase();
        return (
          <div className="flex gap-2">
            {status === "SHIPPING" && (
              <>
                {/* SHIPPER: Mobile-first - nút lớn, dễ thao tác */}
                <Link href={`/shipper/deliveries/${order.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full md:w-auto"
                    isLoading={updateStatusMutation.isPending}
                  >
                    Xác nhận giao hàng
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(order.id, "FAILED_DELIVERY")}
                  isLoading={updateStatusMutation.isPending}
                  className="w-full md:w-auto"
                >
                  Giao thất bại
                </Button>
              </>
            )}
            {status === "READY_TO_SHIP" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange(order.id, "SHIPPING")}
                isLoading={updateStatusMutation.isPending}
                className="w-full md:w-auto"
              >
                Bắt đầu giao hàng
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (!user?.branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Quản lý giao hàng"
          breadcrumbs={[{ label: "Dashboard", href: "/shipper" }, { label: "Giao hàng" }]}
        />
        <EmptyState
          title="Bạn chưa được gán cho chi nhánh nào"
          description="Vui lòng liên hệ quản lý chi nhánh"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Quản lý giao hàng"
        breadcrumbs={[
          { label: "Dashboard", href: "/shipper" },
          { label: "Giao hàng" },
        ]}
      />
      <main className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-6 md:p-8">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-secondary-500">Đơn hàng được phân công</p>
              <h2 className="mt-2 text-2xl font-semibold text-secondary-900 md:text-3xl">
                Theo dõi tiến độ giao hàng và cập nhật trạng thái theo tuyến
              </h2>
              <p className="mt-3 text-sm text-secondary-600 md:text-base">
                Ưu tiên đơn sẵn sàng giao, đảm bảo lộ trình an toàn và đúng hẹn.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={routes.shipper.history} className="inline-flex">
                <Button variant="outline" size="sm">Lịch sử giao hàng</Button>
              </Link>
              <Link href={routes.shipper.dashboard} className="inline-flex">
                <Button size="sm">Về dashboard</Button>
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-200/40 blur-3xl" />
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Sẵn sàng giao"
            value={isLoading ? "—" : readyToShipCount}
            icon={<FiClock className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Đang giao"
            value={isLoading ? "—" : shippingCount}
            icon={<FiTruck className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Đã giao"
            value={isLoading ? "—" : deliveredCount}
            icon={<FiCheckCircle className="h-6 w-6" />}
            className="bg-white/80"
          />
        </div>

        {/* SHIPPER: Mobile-first layout - tối giản, nút lớn, dễ thao tác */}
        <div className="space-y-4 md:space-y-6">
          {/* SHIPPER: Chỉ thấy đơn được gán - không search toàn hệ thống */}
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <p className="text-sm text-primary-700">
              📦 Chỉ hiển thị đơn hàng được phân công cho bạn ({filteredData.length} đơn)
            </p>
          </div>
          <DataTable
            columns={columns}
            data={filteredData}
            isLoading={isLoading}
            toolbar={
              <FilterBar
                filters={
                  <Select
                    options={[
                      { value: "all", label: "Tất cả trạng thái" },
                      { value: "READY_TO_SHIP", label: "Sẵn sàng giao" },
                      { value: "SHIPPING", label: "Đang giao" },
                      { value: "DELIVERED", label: "Đã giao" },
                      { value: "FAILED_DELIVERY", label: "Giao thất bại" },
                    ]}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-48"
                  />
                }
              />
            }
            emptyState={
              <EmptyState
                icon={<FiTruck className="w-16 h-16 text-stone-300" />}
                title="Chưa có đơn hàng nào được phân công"
                description="Đơn hàng được phân công sẽ hiển thị tại đây"
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
        </div>
      </main>
    </PageShell>
  );
}
