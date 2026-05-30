"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/orderService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { Order } from "@/lib/types";
import { formatCurrency, formatShippingAddress } from "@/lib/format";
import { FiFileText } from "react-icons/fi";
import Link from "next/link";
import { routes } from "@/lib/config/routes";

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    DELIVERED: { label: "Đã giao", variant: "success" },
    DELIVERY_FAILED: { label: "Giao thất bại", variant: "danger" },
    CANCELLED: { label: "Đã hủy", variant: "danger" },
  };
  const normalized = status.toUpperCase();
  return statusMap[normalized] || { label: status, variant: "info" };
};

export default function ShipperHistoryPage() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shipper", "history", user?.branchId],
    queryFn: () => orderService.getOrdersForShipper(),
    enabled: !!user?.branchId,
  });

  const historyData = data?.filter((order: Order) => {
    const status = order.status.toUpperCase();
    return status === "DELIVERED" || status === "DELIVERY_FAILED" || status === "CANCELLED";
  }) || [];

  const columns = [
    {
      key: "id",
      header: "Mã đơn",
      render: (order: Order) => (
        <Link href={routes.shipper.deliveryDetail(order.id)} className="font-mono text-xs text-emerald-600 hover:underline">
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
      key: "deliveredAt",
      header: "Ngày giao",
      render: (order: Order) => (
        <span className="text-sm text-stone-600">
          {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString("vi-VN") : "N/A"}
        </span>
      ),
    },
  ];

  if (!user?.branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Lịch sử giao hàng"
          breadcrumbs={[{ label: "Dashboard", href: "/shipper" }, { label: "Lịch sử" }]}
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
        title="Lịch sử giao hàng"
        breadcrumbs={[
          { label: "Dashboard", href: "/shipper" },
          { label: "Lịch sử" },
        ]}
      />
      <main className="space-y-6">
        <DataTable
          columns={columns}
          data={historyData}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<FiFileText className="w-16 h-16 text-stone-300" />}
              title="Chưa có lịch sử giao hàng"
              description="Lịch sử giao hàng sẽ hiển thị tại đây"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải lịch sử"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}
      </main>
    </PageShell>
  );
}

