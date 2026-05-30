"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/orderService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { FiCheckCircle, FiPackage, FiShoppingBag } from "react-icons/fi";
import Link from "next/link";
import { routes } from "@/lib/config/routes";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getOrder(orderId || ""),
    enabled: !!orderId,
  });

  if (!orderId) {
    return (
      <PageShell>
        <PageHeader title="Đặt hàng thành công" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-secondary-600 mb-4">Không tìm thấy thông tin đơn hàng</p>
            <Link href={routes.customer.orders}>
              <Button variant="primary">Xem đơn hàng của tôi</Button>
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Đặt hàng thành công" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <PageHeader title="Đặt hàng thành công" />
        <ErrorState
          title="Không tìm thấy đơn hàng"
          description="Vui lòng kiểm tra lại"
          action={{ label: "Xem đơn hàng", onClick: () => router.push(routes.customer.orders) }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Đặt hàng thành công" />
      <main className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="w-12 h-12 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              Cảm ơn bạn đã đặt hàng!
            </h1>
            <p className="text-secondary-600 mb-8">
              Đơn hàng #{order.id.slice(-8).toUpperCase()} của bạn đã được tiếp nhận và đang được xử lý.
            </p>

            <div className="bg-secondary-50 rounded-lg p-6 mb-8 text-left">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiPackage className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-secondary-500">Mã đơn hàng</p>
                    <p className="font-semibold font-mono">{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FiShoppingBag className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-secondary-500">Tổng tiền</p>
                    <p className="font-semibold text-primary-600">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(order.totalPrice || order.totalAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={routes.customer.orderDetail(order.id)}>
                <Button variant="primary" className="flex items-center gap-2">
                  Xem chi tiết đơn hàng
                  <span>→</span>
                </Button>
              </Link>
              <Link href={routes.products}>
                <Button variant="outline">
                  Tiếp tục mua sắm
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <PageHeader title="Đặt hàng thành công" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

