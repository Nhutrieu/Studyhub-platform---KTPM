"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletService } from "@/services/walletService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { toast } from "react-toastify";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { FiCreditCard, FiArrowDown, FiArrowUp, FiPlus, FiMinus } from "react-icons/fi";
import { WalletTransaction } from "@/lib/types";
import TabsControlled from "@/components/ui/TabsControlled";

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBankAccount, setWithdrawBankAccount] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [withdrawAccountHolderName, setWithdrawAccountHolderName] = useState("");

  const { data: wallet, isLoading: walletLoading, isError: walletError, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet(),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: () => walletService.getTransactions(),
  });

  const depositMutation = useMutation({
    mutationFn: (amount: number) => walletService.deposit({ amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      toast.success("Nạp tiền thành công");
      setIsDepositModalOpen(false);
      setDepositAmount("");
    },
    onError: () => {
      toast.error("Không thể nạp tiền");
    },
  });

  const depositVnpayMutation = useMutation({
    mutationFn: (amount: number) => walletService.depositVnpay({ amount }),
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: () => {
      toast.error("Không thể tạo link thanh toán");
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; bankAccount: string; bankName: string; accountHolderName: string }) =>
      walletService.withdraw({ 
        amount: data.amount, 
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      toast.success("Yêu cầu rút tiền đã được gửi. Vui lòng chờ xử lý");
      setIsWithdrawModalOpen(false);
      setWithdrawAmount("");
      setWithdrawBankAccount("");
      setWithdrawBankName("");
      setWithdrawAccountHolderName("");
    },
    onError: () => {
      toast.error("Không thể rút tiền");
    },
  });

  const handleDeposit = () => {
    const amount = Number(depositAmount);
    if (amount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    depositVnpayMutation.mutate(amount);
  };

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (amount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    if (wallet && amount > wallet.balance) {
      toast.error("Số dư không đủ");
      return;
    }
    if (!withdrawBankAccount || !withdrawBankAccount.trim()) {
      toast.error("Vui lòng nhập số tài khoản ngân hàng");
      return;
    }
    if (!withdrawBankName || !withdrawBankName.trim()) {
      toast.error("Vui lòng nhập tên ngân hàng");
      return;
    }
    if (!withdrawAccountHolderName || !withdrawAccountHolderName.trim()) {
      toast.error("Vui lòng nhập tên chủ tài khoản");
      return;
    }
    withdrawMutation.mutate({ 
      amount, 
      bankAccount: withdrawBankAccount.trim(),
      bankName: withdrawBankName.trim(),
      accountHolderName: withdrawAccountHolderName.trim(),
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: "Nạp tiền",
      WITHDRAW: "Rút tiền",
      PAYMENT: "Thanh toán",
      REFUND: "Hoàn tiền",
      ESCROW_LOCK: "Tạm giữ",
      ESCROW_RELEASE: "Giải phóng",
      ESCROW_REFUND: "Hoàn tiền",
      TRANSFER: "Chuyển khoản",
    };
    return labels[type] || type;
  };

  const getTransactionStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
      COMPLETED: { label: "Hoàn thành", variant: "success" },
      PENDING: { label: "Chờ xử lý", variant: "warning" },
      FAILED: { label: "Thất bại", variant: "danger" },
      CANCELLED: { label: "Đã hủy", variant: "default" },
    };
    const info = statusMap[status] || { label: status, variant: "default" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  if (walletLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Ví điện tử"
          breadcrumbs={[
            { label: "Trang chủ", href: "/" },
            { label: "Tài khoản", href: "/account" },
            { label: "Ví điện tử" },
          ]}
        />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (walletError || !wallet) {
    return (
      <PageShell>
        <PageHeader
          title="Ví điện tử"
          breadcrumbs={[
            { label: "Trang chủ", href: "/" },
            { label: "Tài khoản", href: "/account" },
            { label: "Ví điện tử" },
          ]}
        />
        <ErrorState
          title="Không thể tải thông tin ví"
          description="Vui lòng thử lại sau"
          action={{ label: "Thử lại", onClick: () => refetchWallet() }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Ví điện tử"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Tài khoản", href: "/account" },
          { label: "Ví điện tử" },
        ]}
      />
      <main className="space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 mb-2">Số dư hiện tại</p>
                <p className="text-4xl font-bold">{formatCurrency(wallet.balance)}</p>
                <p className="text-primary-100 mt-2 text-sm">
                  Đã tạm giữ: {formatCurrency(wallet.lockedBalance || 0)}
                </p>
              </div>
              <FiCreditCard className="w-16 h-16 text-primary-200 opacity-50" />
            </div>
            <div className="flex gap-4 mt-6">
              <Button
                variant="secondary"
                onClick={() => setIsDepositModalOpen(true)}
                className="flex-1"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Nạp tiền
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsWithdrawModalOpen(true)}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <FiMinus className="w-4 h-4 mr-2" />
                Rút tiền
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử giao dịch</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <EmptyState
                icon={<FiCreditCard className="w-16 h-16 text-secondary-300" />}
                title="Chưa có giao dịch nào"
                description="Các giao dịch của bạn sẽ hiển thị tại đây"
              />
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction: WalletTransaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          transaction.type === "deposit" || transaction.type === "refund" || transaction.type === "escrow_release"
                            ? "bg-primary-100 text-primary-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {transaction.type === "deposit" || transaction.type === "refund" || transaction.type === "escrow_release" ? (
                          <FiArrowDown className="w-6 h-6" />
                        ) : (
                          <FiArrowUp className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{getTransactionTypeLabel(transaction.type)}</p>
                        <p className="text-sm text-secondary-500">
                          {formatDateTime(transaction.createdAt)}
                        </p>
                        {transaction.description && (
                          <p className="text-sm text-secondary-600 mt-1">{transaction.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-lg ${
                          transaction.type === "deposit" || transaction.type === "refund" || transaction.type === "escrow_release"
                            ? "text-primary-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "deposit" || transaction.type === "refund" || transaction.type === "escrow_release" ? "+" : "-"}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      {getTransactionStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deposit Modal */}
        <Modal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false);
            setDepositAmount("");
          }}
          title="Nạp tiền vào ví"
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Số tiền (VND)"
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Nhập số tiền"
              min="10000"
            />
            <p className="text-sm text-secondary-500">
              Số tiền tối thiểu: 10,000 VND
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                onClick={handleDeposit}
                className="flex-1"
                isLoading={depositVnpayMutation.isPending}
              >
                Nạp tiền qua VNPAY
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDepositModalOpen(false);
                  setDepositAmount("");
                }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </Modal>

        {/* Withdraw Modal */}
        <Modal
          isOpen={isWithdrawModalOpen}
          onClose={() => {
            setIsWithdrawModalOpen(false);
            setWithdrawAmount("");
            setWithdrawBankAccount("");
          }}
          title="Rút tiền từ ví"
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Số tiền (VND)"
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Nhập số tiền"
              min="50000"
            />
            <Input
              label="Số tài khoản ngân hàng"
              type="text"
              value={withdrawBankAccount}
              onChange={(e) => setWithdrawBankAccount(e.target.value)}
              placeholder="Nhập số tài khoản"
              required
            />
            <Input
              label="Tên ngân hàng"
              type="text"
              value={withdrawBankName}
              onChange={(e) => setWithdrawBankName(e.target.value)}
              placeholder="VD: Vietcombank, Techcombank..."
              required
            />
            <Input
              label="Tên chủ tài khoản"
              type="text"
              value={withdrawAccountHolderName}
              onChange={(e) => setWithdrawAccountHolderName(e.target.value)}
              placeholder="Nhập tên chủ tài khoản"
              required
            />
            <p className="text-sm text-secondary-500">
              Số tiền tối thiểu: 50,000 VND. Yêu cầu rút tiền sẽ được xử lý trong 1-3 ngày làm việc.
            </p>
            {wallet && (
              <p className="text-sm font-medium">
                Số dư khả dụng: {formatCurrency(wallet.balance - (wallet.lockedBalance || 0))}
              </p>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                variant="primary"
                onClick={handleWithdraw}
                className="flex-1"
                isLoading={withdrawMutation.isPending}
              >
                Gửi yêu cầu
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawAmount("");
                  setWithdrawBankAccount("");
                  setWithdrawBankName("");
                  setWithdrawAccountHolderName("");
                }}
              >
                Hủy
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </PageShell>
  );
}

