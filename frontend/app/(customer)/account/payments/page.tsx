"use client";

import { useQuery } from "@tanstack/react-query";
import { paymentService } from "@/services/paymentService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { FiCreditCard, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import { formatCurrency } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";
import { routes } from "@/lib/config/routes";
import { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";

export default function PaymentsPage() {
  const { data: payments, isLoading, isError, refetch } = useQuery({
    queryKey: ["payments", "my"],
    queryFn: () => paymentService.getMyPayments(),
  });

  const getStatusBadge = (status: PaymentStatus | string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="success">
            <FiCheckCircle className="w-3 h-3 mr-1 inline" />
            Đã thanh toán
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning">
            <FiClock className="w-3 h-3 mr-1 inline" />
            Đang chờ
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="danger">
            <FiXCircle className="w-3 h-3 mr-1 inline" />
            Thất bại
          </Badge>
        );
      case "refunded":
        return <Badge variant="info">Đã hoàn tiền</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getMethodLabel = (method: PaymentMethod | string) => {
    const methodStr = typeof method === 'string' ? method : PaymentMethod[method as keyof typeof PaymentMethod] || method;
    const labels: Record<string, string> = {
      COD: "Thanh toán khi nhận hàng",
      cod: "Thanh toán khi nhận hàng",
      WALLET: "Ví điện tử",
      wallet: "Ví điện tử",
      VNPAY: "VNPay",
      vnpay: "VNPay",
      MOMO: "MoMo",
      momo: "MoMo",
      ZALOPAY: "ZaloPay",
      zalopay: "ZaloPay",
      STRIPE: "Stripe",
      stripe: "Stripe",
    };
    return labels[methodStr] || methodStr;
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Lịch sử thanh toán" breadcrumbs={[{ label: "Tài khoản", href: "/account" }, { label: "Thanh toán" }]} />
        <div className="text-center py-12 text-secondary-500">Đang tải...</div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Lịch sử thanh toán" breadcrumbs={[{ label: "Tài khoản", href: "/account" }, { label: "Thanh toán" }]} />
        <ErrorState title="Không thể tải lịch sử thanh toán" description="Vui lòng thử lại sau" action={{ label: "Thử lại", onClick: () => refetch() }} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Lịch sử thanh toán"
        breadcrumbs={[
          { label: "Tài khoản", href: routes.customer.account },
          { label: "Thanh toán" },
        ]}
      />
      <main className="space-y-6 pb-12">
        {!payments || payments.length === 0 ? (
          <EmptyState
            icon={<FiCreditCard className="w-16 h-16 text-secondary-300" />}
            title="Chưa có thanh toán nào"
            description="Lịch sử thanh toán sẽ hiển thị tại đây"
          />
        ) : (
          <div className="space-y-4">
            {payments.map((payment: Payment) => (
              <Card key={payment.id} variant="outline">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Link href={routes.customer.orderDetail(payment.orderId)} className="text-primary-600 hover:text-primary-700 font-medium">
                          Đơn hàng #{payment.orderId.slice(-8).toUpperCase()}
                        </Link>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-secondary-500">Phương thức</p>
                          <p className="font-medium">{getMethodLabel(payment.method)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-secondary-500">Số tiền</p>
                          <p className="font-medium text-lg">{formatCurrency(payment.amount)}</p>
                        </div>
                      </div>
                      {payment.transactionId && (
                        <div className="mb-2">
                          <p className="text-sm text-secondary-500">Mã giao dịch</p>
                          <p className="text-sm font-mono">{payment.transactionId}</p>
                        </div>
                      )}
                      <p className="text-xs text-secondary-500">
                        {formatDistanceToNow(new Date(payment.createdAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

