"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import { branchService } from "@/services/branchService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { formatCurrency } from "@/lib/format";
import { Branch } from "@/lib/types";
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("@/components/dashboard/RevenueChart"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-64" />,
});

export default function AdminReportsPage() {
  const { data: revenue, isLoading: revenueLoading, isError: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ["dashboard", "revenue"],
    queryFn: () => dashboardService.getRevenueChart(30),
  });

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchService.getBranches(),
  });

  return (
    <PageShell>
      <PageHeader
        title="Báo cáo & Phân tích"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Báo cáo" },
        ]}
      />
      <main className="space-y-6">
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
              <CardTitle>Doanh thu 30 ngày qua</CardTitle>
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

        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất theo chi nhánh</CardTitle>
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
                {branches.map((branch: Branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200"
                  >
                    <div>
                      <h4 className="font-semibold text-stone-900">{branch.name}</h4>
                      <p className="text-sm text-stone-600">
                        {typeof branch.address === 'string' 
                          ? branch.address 
                          : `${branch.address?.street || ''}, ${branch.address?.ward || ''}, ${branch.address?.district || ''}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-500">Doanh thu</p>
                      <p className="font-semibold text-emerald-600">
                        {formatCurrency(branch.totalRevenue || 0)}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {branch.totalOrders || 0} đơn hàng
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

