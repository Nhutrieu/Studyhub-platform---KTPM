"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { orderService } from "@/services/orderService";
import { useAuthStore } from "@/store/authStore";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/layouts/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency } from "@/lib/format";
import { Order } from "@/lib/types";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { routes } from "@/lib/config/routes";
import StatCard from "@/components/dashboard/StatCard";
import { FiBox, FiClipboard, FiDollarSign } from "react-icons/fi";

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    PENDING_CONFIRMATION: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PACKING: "Đang đóng gói",
    READY_TO_SHIP: "Sẵn sàng giao",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    FAILED_DELIVERY: "Giao thất bại",
    // Legacy
    confirmed: "Đã xác nhận",
    packing: "Đang đóng gói",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
    OUT_FOR_DELIVERY: "Đang giao",
  };
  return statusMap[status] || status;
};

const getStatusColor = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "DELIVERED" || normalized === "COMPLETED") {
    return "bg-success/10 text-success";
  }
  if (normalized === "PENDING_CONFIRMATION" || normalized === "PACKING" || normalized === "READY_TO_SHIP" || normalized === "SHIPPING") {
    return "bg-warning/10 text-warning";
  }
  if (normalized === "CANCELLED" || normalized === "FAILED_DELIVERY") {
    return "bg-error/10 text-error";
  }
  return "bg-secondary-100 text-secondary-700";
};

export default function ManagerDashboard() {
  const { user } = useAuthStore();
  const branchId = user?.branchId;

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "branch", branchId],
    queryFn: () => dashboardService.getBranchStats(branchId || ""),
    enabled: !!branchId,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", "manager", branchId],
    queryFn: () => orderService.getOrders(1, 10),
    enabled: !!branchId,
  });

  if (!branchId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Quản lý chi nhánh"
          breadcrumbs={[{ label: "Dashboard" }]}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-stone-500">
              <p className="text-lg font-medium mb-2">Bạn chưa được gán cho chi nhánh nào</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên để được gán chi nhánh.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Quản lý chi nhánh"
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <section className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-gradient-to-br from-secondary-50 via-white to-primary-50 p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-secondary-500">Tổng quan chi nhánh</p>
            <h2 className="mt-2 text-2xl font-semibold text-secondary-900 md:text-3xl">
              Quản lý hiệu suất và vận hành hàng ngày
            </h2>
            <p className="mt-3 text-sm text-secondary-600 md:text-base">
              Theo dõi trạng thái đơn hàng, doanh thu và lịch phân công nhân sự trong ngày.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={routes.manager.orders}>
              <Button size="sm">Xử lý đơn hàng</Button>
            </Link>
            <Link href={routes.manager.inventory}>
              <Button size="sm" variant="outline">Kiểm kho</Button>
            </Link>
            <Link href={routes.manager.employees}>
              <Button size="sm" variant="ghost">Nhân sự</Button>
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary-200/40 blur-3xl" />
      </section>

      {/* Stats Cards */}
      {isError ? (
        <ErrorState
          title="Không thể tải thống kê"
          description="Vui lòng thử lại sau"
          action={{ label: "Thử lại", onClick: () => refetch() }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Tổng đơn hàng"
            value={isLoading ? "—" : stats?.totalOrders || 0}
            icon={<FiClipboard className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Doanh thu"
            value={isLoading ? "—" : formatCurrency(stats?.totalRevenue || 0)}
            icon={<FiDollarSign className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Đơn chờ xử lý"
            value={isLoading ? "—" : stats?.pendingOrders || 0}
            icon={<FiBox className="h-6 w-6" />}
            className="bg-white/80"
          />
        </div>
      )}

      {/* Recent Orders */}
      <Card className="border-secondary-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Đơn hàng gần đây</CardTitle>
              <p className="text-sm text-secondary-500 mt-1">
                Danh sách đơn hàng cần theo dõi và phân công xử lý nhanh.
              </p>
            </div>
            <Link href={routes.manager.orders}>
              <Button variant="ghost" size="sm">
                Xem tất cả →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !orders?.items || orders.items.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              Chưa có đơn hàng nào
            </div>
          ) : (
            <div className="space-y-4">
              {orders.items.slice(0, 5).map((order: Order) => (
                <Link
                  key={order.id}
                  href={`/manager/orders`}
                  className="block rounded-2xl border border-secondary-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-secondary-900">
                          Đơn hàng #{order.id.slice(-8).toUpperCase()}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-600 mt-1">
                        {order.user?.fullName || order.user?.name || "Khách hàng"} • {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-secondary-900">
                        {formatCurrency(order.totalPrice || order.totalAmount || 0)}
                      </p>
                      <p className="text-xs text-secondary-500 mt-1">
                        {order.items?.length || 0} sản phẩm
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
