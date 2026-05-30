import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";
import { Wallet, WalletTransaction } from "@/lib/types";

interface CreateWalletData {
  userId: string;
  currency?: string;
}

interface DepositData {
  amount: number;
  method?: string;
  description?: string;
}

interface WithdrawData {
  amount: number;
  bankAccount: string; // Backend requires bankAccount
  bankName: string; // Backend requires bankName
  accountHolderName: string; // Backend requires accountHolderName
  description?: string;
}

interface EscrowLockData {
  orderId: string;
  amount: number;
}

interface EscrowReleaseData {
  orderId: string;
  amount: number;
}

interface EscrowRefundData {
  orderId: string;
  amount: number;
  reason?: string;
}

interface TransferData {
  toUserId: string;
  amount: number;
  description?: string;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  orderId?: string;
  walletId?: string;
}

export const walletService = {
  create: async (data: CreateWalletData): Promise<Wallet> => {
    const response = await apiClient.post<Wallet>(endpoints.wallet.create, data);
    return response.data;
  },

  getWallet: async (): Promise<Wallet> => {
    const response = await apiClient.get<Wallet>(endpoints.wallet.get);
    return response.data;
  },

  deposit: async (data: DepositData): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.deposit, data);
    return response.data;
  },

  depositVnpay: async (data: DepositData): Promise<{ paymentUrl: string; transactionId: string }> => {
    const response = await apiClient.post<{ paymentUrl: string; transactionId: string }>(
      endpoints.wallet.depositVnpay,
      data
    );
    return response.data;
  },

  getDepositStatus: async (transactionId: string): Promise<{ status: string; transactionId: string }> => {
    const response = await apiClient.get<{ status: string; transactionId: string }>(
      endpoints.wallet.depositStatus(transactionId)
    );
    return response.data;
  },

  withdraw: async (data: WithdrawData): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.withdraw, data);
    return response.data;
  },

  escrowLock: async (data: EscrowLockData): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.escrowLock, data);
    return response.data;
  },

  escrowRelease: async (data: EscrowReleaseData): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.escrowRelease, data);
    return response.data;
  },

  escrowRefund: async (data: EscrowRefundData): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.escrowRefund, data);
    return response.data;
  },

  transfer: async (data: TransferData): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.transfer, data);
    return response.data;
  },

  getTransactions: async (filters?: TransactionFilters): Promise<WalletTransaction[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const url = params.toString() ? `${endpoints.wallet.transactions}?${params.toString()}` : endpoints.wallet.transactions;
    const response = await apiClient.get<WalletTransaction[]>(url);
    return response.data;
  },

  getTransaction: async (id: string): Promise<WalletTransaction> => {
    const response = await apiClient.get<WalletTransaction>(endpoints.wallet.transaction(id));
    return response.data;
  },

  getTransactionsByOrder: async (orderId: string): Promise<WalletTransaction[]> => {
    const response = await apiClient.get<WalletTransaction[]>(endpoints.wallet.transactionsByOrder(orderId));
    return response.data;
  },

  updateTransactionStatus: async (id: string, status: string): Promise<WalletTransaction> => {
    const response = await apiClient.put<WalletTransaction>(endpoints.wallet.updateTransactionStatus(id), { status });
    return response.data;
  },

  getPendingWithdrawals: async (): Promise<WalletTransaction[]> => {
    const response = await apiClient.get<WalletTransaction[]>(endpoints.wallet.pendingWithdrawals);
    return response.data;
  },

  approveWithdraw: async (id: string, adminNote?: string): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.approveWithdraw(id), { adminNote });
    return response.data;
  },

  rejectWithdraw: async (id: string, adminNote?: string): Promise<WalletTransaction> => {
    const response = await apiClient.post<WalletTransaction>(endpoints.wallet.rejectWithdraw(id), { adminNote });
    return response.data;
  },
};

