"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/orderService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { FiEye, FiPackage } from "react-icons/fi";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { routes } from "@/lib/config/routes";

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
    NEW: { label: "Mới", variant: "info" },
    OUT_FOR_DELIVERY: { label: "Đang giao", variant: "info" },
    DELIVERY_FAILED: { label: "Giao thất bại", variant: "danger" },
  };
  const normalized = status.toUpperCase();
  return statusMap[normalized] || { label: status, variant: "info" };
};

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const limit = 10;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "orders", page, search, statusFilter],
    queryFn: () => orderService.getOrders(page, limit, {
      ...(search && { search }),
      ...(statusFilter !== "all" && { status: statusFilter }),
    }),
  });

  const columns = [
    {
      key: "id",
      header: "Mã đơn",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        return (
          <span className="font-mono text-xs">#{order.id.slice(-8).toUpperCase()}</span>
        );
      },
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        return (
          <div>
            <p className="font-medium text-secondary-900">{order.user?.fullName || order.user?.name || "N/A"}</p>
            <p className="text-xs text-secondary-500">{order.user?.email}</p>
          </div>
        );
      },
    },
    {
      key: "items",
      header: "Sản phẩm",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        return (
          <span className="text-sm">{order.items?.length || 0} sản phẩm</span>
        );
      },
    },
    {
      key: "total",
      header: "Tổng tiền",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        return (
          <span className="font-medium text-secondary-900">
            {formatCurrency(order.totalPrice || order.totalAmount || 0)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        const statusInfo = getStatusBadge(order.status);
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
    },
    {
      key: "branch",
      header: "Chi nhánh",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        return (
          <span className="text-sm">{order.branch?.name || "N/A"}</span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        return (
          <span className="text-sm text-secondary-600">
            {new Date(order.createdAt).toLocaleDateString("vi-VN")}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (item: Record<string, unknown>) => {
        const order = item as unknown as Order;
        if (!order || !order.id) return null;
        return (
          <Link href={routes.admin.orderDetail(order.id)} prefetch={false}>
            <Button variant="ghost" size="sm">
              <FiEye className="w-4 h-4" />
            </Button>
          </Link>
        );
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Quản lý đơn hàng"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Đơn hàng" },
        ]}
      />
      <main className="space-y-6">
        <DataTable
          columns={columns}
          data={(data?.items || []) as unknown as Record<string, unknown>[]}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Tìm kiếm đơn hàng...",
              }}
              filters={
                <Select
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "PENDING_CONFIRMATION", label: "Chờ xác nhận" },
                    { value: "CONFIRMED", label: "Đã xác nhận" },
                    { value: "PACKING", label: "Đang đóng gói" },
                    { value: "READY_TO_SHIP", label: "Sẵn sàng giao" },
                    { value: "SHIPPING", label: "Đang giao" },
                    { value: "DELIVERED", label: "Đã giao" },
                    { value: "COMPLETED", label: "Hoàn tất" },
                    { value: "CANCELLED", label: "Đã hủy" },
                    { value: "FAILED_DELIVERY", label: "Giao thất bại" },
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
              icon={<FiPackage className="w-16 h-16 text-secondary-300" />}
              title="Chưa có đơn hàng nào"
              description="Đơn hàng sẽ hiển thị tại đây khi có khách đặt"
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

