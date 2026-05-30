/**
 * API Endpoints
 *
 * Centralized endpoint definitions.
 * All endpoints MUST be defined here.
 * Single source of truth for all API endpoints.
 */

// Get API base URL - ensure it ends with /api
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    if (envUrl.endsWith("/api")) {
      return envUrl;
    }
    if (envUrl.endsWith("/")) {
      return `${envUrl}api`;
    }
    return `${envUrl}/api`;
  }
  return "http://localhost:3001/api";
};

const API_BASE = getApiBaseUrl();

export const endpoints = {
  // Auth
  auth: {
    login: `${API_BASE}/auth/login`,
    register: `${API_BASE}/auth/register`,
    refresh: `${API_BASE}/auth/refresh`,
    logout: `${API_BASE}/auth/logout`,
    me: `${API_BASE}/auth/me`, // POST method
    forgotPassword: `${API_BASE}/auth/forgot-password`,
    resetPassword: `${API_BASE}/auth/reset-password`,
  },

  // Users
  users: {
    list: `${API_BASE}/users`,
    profile: `${API_BASE}/users/profile`,
    detail: (id: string) => `${API_BASE}/users/${id}`,
    update: (id: string) => `${API_BASE}/users/${id}`,
    delete: (id: string) => `${API_BASE}/users/${id}`,
    addresses: `${API_BASE}/users/addresses`,
    address: (addressId: string) => `${API_BASE}/users/addresses/${addressId}`,
    setDefaultAddress: (addressId: string) =>
      `${API_BASE}/users/addresses/${addressId}/set-default`,
  },

  // Products
  products: {
    list: `${API_BASE}/products`,
    featured: `${API_BASE}/products/featured`,
    search: `${API_BASE}/products/search`,
    detail: (id: string) => `${API_BASE}/products/${id}`,
    create: `${API_BASE}/products`,
    update: (id: string) => `${API_BASE}/products/${id}`,
    delete: (id: string) => `${API_BASE}/products/${id}`,
  },

  // Categories
  categories: {
    list: `${API_BASE}/categories`,
    byParent: (parentId?: string) =>
      `${API_BASE}/categories/by-parent${parentId ? `/${parentId}` : ""}`,
    bySlug: (slug: string) => `${API_BASE}/categories/slug/${slug}`,
    detail: (id: string) => `${API_BASE}/categories/${id}`,
    create: `${API_BASE}/categories`,
    update: (id: string) => `${API_BASE}/categories/${id}`,
    delete: (id: string) => `${API_BASE}/categories/${id}`,
  },

  // Cart
  cart: {
    get: `${API_BASE}/cart`,
    sync: `${API_BASE}/cart/sync`,
    add: `${API_BASE}/cart`, // POST
    update: (productId: string) => `${API_BASE}/cart/item/${productId}`, // PUT
    remove: (productId: string) => `${API_BASE}/cart/item/${productId}`, // DELETE
    clear: `${API_BASE}/cart`, // DELETE
  },

  // Orders
  orders: {
    create: `${API_BASE}/orders`,
    myOrders: `${API_BASE}/orders/my-orders`,
    forShipper: `${API_BASE}/orders/for-shipper`,
    list: `${API_BASE}/orders`,
    detail: (id: string) => `${API_BASE}/orders/${id}`,
    updateStatus: (id: string) => `${API_BASE}/orders/${id}/status`,
    updateItemQuantity: (id: string, productId: string) => `${API_BASE}/orders/${id}/items/${productId}/quantity`,
    assignShipper: (id: string) => `${API_BASE}/orders/${id}/assign-shipper`,
    assignEmployee: (id: string) => `${API_BASE}/orders/${id}/assign-employee`,
    cancel: (id: string) => `${API_BASE}/orders/${id}/cancel`,
    auditLogs: (id: string) => `${API_BASE}/orders/${id}/audit-logs`,
  },

  // Branches
  branches: {
    list: `${API_BASE}/branches`,
    active: `${API_BASE}/branches/active`,
    nearest: `${API_BASE}/branches/nearest`,
    nearestSingle: `${API_BASE}/branches/nearest/single`,
    myBranch: `${API_BASE}/branches/my-branch`,
    detail: (id: string) => `${API_BASE}/branches/${id}`,
    inventory: (id: string) => `${API_BASE}/branches/${id}/inventory`,
    create: `${API_BASE}/branches`,
    update: (id: string) => `${API_BASE}/branches/${id}`,
    approve: (id: string) => `${API_BASE}/branches/${id}/approve`,
    activate: (id: string) => `${API_BASE}/branches/${id}/activate`,
    deactivate: (id: string) => `${API_BASE}/branches/${id}/deactivate`,
    assignManager: (id: string) => `${API_BASE}/branches/${id}/assign-manager`,
    delete: (id: string) => `${API_BASE}/branches/${id}`,
  },

  // Shipping
  shipping: {
    byOrderId: (orderId: string) => `${API_BASE}/shipping/order/${orderId}`,
    updateStatus: (orderId: string) =>
      `${API_BASE}/shipping/order/${orderId}/update`,
    myDeliveries: `${API_BASE}/shipping/my-deliveries`,
    history: `${API_BASE}/shipping/history`,
  },

  // Payments
  payments: {
    create: `${API_BASE}/payments`,
    createVnpayUrl: `${API_BASE}/payments/create_payment_url`,
    ipn: `${API_BASE}/payments/ipn`,
    return: `${API_BASE}/payments/return`,
    myPayments: `${API_BASE}/payments/my-payments`,
    byOrderId: (orderId: string) => `${API_BASE}/payments/order/${orderId}`,
    detail: (id: string) => `${API_BASE}/payments/${id}`,
    updateStatus: (id: string) => `${API_BASE}/payments/${id}/status`,
    list: `${API_BASE}/payments`,
  },

  // Wallet
  wallet: {
    create: `${API_BASE}/wallet`,
    get: `${API_BASE}/wallet/my-wallet`,
    deposit: `${API_BASE}/wallet/deposit`,
    depositVnpay: `${API_BASE}/wallet/deposit/vnpay`,
    depositReturn: `${API_BASE}/wallet/deposit/return`,
    depositIpn: `${API_BASE}/wallet/deposit/ipn`,
    depositStatus: (transactionId: string) =>
      `${API_BASE}/wallet/deposit/status/${transactionId}`,
    withdraw: `${API_BASE}/wallet/withdraw`,
    escrowLock: `${API_BASE}/wallet/escrow/lock`,
    escrowRelease: `${API_BASE}/wallet/escrow/release`,
    escrowRefund: `${API_BASE}/wallet/escrow/refund`,
    transfer: `${API_BASE}/wallet/transfer`,
    transactions: `${API_BASE}/wallet/transactions`,
    transaction: (id: string) => `${API_BASE}/wallet/transactions/${id}`,
    transactionsByOrder: (orderId: string) =>
      `${API_BASE}/wallet/transactions/order/${orderId}`,
    updateTransactionStatus: (id: string) =>
      `${API_BASE}/wallet/transactions/${id}/status`,
    pendingWithdrawals: `${API_BASE}/wallet/withdrawals/pending`,
    approveWithdraw: (id: string) =>
      `${API_BASE}/wallet/withdrawals/${id}/approve`,
    rejectWithdraw: (id: string) =>
      `${API_BASE}/wallet/withdrawals/${id}/reject`,
    all: `${API_BASE}/wallet/all`,
  },

  // Dashboard
  dashboard: {
    stats: `${API_BASE}/dashboard/stats`,
    ordersStats: `${API_BASE}/dashboard/orders-stats`,
    ordersByStatus: `${API_BASE}/dashboard/orders-by-status`,
    revenueChart: `${API_BASE}/dashboard/revenue-chart`,
    topProducts: `${API_BASE}/dashboard/top-products`,
    categoryStats: `${API_BASE}/dashboard/category-stats`,
  },

  // Warehouse
  warehouse: {
    create: `${API_BASE}/warehouse`,
    list: `${API_BASE}/warehouse`,
    inventory: `${API_BASE}/warehouse/inventory`,
    lowStock: `${API_BASE}/warehouse/low-stock`,
    byProduct: (productId: string) =>
      `${API_BASE}/warehouse/product/${productId}`,
    detail: (id: string) => `${API_BASE}/warehouse/${id}`,
    addTransaction: (id: string) => `${API_BASE}/warehouse/${id}/transaction`,
    adjustStock: (id: string) => `${API_BASE}/warehouse/${id}/adjust`,
    reserveStock: (productId: string) =>
      `${API_BASE}/warehouse/reserve/${productId}`,
    releaseStock: (productId: string) =>
      `${API_BASE}/warehouse/release/${productId}`,
  },

  // Promotions
  promotions: {
    list: `${API_BASE}/promotions`,
    active: `${API_BASE}/promotions/active`,
    byCode: (code: string) => `${API_BASE}/promotions/code/${code}`,
    detail: (id: string) => `${API_BASE}/promotions/${id}`,
    create: `${API_BASE}/promotions`,
    update: (id: string) => `${API_BASE}/promotions/${id}`,
    delete: (id: string) => `${API_BASE}/promotions/${id}`,
    apply: `${API_BASE}/promotions/apply`,
  },

  // Reviews
  reviews: {
    create: `${API_BASE}/reviews`,
    byProduct: (productId: string) =>
      `${API_BASE}/reviews/product/${productId}`,
    myReviews: `${API_BASE}/reviews/my-reviews`,
    update: (id: string) => `${API_BASE}/reviews/${id}`,
    delete: (id: string) => `${API_BASE}/reviews/${id}`,
    unreviewedFromOrder: (orderId: string) => `${API_BASE}/reviews/order/${orderId}/unreviewed`,
  },

  // Disputes
  disputes: {
    list: `${API_BASE}/disputes`,
    myDisputes: `${API_BASE}/disputes/my-disputes`,
    byOrderId: (orderId: string) => `${API_BASE}/disputes/order/${orderId}`,
    stats: `${API_BASE}/disputes/stats`,
    detail: (id: string) => `${API_BASE}/disputes/${id}`,
    create: `${API_BASE}/disputes`,
    update: (id: string) => `${API_BASE}/disputes/${id}`,
  },

  // Upload
  upload: {
    image: `${API_BASE}/upload/image`,
    images: `${API_BASE}/upload/images`,
    file: `${API_BASE}/upload/file`,
    hero: `${API_BASE}/upload/hero`,
    category: `${API_BASE}/upload/category`,
    // Get image endpoint: /api/upload/:folder/:filename
    getImage: (folder: string, filename: string) =>
      `${API_BASE}/upload/${folder}/${filename}`,
  },

  // Chat
  chat: {
    create: `${API_BASE}/chat`,
    myChats: `${API_BASE}/chat/my-chats`,
    open: `${API_BASE}/chat/open`,
    detail: (chatId: string) => `${API_BASE}/chat/${chatId}`,
    sendMessage: (chatId: string) => `${API_BASE}/chat/${chatId}/message`,
    assign: (chatId: string) => `${API_BASE}/chat/${chatId}/assign`,
    updateStatus: (chatId: string) => `${API_BASE}/chat/${chatId}/status`,
    markAsRead: (chatId: string) => `${API_BASE}/chat/${chatId}/read`,
    delete: (chatId: string) => `${API_BASE}/chat/${chatId}`,
  },

  // Settings
  settings: {
    getGeneral: `${API_BASE}/settings/general`,
    updateGeneral: `${API_BASE}/settings/general`,
    getTheme: `${API_BASE}/settings/theme`,
    updateTheme: `${API_BASE}/settings/theme`,
    getHeader: `${API_BASE}/settings/header`,
    updateHeader: `${API_BASE}/settings/header`,
    getHero: `${API_BASE}/settings/hero`,
    updateHero: `${API_BASE}/settings/hero`,
  },
} as const;
