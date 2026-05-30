"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { formatCurrency } from "@/lib/format";
import { walletService } from "@/services/walletService";
import PageShell from "@/components/layouts/PageShell";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { FiDollarSign, FiPlus, FiArrowDownLeft, FiArrowUpRight, FiClock } from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";
import type { Wallet, WalletTransaction } from "@/lib/types";

export default function WalletPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [topUpModalOpen, setTopUpModalOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState<string>("");

    const { data: wallet, isLoading } = useQuery<Wallet>({
        queryKey: ["wallet", user?.id],
        queryFn: walletService.getWallet,
        enabled: !!user,
    });

    const { data: transactions } = useQuery<WalletTransaction[]>({
        queryKey: ["wallet-transactions", user?.id],
        queryFn: () => walletService.getTransactions(),
        enabled: !!user,
    });

    const topUpMutation = useMutation({
        mutationFn: (amount: number) => walletService.deposit({ amount, method: 'VNPAY' }),
        onSuccess: (data: WalletTransaction & { paymentUrl?: string }) => {
            // Handle payment URL redirect if provided
            if (data?.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                queryClient.invalidateQueries({ queryKey: ["wallet"] });
                queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
                toast.success("Nạp tiền thành công (Demo)");
                setTopUpModalOpen(false);
                setTopUpAmount("");
            }
        },
        onError: () => {
            toast.error("Không thể nạp tiền");
        }
    });

    const handleTopUp = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseInt(topUpAmount.replace(/[^0-9]/g, ""));
        if (!amount || amount < 10000) {
            toast.error("Số tiền tối thiểu là 10.000đ");
            return;
        }
        topUpMutation.mutate(amount);
    };

    return (
        <PageShell className="py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance Card */}
                <div className="lg:col-span-1">
                    <Card className="bg-gradient-to-br from-primary-900 to-primary-700 text-white border-none shadow-premium h-full">
                        <CardContent className="p-8 flex flex-col justify-between h-full min-h-[200px]">
                            <div>
                                <p className="text-white/90 font-semibold mb-2">Số dư hiện tại</p>
                                <h2 className="text-4xl font-bold tracking-tight text-white">
                                    {isLoading ? "..." : formatCurrency(wallet?.balance || 0)}
                                </h2>
                            </div>

                            <div className="pt-8">
                                <Button
                                    onClick={() => setTopUpModalOpen(true)}
                                    className="w-full bg-white text-primary-900 hover:bg-primary-50 border-none shadow-lg"
                                >
                                    <FiPlus className="mr-2" /> Nạp tiền
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Transactions */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Lịch sử giao dịch</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!transactions || transactions.length === 0 ? (
                                <EmptyState
                                    title="Chưa có giao dịch"
                                    description="Các giao dịch nạp tiền và thanh toán sẽ hiển thị tại đây"
                                    className="py-12"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 border border-secondary-100 rounded-lg hover:bg-secondary-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-success-100 text-success-600' :
                                                    tx.type === 'REFUND' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-secondary-100 text-secondary-600'
                                                    }`}>
                                                    {tx.type === 'DEPOSIT' && <FiArrowDownLeft />}
                                                    {tx.type === 'REFUND' && <FiArrowDownLeft />}
                                                    {tx.type === 'PAYMENT' && <FiArrowUpRight />}
                                                    {tx.type === 'WITHDRAW' && <FiArrowUpRight />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-secondary-900">
                                                        {tx.type === 'DEPOSIT' ? 'Nạp tiền vào ví' :
                                                            tx.type === 'PAYMENT' ? `Thanh toán đơn hàng #${tx.orderId?.slice(-6) || ''}` :
                                                                tx.type === 'REFUND' ? `Hoàn tiền đơn hàng #${tx.orderId?.slice(-6) || ''}` :
                                                                    tx.description || 'Giao dịch'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-secondary-500">
                                                        <FiClock className="w-3 h-3" />
                                                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${tx.type === 'DEPOSIT' || tx.type === 'REFUND'
                                                    ? 'text-success-600'
                                                    : 'text-secondary-900'
                                                    }`}>
                                                    {tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </p>
                                                <Badge variant={
                                                    tx.status === 'COMPLETED' ? 'success' :
                                                        tx.status === 'PENDING' ? 'warning' : 'danger'
                                                } className="text-[10px]">
                                                    {tx.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={topUpModalOpen}
                onClose={() => setTopUpModalOpen(false)}
                title="Nạp tiền vào ví"
            >
                <form onSubmit={handleTopUp} className="space-y-4">
                    <Input
                        label="Số tiền muốn nạp"
                        type="number"
                        placeholder="100,000"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        autoFocus
                    />
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[100000, 200000, 500000].map(amt => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => setTopUpAmount(amt.toString())}
                                className="py-2 px-4 border border-secondary-200 rounded-md hover:bg-secondary-50 text-sm font-medium"
                            >
                                {formatCurrency(amt)}
                            </button>
                        ))}
                    </div>
                    <Button type="submit" variant="primary" className="w-full" isLoading={topUpMutation.isPending}>
                        Xác nhận nạp tiền
                    </Button>
                </form>
            </Modal>
        </PageShell>
    );
}
