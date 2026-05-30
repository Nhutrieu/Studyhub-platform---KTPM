"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentService } from "@/services/paymentService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/dashboard/DataTable";
import Input from "@/components/ui/Input";
import { FiCreditCard, FiSearch } from "react-icons/fi";
import { formatCurrency } from "@/lib/format";
import { Payment } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function AdminPaymentsPage() {
  const [filters, setFilters] = useState({
    status: "",
    method: "",
    orderId: "",
  });

  const { data: payments, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "payments", filters],
    queryFn: () => paymentService.getPayments(filters),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Đã thanh toán</Badge>;
      case "pending":
        return <Badge variant="warning">Đang chờ</Badge>;
      case "failed":
        return <Badge variant="danger">Thất bại</Badge>;
      case "refunded":
        return <Badge variant="info">Đã hoàn tiền</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      COD: "COD",
      WALLET: "Ví điện tử",
      VNPAY: "VNPay",
      MOMO: "MoMo",
      ZALOPAY: "ZaloPay",
      STRIPE: "Stripe",
    };
    return labels[method] || method;
  };

  const columns = [
    {
      key: "orderId",
      header: "Mã đơn hàng",
      render: (item: Payment) => <span className="font-mono text-sm">{item.orderId?.slice(-8) || "N/A"}</span>,
    },
    {
      key: "amount",
      header: "Số tiền",
      render: (item: Payment) => <span className="font-medium">{formatCurrency(item.amount)}</span>,
    },
    {
      key: "method",
      header: "Phương thức",
      render: (item: Payment) => <span>{getMethodLabel(item.method)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Payment) => getStatusBadge(item.status),
    },
    {
      key: "transactionId",
      header: "Mã giao dịch",
      render: (item: Payment) => (
        <span className="font-mono text-xs text-stone-500">{item.transactionId || "-"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (item: Payment) => (
        <span className="text-sm">
          {formatDistanceToNow(new Date(item.createdAt), {
            addSuffix: true,
            locale: vi,
          })}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Quản lý thanh toán" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Thanh toán" }]} />
        <div className="text-center py-12 text-stone-500">Đang tải...</div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Quản lý thanh toán" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Thanh toán" }]} />
        <ErrorState title="Không thể tải dữ liệu" description="Vui lòng thử lại sau" action={{ label: "Thử lại", onClick: () => refetch() }} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Quản lý thanh toán"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Thanh toán" },
        ]}
      />
      <main className="space-y-6">
        <Card variant="outline">
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Mã đơn hàng"
                value={filters.orderId}
                onChange={(e) => setFilters({ ...filters, orderId: e.target.value })}
                placeholder="Nhập mã đơn hàng"
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Đang chờ</option>
                <option value="paid">Đã thanh toán</option>
                <option value="failed">Thất bại</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
              <select
                value={filters.method}
                onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                className="px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Tất cả phương thức</option>
                <option value="COD">COD</option>
                <option value="WALLET">Ví điện tử</option>
                <option value="VNPAY">VNPay</option>
                <option value="MOMO">MoMo</option>
                <option value="ZALOPAY">ZaloPay</option>
                <option value="STRIPE">Stripe</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle>Danh sách thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            {!payments || payments.length === 0 ? (
              <EmptyState
                icon={<FiCreditCard className="w-16 h-16 text-stone-300" />}
                title="Không có thanh toán nào"
                description="Không tìm thấy thanh toán phù hợp"
              />
            ) : (
              <DataTable columns={columns} data={payments} />
            )}
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

