"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { branchService } from "@/services/branchService";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/layouts/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency } from "@/lib/format";
import { Branch } from "@/lib/types";
import dynamic from "next/dynamic";
import Link from "next/link";
import { routes } from "@/lib/config/routes";
import StatCard from "@/components/dashboard/StatCard";
import { FiActivity, FiBox, FiDollarSign, FiMap, FiTrendingUp, FiUsers } from "react-icons/fi";

// Lazy load charts
const RevenueChart = dynamic(() => import("@/components/dashboard/RevenueChart"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-64" />,
});

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardService.getStats(),
  });

  const { data: revenue, isLoading: revenueLoading, isError: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ["dashboard", "revenue"],
    queryFn: () => dashboardService.getRevenueChart(30),
  });

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchService.getBranches(),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Quản trị"
        breadcrumbs={[{ label: "Dashboard" }]}
      />

      <section className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-6 md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-secondary-500">Tổng quan hệ thống</p>
            <h2 className="mt-2 text-2xl font-semibold text-secondary-900 md:text-3xl">
              Theo dõi tăng trưởng và vận hành theo thời gian thực
            </h2>
            <p className="mt-3 text-sm text-secondary-600 md:text-base">
              Cập nhật doanh thu, đơn hàng và sức khỏe chi nhánh ngay tại đây.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={routes.admin.reports} className="inline-flex">
              <span className="inline-flex items-center gap-2 rounded-xl bg-secondary-900 px-4 py-2 text-sm font-medium text-white shadow-soft">
                <FiTrendingUp className="h-4 w-4" />
                Xem báo cáo
              </span>
            </Link>
            <Link href={routes.admin.branches} className="inline-flex">
              <span className="inline-flex items-center gap-2 rounded-xl border border-secondary-200 bg-white px-4 py-2 text-sm font-medium text-secondary-700 shadow-sm">
                <FiMap className="h-4 w-4" />
                Quản lý chi nhánh
              </span>
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-secondary-200/40 blur-3xl" />
      </section>

      {/* Stats Cards */}
      {statsError ? (
        <ErrorState
          title="Không thể tải thống kê"
          description="Vui lòng thử lại sau"
          action={{ label: "Thử lại", onClick: () => refetchStats() }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tổng đơn hàng"
            value={statsLoading ? "—" : stats?.totalOrders || 0}
            icon={<FiActivity className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Tổng doanh thu"
            value={statsLoading ? "—" : formatCurrency(stats?.totalRevenue || 0)}
            icon={<FiDollarSign className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Tổng sản phẩm"
            value={statsLoading ? "—" : stats?.totalProducts || 0}
            icon={<FiBox className="h-6 w-6" />}
            className="bg-white/80"
          />
          <StatCard
            title="Tổng người dùng"
            value={statsLoading ? "—" : stats?.totalUsers || 0}
            icon={<FiUsers className="h-6 w-6" />}
            className="bg-white/80"
          />
        </div>
      )}

      {/* Revenue Chart */}
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {revenueError ? (
          <ErrorState
            title="Không thể tải biểu đồ doanh thu"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetchRevenue() }}
          />
        ) : (
          <Card className="border-secondary-100">
            <CardHeader>
              <CardTitle>Doanh thu theo thời gian</CardTitle>
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

        <Card className="border-secondary-100">
          <CardHeader>
            <CardTitle>Điểm nhấn hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-secondary-600">
            <div className="rounded-xl border border-secondary-100 bg-secondary-50 p-4">
              <p className="font-medium text-secondary-900">Hiệu suất vận hành</p>
              <p className="mt-1">Theo dõi tỷ lệ hoàn tất đơn và tốc độ xử lý của từng chi nhánh.</p>
            </div>
            <div className="rounded-xl border border-secondary-100 bg-secondary-50 p-4">
              <p className="font-medium text-secondary-900">Thông báo cần chú ý</p>
              <p className="mt-1">Xem danh sách chi nhánh có biến động doanh thu bất thường.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Reports */}
      <Card className="border-secondary-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Báo cáo theo chi nhánh</CardTitle>
              <p className="text-sm text-secondary-500 mt-1">Theo dõi doanh thu và số đơn hàng của các điểm bán.</p>
            </div>
            <Link
              href={routes.admin.branches}
              className="text-sm text-secondary-900 hover:text-secondary-700 font-medium transition-colors duration-200"
            >
              Xem tất cả →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {branchesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !branches || branches.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              Chưa có chi nhánh nào
            </div>
          ) : (
            <div className="space-y-4">
              {branches.slice(0, 5).map((branch: Branch) => (
                <div
                  key={branch.id}
                  className="flex flex-col gap-3 rounded-2xl border border-secondary-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FiMap className="text-secondary-400" />
                      <h4 className="font-medium text-secondary-900">{branch.name}</h4>
                    </div>
                    <p className="text-sm text-secondary-600 mt-1">
                      {typeof branch.address === 'string'
                        ? branch.address
                        : `${branch.address?.street || ''}, ${branch.address?.ward || ''}, ${branch.address?.district || ''}, ${branch.address?.city || ''}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-secondary-500">Doanh thu</p>
                    <p className="font-semibold text-secondary-900">
                      {formatCurrency(branch.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">
                      {branch.totalOrders || 0} đơn hàng
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
