/**
 * Layout Configuration
 * 
 * Centralized configuration for all layouts, menus, and navigation.
 * Ensures consistency across the entire application.
 */

import {
  FiLayout,
  FiPackage,
  FiShoppingCart,
  FiUsers,
  FiSettings,
  FiTruck,
  FiBox,
  FiBarChart,
  FiFileText,
  FiTag,
  FiMessageSquare,
  FiAlertCircle,
  FiCreditCard,
  FiHome,
  FiMapPin,
  FiGift,
  FiInfo,
  FiShoppingBag,
  FiUser,
  FiList,
  FiDollarSign,
  FiArchive,
} from "react-icons/fi";
import { routes } from "@/lib/config/routes";

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  description?: string;
  roles?: string[]; // If specified, only show for these roles
}

/**
 * Dashboard Menu Configuration
 * Organized by functional groups for better UX
 */
export const dashboardMenuGroups: Record<string, MenuGroup[]> = {
  admin: [
    {
      id: "overview",
      label: "Tổng quan",
      items: [
        {
          id: "dashboard",
          href: routes.admin.dashboard,
          label: "Dashboard",
          icon: FiLayout,
          description: "Tổng quan hệ thống",
        },
      ],
    },
    {
      id: "products",
      label: "Sản phẩm",
      items: [
        {
          id: "products",
          href: routes.admin.products,
          label: "Sản phẩm",
          icon: FiPackage,
          description: "Quản lý sản phẩm",
        },
      ],
    },
    {
      id: "categories",
      label: "Danh mục",
      items: [
        {
          id: "categories",
          href: routes.admin.categories,
          label: "Danh mục",
          icon: FiTag,
          description: "Quản lý danh mục",
        },
      ],
    },
    {
      id: "promotions",
      label: "Khuyến mãi",
      items: [
        {
          id: "promotions",
          href: routes.admin.promotions,
          label: "Khuyến mãi",
          icon: FiGift,
          description: "Quản lý khuyến mãi",
        },
      ],
    },
    {
      id: "orders",
      label: "Đơn hàng",
      items: [
        {
          id: "orders",
          href: routes.admin.orders,
          label: "Đơn hàng",
          icon: FiShoppingCart,
          description: "Quản lý đơn hàng",
        },
      ],
    },
    {
      id: "payments",
      label: "Thanh toán",
      items: [
        {
          id: "payments",
          href: routes.admin.payments,
          label: "Thanh toán",
          icon: FiCreditCard,
          description: "Quản lý thanh toán",
        },
      ],
    },
    {
      id: "wallets",
      label: "Ví điện tử",
      items: [
        {
          id: "wallets",
          href: routes.admin.wallets,
          label: "Ví điện tử",
          icon: FiDollarSign,
          description: "Quản lý ví điện tử",
        },
      ],
    },
    {
      id: "users",
      label: "Người dùng",
      items: [
        {
          id: "users",
          href: routes.admin.users,
          label: "Người dùng",
          icon: FiUsers,
          description: "Quản lý người dùng",
        },
      ],
    },
    {
      id: "branches",
      label: "Chi nhánh",
      items: [
        {
          id: "branches",
          href: routes.admin.branches,
          label: "Chi nhánh",
          icon: FiBox,
          description: "Quản lý chi nhánh",
        },
      ],
    },
    {
      id: "disputes",
      label: "Khiếu nại",
      items: [
        {
          id: "disputes",
          href: routes.admin.disputes,
          label: "Khiếu nại",
          icon: FiAlertCircle,
          description: "Xử lý khiếu nại",
        },
      ],
    },
    {
      id: "chat",
      label: "Chat",
      items: [
        {
          id: "chat",
          href: routes.admin.chat,
          label: "Chat",
          icon: FiMessageSquare,
          description: "Hỗ trợ khách hàng",
        },
      ],
    },
    {
      id: "reports",
      label: "Báo cáo",
      items: [
        {
          id: "reports",
          href: routes.admin.reports,
          label: "Báo cáo",
          icon: FiBarChart,
          description: "Báo cáo & Thống kê",
        },
      ],
    },
    {
      id: "settings",
      label: "Cài đặt",
      items: [
        {
          id: "settings",
          href: routes.admin.settings,
          label: "Cài đặt hệ thống",
          icon: FiSettings,
          description: "Cấu hình hệ thống",
        },
      ],
    },
  ],
  branch_manager: [
    {
      id: "overview",
      label: "Tổng quan",
      items: [
        {
          id: "dashboard",
          href: "/manager",
          label: "Dashboard",
          icon: FiLayout,
          description: "Tổng quan chi nhánh",
        },
      ],
    },
    {
      id: "orders",
      label: "Đơn hàng",
      items: [
        {
          id: "orders",
          href: "/manager/orders",
          label: "Đơn hàng",
          icon: FiShoppingCart,
          description: "Quản lý đơn hàng",
        },
      ],
    },
    {
      id: "inventory",
      label: "Tồn kho",
      items: [
        {
          id: "inventory",
          href: "/manager/inventory",
          label: "Tồn kho",
          icon: FiArchive,
          description: "Quản lý tồn kho",
        },
      ],
    },
    {
      id: "shipping",
      label: "Giao hàng",
      items: [
        {
          id: "shipping",
          href: "/manager/shipping",
          label: "Giao hàng",
          icon: FiTruck,
          description: "Quản lý giao hàng",
        },
      ],
    },
    {
      id: "employees",
      label: "Nhân viên",
      items: [
        {
          id: "employees",
          href: "/manager/employees",
          label: "Nhân viên",
          icon: FiUsers,
          description: "Quản lý nhân viên",
        },
      ],
    },
    {
      id: "shippers",
      label: "Shipper",
      items: [
        {
          id: "shippers",
          href: "/manager/shippers",
          label: "Shipper",
          icon: FiTruck,
          description: "Quản lý shipper",
        },
      ],
    },
    {
      id: "chat",
      label: "Chat",
      items: [
        {
          id: "chat",
          href: "/manager/chat",
          label: "Chat",
          icon: FiMessageSquare,
          description: "Hỗ trợ khách hàng",
        },
      ],
    },
    {
      id: "reports",
      label: "Báo cáo",
      items: [
        {
          id: "reports",
          href: "/manager/reports",
          label: "Báo cáo",
          icon: FiBarChart,
          description: "Báo cáo chi nhánh",
        },
      ],
    },
    {
      id: "settings",
      label: "Cài đặt",
      items: [
        {
          id: "settings",
          href: "/manager/settings",
          label: "Cài đặt",
          icon: FiSettings,
          description: "Cấu hình chi nhánh",
        },
      ],
    },
  ],
  employee: [
    {
      id: "overview",
      label: "Tổng quan",
      items: [
        {
          id: "dashboard",
          href: "/employee",
          label: "Dashboard",
          icon: FiLayout,
          description: "Tổng quan công việc",
        },
      ],
    },
    {
      id: "products",
      label: "Sản phẩm",
      items: [
        {
          id: "products",
          href: "/employee/products",
          label: "Sản phẩm",
          icon: FiPackage,
          description: "Quản lý sản phẩm",
        },
      ],
    },
    {
      id: "orders",
      label: "Đơn hàng",
      items: [
        {
          id: "orders",
          href: "/employee/orders",
          label: "Đơn hàng",
          icon: FiShoppingCart,
          description: "Xử lý đơn hàng",
        },
      ],
    },
    {
      id: "inventory",
      label: "Tồn kho",
      items: [
        {
          id: "inventory",
          href: "/employee/inventory",
          label: "Tồn kho",
          icon: FiArchive,
          description: "Kiểm tra tồn kho",
        },
      ],
    },
    {
      id: "chat",
      label: "Chat",
      items: [
        {
          id: "chat",
          href: "/employee/chat",
          label: "Chat",
          icon: FiMessageSquare,
          description: "Hỗ trợ khách hàng",
        },
      ],
    },
  ],
  shipper: [
    {
      id: "overview",
      label: "Tổng quan",
      items: [
        {
          id: "dashboard",
          href: "/shipper",
          label: "Dashboard",
          icon: FiLayout,
          description: "Tổng quan giao hàng",
        },
      ],
    },
    {
      id: "deliveries",
      label: "Đơn giao hàng",
      items: [
        {
          id: "deliveries",
          href: "/shipper/deliveries",
          label: "Đơn giao hàng",
          icon: FiTruck,
          description: "Danh sách đơn giao",
        },
      ],
    },
    {
      id: "history",
      label: "Lịch sử",
      items: [
        {
          id: "history",
          href: "/shipper/history",
          label: "Lịch sử",
          icon: FiFileText,
          description: "Lịch sử giao hàng",
        },
      ],
    },
  ],
};

/**
 * Flatten menu groups to simple array for backward compatibility
 */
export const dashboardMenus: Record<string, MenuItem[]> = Object.entries(
  dashboardMenuGroups
).reduce((acc, [role, groups]) => {
  acc[role] = groups.flatMap((group) => group.items);
  return acc;
}, {} as Record<string, MenuItem[]>);

/**
 * Customer Navigation Menu
 */
export const customerMenus: MenuItem[] = [
  {
    id: "home",
    href: "/",
    label: "Trang chủ",
    icon: FiHome,
  },
  {
    id: "products",
    href: "/products",
    label: "Sản phẩm",
    icon: FiPackage,
  },
  {
    id: "categories",
    href: "/categories",
    label: "Danh mục",
    icon: FiList,
  },
  {
    id: "branches",
    href: "/branches",
    label: "Chi nhánh",
    icon: FiMapPin,
  },
  {
    id: "promotions",
    href: "/promotions",
    label: "Khuyến mãi",
    icon: FiGift,
  },
  {
    id: "orders",
    href: "/orders",
    label: "Đơn hàng",
    icon: FiShoppingBag,
    roles: ["customer"],
  },
  {
    id: "account",
    href: "/account",
    label: "Tài khoản",
    icon: FiUser,
    roles: ["customer"],
  },
  {
    id: "about",
    href: "/about",
    label: "Về chúng tôi",
    icon: FiInfo,
  },
];

/**
 * Layout Breakpoints
 */
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/**
 * Spacing Scale
 */
export const spacing = {
  xs: "0.5rem", // 8px
  sm: "0.75rem", // 12px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
} as const;

/**
 * Z-Index Scale
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

