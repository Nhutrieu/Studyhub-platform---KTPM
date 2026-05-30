"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/orderService";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import PageHeader from "@/components/layouts/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Order } from "@/lib/types";
import Link from "next/link";
import { formatCurrency, formatShippingAddress } from "@/lib/format";
import { routes } from "@/lib/config/routes";
import StatCard from "@/components/dashboard/StatCard";
import Button from "@/components/ui/Button";
import { FiCheckCircle, FiClock, FiTruck } from "react-icons/fi";

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "READY_TO_SHIP":
      return "bg-info/10 text-info";
    case "SHIPPING":
      return "bg-info/10 text-info";
    case "DELIVERED":
      return "bg-success/10 text-success";
    case "FAILED_DELIVERY":
      return "bg-danger/10 text-danger";
    default:
      return "bg-secondary-100 text-secondary-700";
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toUpperCase()) {
    case "READY_TO_SHIP":
      return "Sẵn sàng giao";
    case "SHIPPING":
      return "Đang giao";
    case "DELIVERED":
      return "Đã giao";
    case "FAILED_DELIVERY":
      return "Giao thất bại";
    default:
      return status;
  }
};

export default function ShipperDashboard() {
  const { user } = useAuthStore();
  const branchId = user?.branchId;

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", "shipper", branchId],
    queryFn: () => orderService.getOrdersForShipper(),
    enabled: !!branchId,
  });

  const readyToShipCount = orders?.filter((o: Order) => o.status.toUpperCase() === "READY_TO_SHIP").length || 0;
  const shippingCount = orders?.filter((o: Order) => o.status.toUpperCase() === "SHIPPING").length || 0;
  const deliveredCount = orders?.filter((o: Order) => o.status.toUpperCase() === "DELIVERED").length || 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Giao hàng"
        breadcrumbs={[{ label: "Dashboard" }]}
      />
      <div className="space-y-6">
        {!branchId ? (
          <Card className="border-secondary-100">
            <CardContent className="py-8">
              <div className="text-center text-stone-600">
                Bạn chưa được gán cho chi nhánh nào. Vui lòng liên hệ quản trị viên.
              </div>
            </CardContent>
          </Card>
        ) : isError ? (
          <ErrorState
            title="Không thể tải dữ liệu"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-6 md:p-8">
              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-secondary-500">Tuyến giao hôm nay</p>
                  <h2 className="mt-2 text-2xl font-semibold text-secondary-900 md:text-3xl">
                    Ưu tiên các đơn sẵn sàng giao và cập nhật trạng thái kịp thời
                  </h2>
                  <p className="mt-3 text-sm text-secondary-600 md:text-base">
                    Danh sách đơn được phân công sẽ được cập nhật theo thời gian thực.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={routes.shipper.deliveries}>
                    <Button size="sm">Đơn đang giao</Button>
                  </Link>
                  <Link href={routes.shipper.history}>
                    <Button size="sm" variant="outline">Lịch sử giao</Button>
                  </Link>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary-200/40 blur-3xl" />
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatCard
                title="Đơn sẵn sàng giao"
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

            <Card className="border-secondary-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Đơn hàng được phân công</CardTitle>
                    <p className="text-sm text-secondary-500 mt-1">
                      Theo dõi tiến độ giao hàng và cập nhật trạng thái theo tuyến.
                    </p>
                  </div>
                  <Link
                    href={routes.shipper.deliveries}
                    className="text-sm text-secondary-900 hover:text-secondary-700 font-medium transition-colors duration-200"
                  >
                    Xem tất cả →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : !orders || orders.length === 0 ? (
                  <EmptyState
                    title="Chưa có đơn hàng nào được phân công"
                    description="Đơn hàng được phân công sẽ hiển thị tại đây"
                  />
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order: Order) => (
                      <Link
                        key={order.id}
                        href={routes.shipper.deliveryDetail(order.id)}
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
                              {typeof order.shippingAddress === 'string'
                                ? order.shippingAddress
                                : formatShippingAddress(order.shippingAddress)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-secondary-900">
                              {formatCurrency(order.totalPrice || order.totalAmount || 0)}
                            </p>
                            <p className="text-xs text-secondary-500 mt-1">
                              {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
