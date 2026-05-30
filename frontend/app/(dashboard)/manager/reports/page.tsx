"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { dashboardService } from "@/services/dashboardService";
import { orderService } from "@/services/orderService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency } from "@/lib/format";
import { Order } from "@/lib/types";
import dynamic from "next/dynamic";
import Select from "@/components/ui/Select";

const RevenueChart = dynamic(() => import("@/components/dashboard/RevenueChart"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-64" />,
});

export default function ManagerReportsPage() {
  const { user } = useAuthStore();
  const branchId = user?.branchId;
  const [daysFilter, setDaysFilter] = useState("30");

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard", "branch", branchId],
    queryFn: () => dashboardService.getBranchStats(branchId || ""),
    enabled: !!branchId,
  });

  const { data: revenue, isLoading: revenueLoading, isError: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ["dashboard", "revenue", "branch", branchId, daysFilter],
    queryFn: () => dashboardService.getRevenueChart(parseInt(daysFilter)),
    enabled: !!branchId,
  });

  const { data: orders } = useQuery({
    queryKey: ["manager", "orders", "reports", branchId],
    queryFn: () => orderService.getOrders(1, 100),
    enabled: !!branchId,
  });

  const ordersByStatus = {
    confirmed: orders?.items?.filter((o: Order) => o.status.toUpperCase() === "CONFIRMED").length || 0,
    packing: orders?.items?.filter((o: Order) => o.status.toUpperCase() === "PACKING").length || 0,
    shipping: orders?.items?.filter((o: Order) => o.status.toUpperCase() === "SHIPPING").length || 0,
    delivered: orders?.items?.filter((o: Order) => o.status.toUpperCase() === "DELIVERED").length || 0,
    cancelled: orders?.items?.filter((o: Order) => o.status.toUpperCase() === "CANCELLED").length || 0,
  };

  if (!branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Báo cáo & Phân tích"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Báo cáo" }]}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-stone-500">
              <p className="text-lg font-medium mb-2">Bạn chưa được gán cho chi nhánh nào</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên để được gán chi nhánh.</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Báo cáo & Phân tích"
        breadcrumbs={[
          { label: "Dashboard", href: "/manager" },
          { label: "Báo cáo" },
        ]}
      />
      <main className="space-y-6">
        {/* Stats Cards */}
        {statsError ? (
          <ErrorState
            title="Không thể tải thống kê"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetchStats() }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-500">
                  Tổng đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-500">
                  Doanh thu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-stone-500">
                  Đơn chờ xử lý
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold text-amber-600">
                    {stats?.pendingOrders || 0}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Revenue Chart */}
        {revenueError ? (
          <ErrorState
            title="Không thể tải biểu đồ doanh thu"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetchRevenue() }}
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Doanh thu theo thời gian</CardTitle>
                <Select
                  options={[
                    { value: "7", label: "7 ngày" },
                    { value: "30", label: "30 ngày" },
                    { value: "90", label: "90 ngày" },
                  ]}
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(e.target.value)}
                  className="w-32"
                />
              </div>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="w-full h-64" />
              ) : (
                <RevenueChart data={revenue || []} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng theo trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{ordersByStatus.confirmed}</p>
                <p className="text-sm text-stone-600 mt-1">Đã xác nhận</p>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{ordersByStatus.packing}</p>
                <p className="text-sm text-stone-600 mt-1">Đang đóng gói</p>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{ordersByStatus.shipping}</p>
                <p className="text-sm text-stone-600 mt-1">Đang giao</p>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{ordersByStatus.delivered}</p>
                <p className="text-sm text-stone-600 mt-1">Đã giao</p>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{ordersByStatus.cancelled}</p>
                <p className="text-sm text-stone-600 mt-1">Đã hủy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

