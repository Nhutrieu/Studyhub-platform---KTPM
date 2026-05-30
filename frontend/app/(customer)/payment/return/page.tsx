"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import Link from "next/link";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  const orderId = searchParams.get("orderId");
  const responseCode = searchParams.get("responseCode");
  const transactionStatus = searchParams.get("transactionStatus");
  const message = searchParams.get("message");

  // Determine payment status
  const isSuccess = responseCode === "00" && transactionStatus === "00";
  const isPending = responseCode === "00" && transactionStatus !== "00";
  const isFailed = responseCode !== "00" || transactionStatus !== "00";

  // Fetch order details if payment successful
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getOrder(orderId || ""),
    enabled: !!orderId && isSuccess,
  });

  // Fetch payment details
  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment", orderId],
    queryFn: () => paymentService.getPaymentByOrderId(orderId || ""),
    enabled: !!orderId,
  });

  useEffect(() => {
    // Simulate processing delay
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isProcessing) {
    return (
      <PageShell>
        <PageHeader title="Đang xử lý..." />
        <Card>
          <CardContent className="py-12 text-center">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Kết quả thanh toán"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Thanh toán" },
        ]}
      />
      <Card>
        <CardContent className="py-12">
          {isSuccess ? (
            <div className="text-center">
              <FiCheckCircle className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
                Thanh toán thành công!
              </h2>
              <p className="text-secondary-600 mb-6">
                Đơn hàng của bạn đã được thanh toán thành công. Chúng tôi sẽ xử lý và giao hàng sớm nhất.
              </p>

              {orderLoading ? (
                <div className="space-y-2 mb-6">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <Skeleton className="h-6 w-48 mx-auto" />
                </div>
              ) : order ? (
                <div className="mb-6 p-4 bg-secondary-50 rounded-lg">
                  <p className="text-sm text-secondary-500 mb-2">Mã đơn hàng</p>
                  <p className="text-lg font-mono font-semibold text-secondary-900">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  {payment && (
                    <>
                      <p className="text-sm text-secondary-500 mt-4 mb-2">Số tiền thanh toán</p>
                      <p className="text-xl font-semibold text-primary-600">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(order.totalPrice)}
                      </p>
                    </>
                  )}
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => router.push(`/orders/${orderId}`)}
                  disabled={!orderId}
                >
                  Xem đơn hàng
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/orders")}
                >
                  Danh sách đơn hàng
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/")}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <FiClock className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
                Đang xử lý thanh toán
              </h2>
              <p className="text-secondary-600 mb-6">
                Giao dịch của bạn đang được xử lý. Vui lòng đợi trong giây lát hoặc kiểm tra lại sau.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => router.push(`/orders/${orderId}`)}
                  disabled={!orderId}
                >
                  Kiểm tra đơn hàng
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/orders")}
                >
                  Danh sách đơn hàng
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <FiXCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
                Thanh toán thất bại
              </h2>
              <p className="text-secondary-600 mb-2">
                {message || "Giao dịch không thành công. Vui lòng thử lại."}
              </p>
              {responseCode && (
                <p className="text-sm text-secondary-500 mb-6">
                  Mã lỗi: {responseCode}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => router.push("/checkout")}
                >
                  Thử lại thanh toán
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/cart")}
                >
                  Về giỏ hàng
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/")}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <PageHeader title="Đang xử lý..." />
        <Card>
          <CardContent className="py-12 text-center">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </CardContent>
        </Card>
      </PageShell>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
}

