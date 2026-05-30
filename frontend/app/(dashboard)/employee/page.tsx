"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { orderService } from "@/services/orderService";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import PageHeader from "@/components/layouts/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { Order } from "@/lib/types";
import Link from "next/link";
import { formatCurrency, formatShippingAddress } from "@/lib/format";
import { routes } from "@/lib/config/routes";
import StatCard from "@/components/dashboard/StatCard";
import Button from "@/components/ui/Button";
import { FiCheckCircle, FiClipboard, FiPackage } from "react-icons/fi";

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "CONFIRMED":
      return "bg-success/10 text-success";
    case "PACKING":
      return "bg-warning/10 text-warning";
    case "OUT_FOR_DELIVERY":
      return "bg-info/10 text-info";
    case "DELIVERED":
      return "bg-success/10 text-success";
    default:
      return "bg-secondary-100 text-secondary-700";
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toUpperCase()) {
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PACKING":
      return "Đang đóng gói";
    case "OUT_FOR_DELIVERY":
      return "Đang giao";
    case "DELIVERED":
      return "Đã giao";
    default:
      return status;
  }
};

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const branchId = user?.branchId;

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", "employee", branchId],
    queryFn: () => orderService.getOrders(1, 10, { status: "CONFIRMED" }),
    enabled: !!branchId,
  });

  const confirmedCount = orders?.items?.filter((o: Order) => o.status === "CONFIRMED" || o.status === "confirmed").length || 0;
  const packingCount = orders?.items?.filter((o: Order) => o.status === "PACKING").length || 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Nhân viên"
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
        ) : (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-secondary-100 bg-gradient-to-br from-secondary-50 via-white to-primary-50 p-6 md:p-8">
              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm text-secondary-500">Ca làm việc hôm nay</p>
                  <h2 className="mt-2 text-2xl font-semibold text-secondary-900 md:text-3xl">
                    Sẵn sàng xử lý đơn và chuẩn bị hàng hóa
                  </h2>
                  <p className="mt-3 text-sm text-secondary-600 md:text-base">
                    Theo dõi các đơn chờ xác nhận và đóng gói để đảm bảo tiến độ giao hàng.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={routes.employee.orders}>
                    <Button size="sm">Danh sách đơn</Button>
                  </Link>
                  <Link href={routes.employee.inventory}>
                    <Button size="sm" variant="outline">Kiểm tồn kho</Button>
                  </Link>
                  <Link href={routes.employee.chat}>
                    <Button size="sm" variant="ghost">Trao đổi nội bộ</Button>
                  </Link>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary-200/40 blur-3xl" />
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <StatCard
                title="Đơn chờ xác nhận"
                value={isLoading ? "—" : confirmedCount}
                icon={<FiCheckCircle className="h-6 w-6" />}
                className="bg-white/80"
              />
              <StatCard
                title="Đơn đang đóng gói"
                value={isLoading ? "—" : packingCount}
                icon={<FiPackage className="h-6 w-6" />}
                className="bg-white/80"
              />
              <StatCard
                title="Tổng đơn hàng"
                value={isLoading ? "—" : orders?.total || 0}
                icon={<FiClipboard className="h-6 w-6" />}
                className="bg-white/80"
              />
            </div>

            <Card className="border-secondary-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Đơn hàng gần đây</CardTitle>
                    <p className="text-sm text-secondary-500 mt-1">
                      Ưu tiên xử lý các đơn có trạng thái chờ xác nhận hoặc đóng gói.
                    </p>
                  </div>
                  <Link
                    href="/employee/orders"
                    className="text-sm text-secondary-900 hover:text-secondary-700 font-medium transition-colors duration-200"
                  >
                    Xem tất cả →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {isError ? (
                  <ErrorState
                    title="Không thể tải đơn hàng"
                    description="Vui lòng thử lại sau"
                    action={{ label: "Thử lại", onClick: () => refetch() }}
                  />
                ) : isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : !orders?.items || orders.items.length === 0 ? (
                  <div className="text-center py-8 text-stone-500">
                    Chưa có đơn hàng nào
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders?.items.filter((order: Order) => order && order.id).slice(0, 5).map((order: Order) => (
                      <Link
                        key={order.id}
                        href={`/employee/orders/${order.id}`}
                        prefetch={false}
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
                              {formatShippingAddress(order.shippingAddress)}
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
