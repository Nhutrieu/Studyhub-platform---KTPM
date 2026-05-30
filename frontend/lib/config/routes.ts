/**
 * Route Configuration
 * 
 * Centralized route definitions.
 * All routes MUST be defined here.
 */

export const routes = {
  // Public routes
  home: "/",
  products: "/products",
  productDetail: (id: string) => `/products/${id}`,
  categories: "/categories",
  categoryDetail: (slug: string) => `/categories/${slug}`,
  branches: "/branches",
  branchDetail: (id: string) => `/branches/${id}`,
  promotions: "/promotions",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  policy: "/policy",

  // Auth routes
  auth: {
    login: "/auth/login",
    register: "/auth/register",
  },

  // Customer routes
  customer: {
    account: "/account",
    orders: "/orders",
    orderDetail: (id: string) => `/orders/${id}`,
    cart: "/cart",
    checkout: "/checkout",
    checkoutSuccess: "/checkout/success",
    addresses: "/account/addresses",
    payments: "/account/payments",
    wallet: "/account/wallet",
    walletDeposit: "/wallet/deposit",
    walletDepositReturn: "/wallet/deposit/return",
    reviews: "/account/reviews",
    disputes: "/account/disputes",
    chat: "/account/chat",
  },

  // Admin routes
  admin: {
    dashboard: "/admin",
    users: "/admin/users",
    products: "/admin/products",
    productDetail: (id: string) => `/admin/products/${id}`,
    categories: "/admin/categories",
    orders: "/admin/orders",
    orderDetail: (id: string) => `/admin/orders/${id}`,
    branches: "/admin/branches",
    promotions: "/admin/promotions",
    payments: "/admin/payments",
    wallets: "/admin/wallets",
    disputes: "/admin/disputes",
    chat: "/admin/chat",
    reports: "/admin/reports",
    settings: "/admin/settings",
  },

  // Branch Manager routes
  manager: {
    dashboard: "/manager",
    orders: "/manager/orders",
    inventory: "/manager/inventory",
    employees: "/manager/employees",
    shippers: "/manager/shippers",
    shipping: "/manager/shipping",
    reports: "/manager/reports",
    settings: "/manager/settings",
    chat: "/manager/chat",
  },

  // Employee routes
  employee: {
    dashboard: "/employee",
    orders: "/employee/orders",
    inventory: "/employee/inventory",
    products: "/employee/products",
    chat: "/employee/chat",
  },

  // Shipper routes
  shipper: {
    dashboard: "/shipper",
    deliveries: "/shipper/deliveries",
    deliveryDetail: (id: string) => `/shipper/deliveries/${id}`,
    history: "/shipper/history",
  },
} as const;

export type RouteKey = keyof typeof routes;

