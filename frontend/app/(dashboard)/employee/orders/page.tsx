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
import { formatCurrency } from "@/lib/format";
import { FiBox, FiPackage, FiTruck } from "react-icons/fi";
import { toast } from "react-toastify";
import Link from "next/link";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    PENDING_CONFIRMATION: { label: "Chờ xác nhận", variant: "warning" },
    CONFIRMED: { label: "Đã xác nhận", variant: "success" },
    PACKING: { label: "Đang đóng gói", variant: "warning" },
    READY_TO_SHIP: { label: "Sẵn sàng giao", variant: "info" },
    SHIPPING: { label: "Đang giao", variant: "info" },
    DELIVERED: { label: "Đã giao", variant: "success" },
    COMPLETED: { label: "Hoàn tất", variant: "success" },
    CANCELLED: { label: "Đã hủy", variant: "danger" },
    FAILED_DELIVERY: { label: "Giao thất bại", variant: "danger" },
    RETURNING: { label: "Đang hoàn", variant: "warning" },
    RETURNED: { label: "Đã hoàn", variant: "info" },
    // Legacy
    OUT_FOR_DELIVERY: { label: "Đang giao", variant: "info" },
  };
  const normalized = status.toUpperCase();
  return statusMap[normalized] || { label: status, variant: "info" };
};

export default function EmployeeOrdersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("CONFIRMED");
  const limit = 10;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["employee", "orders", user?.branchId, page, statusFilter],
    queryFn: () => orderService.getOrders(page, limit, {
      ...(statusFilter !== "all" && { status: statusFilter }),
    }),
    enabled: !!user?.branchId,
  });

  const totalOrders = data?.total || 0;
  const pageOrders = data?.items || [];
  const confirmedCount = pageOrders.filter((order) => order.status.toUpperCase() === "CONFIRMED").length;
  const readyToShipCount = pageOrders.filter((order) => order.status.toUpperCase() === "READY_TO_SHIP").length;

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      orderService.updateStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "orders"] });
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
      render: (order: Order) => {
        if (!order || !order.id) return <span>N/A</span>;
        return (
          <Link href={`/employee/orders/${order.id}`} prefetch={false} className="font-mono text-xs text-emerald-600 hover:underline">
            #{order.id.slice(-8).toUpperCase()}
          </Link>
        );
      },
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
      key: "items",
      header: "Sản phẩm",
      render: (order: Order) => (
        <span className="text-sm">{order.items?.length || 0} sản phẩm</span>
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
            {status === "CONFIRMED" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange(order.id, "PACKING")}
                isLoading={updateStatusMutation.isPending}
              >
                Bắt đầu đóng gói
              </Button>
            )}
            {status === "PACKING" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange(order.id, "READY_TO_SHIP")}
                isLoading={updateStatusMutation.isPending}
              >
                Sẵn sàng giao
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
          title="Quản lý đơn hàng"
          breadcrumbs={[{ label: "Dashboard", href: "/employee" }, { label: "Đơn hàng" }]}
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
        title="Quản lý đơn hàng"
        breadcrumbs={[
          { label: "Dashboard", href: "/employee" },
          { label: "Đơn hàng" },
        ]}
      />
      <main className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-6 md:p-8">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-secondary-500">Xử lý đơn hàng</p>
              <h2 className="mt-2 text-2xl font-semibold text-secondary-900 md:text-3xl">
                Đóng gói và chuẩn bị đơn để giao cho shipper
              </h2>
              <p className="mt-3 text-sm text-secondary-600 md:text-base">
                Ưu tiên đơn đã xác nhận, cập nhật trạng thái kịp thời.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/employee/inventory" className="inline-flex">
                <Button size="sm" variant="outline">Kiểm tra kho</Button>
              </Link>
              <Link href="/employee/products" className="inline-flex">
                <Button size="sm">Danh sách sản phẩm</Button>
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-secondary-200/40 blur-3xl" />
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Tổng đơn hàng"
            value={isLoading ? "—" : totalOrders}
            icon={<FiBox className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Đã xác nhận"
            value={isLoading ? "—" : confirmedCount}
            icon={<FiPackage className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Sẵn sàng giao"
            value={isLoading ? "—" : readyToShipCount}
            icon={<FiTruck className="h-6 w-6" />}
            className="bg-white/80"
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.items || []}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              filters={
                <Select
                  options={[
                    { value: "CONFIRMED", label: "Đã xác nhận" },
                    { value: "PACKING", label: "Đang đóng gói" },
                    { value: "READY_TO_SHIP", label: "Sẵn sàng giao" },
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
              icon={<FiPackage className="w-16 h-16 text-stone-300" />}
              title="Chưa có đơn hàng nào"
              description="Đơn hàng của chi nhánh sẽ hiển thị tại đây"
            />
          }
          pagination={
            data
              ? {
                currentPage: page,
                totalPages: data.totalPages || 1,
                onPageChange: setPage,
              }
              : undefined
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải đơn hàng"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}
      </main>
    </PageShell>
  );
}

