"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletService } from "@/services/walletService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/dashboard/DataTable";
import { FiCreditCard, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import { formatCurrency } from "@/lib/format";
import { WalletTransaction } from "@/lib/types";

export default function AdminWalletsPage() {
  const queryClient = useQueryClient();

  const { data: pendingWithdrawals, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "wallets", "withdrawals", "pending"],
    queryFn: () => walletService.getPendingWithdrawals(),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      walletService.approveWithdraw(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      toast.success("Đã phê duyệt yêu cầu rút tiền");
    },
    onError: () => {
      toast.error("Không thể phê duyệt yêu cầu");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      walletService.rejectWithdraw(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
      toast.success("Đã từ chối yêu cầu rút tiền");
    },
    onError: () => {
      toast.error("Không thể từ chối yêu cầu");
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Quản lý ví" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Ví" }]} />
        <div className="text-center py-12 text-stone-500">Đang tải...</div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <PageHeader title="Quản lý ví" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Ví" }]} />
        <ErrorState title="Không thể tải dữ liệu" description="Vui lòng thử lại sau" action={{ label: "Thử lại", onClick: () => refetch() }} />
      </PageShell>
    );
  }

  const columns = [
    {
      key: "userId",
      header: "Người dùng",
      render: (item: WalletTransaction) => <span>{item.userId?.slice(-8) || "N/A"}</span>,
    },
    {
      key: "amount",
      header: "Số tiền",
      render: (item: WalletTransaction) => <span className="font-medium">{formatCurrency(item.amount)}</span>,
    },
    {
      key: "bankAccount",
      header: "Ngân hàng",
      render: (item: WalletTransaction) => (
        <div>
          <p className="text-sm">{item.bankName || "N/A"}</p>
          <p className="text-xs text-stone-500">{item.bankAccount || ""}</p>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày yêu cầu",
      render: (item: WalletTransaction) => (
        <span className="text-sm">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      key: "note",
      header: "Ghi chú",
      render: (item: WalletTransaction) => <span className="text-sm text-stone-600">{item.description || "-"}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item: WalletTransaction) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => approveMutation.mutate({ id: item.id })}
            isLoading={approveMutation.isPending}
          >
            <FiCheckCircle className="w-4 h-4 mr-1" />
            Duyệt
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rejectMutation.mutate({ id: item.id })}
            isLoading={rejectMutation.isPending}
          >
            <FiXCircle className="w-4 h-4 mr-1" />
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Quản lý ví"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Ví" },
        ]}
      />
      <main className="space-y-6">
        <Card variant="outline">
          <CardHeader>
            <CardTitle>Yêu cầu rút tiền đang chờ</CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingWithdrawals || pendingWithdrawals.length === 0 ? (
              <EmptyState
                icon={<FiCreditCard className="w-16 h-16 text-stone-300" />}
                title="Không có yêu cầu rút tiền nào"
                description="Tất cả yêu cầu đã được xử lý"
              />
            ) : (
              <DataTable columns={columns} data={pendingWithdrawals} />
            )}
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

