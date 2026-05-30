"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { walletService } from "@/services/walletService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import { formatCurrency } from "@/lib/format";

function WalletDepositReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  const transactionId = searchParams.get("transactionId");
  const status = searchParams.get("status"); // success, failed, error
  const code = searchParams.get("code"); // Error code
  const message = searchParams.get("message"); // Error message

  // Determine payment status
  const isSuccess = status === "success";
  const isPending = false; // Wallet deposit doesn't have pending state in return URL
  const isFailed = status === "failed" || status === "error";

  // Fetch transaction details if payment successful
  const { data: transaction, isLoading: transactionLoading } = useQuery({
    queryKey: ["wallet-transaction", transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      const transactions = await walletService.getTransactions();
      return transactions.find((t) => t.id === transactionId || t._id === transactionId) || null;
    },
    enabled: !!transactionId && isSuccess,
  });

  // Fetch wallet to show updated balance
  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet(),
    enabled: isSuccess,
  });

  useEffect(() => {
    // Simulate processing delay
    const timer = setTimeout(() => {
      setIsProcessing(false);
      if (isSuccess && transactionId) {
        // Refetch wallet to show updated balance
        refetchWallet();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, transactionId, refetchWallet]);

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
        title="Kết quả nạp tiền"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Ví của tôi", href: "/account/wallet" },
          { label: "Nạp tiền" },
        ]}
      />
      <Card>
        <CardContent className="py-12">
          {isSuccess ? (
            <div className="text-center">
              <FiCheckCircle className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
                Nạp tiền thành công!
              </h2>
              <p className="text-secondary-600 mb-6">
                Số tiền đã được nạp vào ví của bạn thành công.
              </p>

              {transactionLoading ? (
                <div className="space-y-2 mb-6">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <Skeleton className="h-6 w-48 mx-auto" />
                </div>
              ) : transaction ? (
                <div className="mb-6 p-4 bg-secondary-50 rounded-lg">
                  <p className="text-sm text-secondary-500 mb-2">Số tiền nạp</p>
                  <p className="text-2xl font-semibold text-primary-600">
                    {formatCurrency(transaction.amount)}
                  </p>
                  {wallet && (
                    <>
                      <p className="text-sm text-secondary-500 mt-4 mb-2">Số dư hiện tại</p>
                      <p className="text-xl font-semibold text-secondary-900">
                        {formatCurrency(wallet.balance)}
                      </p>
                    </>
                  )}
                  {transactionId && (
                    <>
                      <p className="text-sm text-secondary-500 mt-4 mb-2">Mã giao dịch</p>
                      <p className="text-sm font-mono text-secondary-700">
                        {transactionId.slice(-8).toUpperCase()}
                      </p>
                    </>
                  )}
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => router.push("/account/wallet")}
                >
                  Về ví của tôi
                </Button>
                <Button
                  variant="outline"
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
                Đang xử lý nạp tiền
              </h2>
              <p className="text-secondary-600 mb-6">
                Giao dịch của bạn đang được xử lý. Vui lòng đợi trong giây lát hoặc kiểm tra lại sau.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => router.push("/account/wallet")}
                >
                  Kiểm tra ví
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <FiXCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
                Nạp tiền thất bại
              </h2>
              <p className="text-secondary-600 mb-2">
                {message || "Giao dịch không thành công. Vui lòng thử lại."}
              </p>
              {code && (
                <p className="text-sm text-secondary-500 mb-6">
                  Mã lỗi: {code}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={() => router.push("/account/wallet")}
                >
                  Thử lại nạp tiền
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/account/wallet")}
                >
                  Về ví của tôi
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

export default function WalletDepositReturnPage() {
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
      <WalletDepositReturnContent />
    </Suspense>
  );
}

