/**
 * Navigation Configuration
 * 
 * Menu items organized by role.
 * Used to generate navigation menus and breadcrumbs.
 */

import { routes } from "./routes";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  roles?: string[];
};

// Public navigation (no auth required)
export const publicNav: NavItem[] = [
  { label: "Trang chủ", href: routes.home },
  {
    label: "Sản phẩm",
    href: routes.products,
    children: [
      { label: "Tất cả sản phẩm", href: routes.products },
      { label: "Danh mục", href: routes.categories },
    ],
  },
  { label: "Chi nhánh", href: routes.branches },
  { label: "Khuyến mãi", href: routes.promotions },
  { label: "Về chúng tôi", href: routes.about },
];

// Customer navigation (authenticated customers)
export const customerNav: NavItem[] = [
  { label: "Trang chủ", href: routes.home },
  {
    label: "Sản phẩm",
    href: routes.products,
    children: [
      { label: "Tất cả sản phẩm", href: routes.products },
      { label: "Danh mục", href: routes.categories },
    ],
  },
  { label: "Chi nhánh", href: routes.branches },
  { label: "Khuyến mãi", href: routes.promotions },
  { label: "Đơn hàng", href: routes.customer.orders },
  { label: "Tài khoản", href: routes.customer.account },
];

// Admin navigation
export const adminNav: NavItem[] = [
  { label: "Dashboard", href: routes.admin.dashboard, icon: "FiLayout" },
  { label: "Người dùng", href: routes.admin.users, icon: "FiUsers" },
  { label: "Sản phẩm", href: routes.admin.products, icon: "FiPackage" },
  { label: "Danh mục", href: routes.admin.categories, icon: "FiFolder" },
  { label: "Đơn hàng", href: routes.admin.orders, icon: "FiShoppingBag" },
  { label: "Chi nhánh", href: routes.admin.branches, icon: "FiMapPin" },
  { label: "Khuyến mãi", href: routes.admin.promotions, icon: "FiTag" },
  { label: "Thanh toán", href: routes.admin.payments, icon: "FiCreditCard" },
  { label: "Ví", href: routes.admin.wallets, icon: "FiWallet" },
  { label: "Khiếu nại", href: routes.admin.disputes, icon: "FiAlertCircle" },
  { label: "Chat", href: routes.admin.chat, icon: "FiMessageCircle" },
  { label: "Báo cáo", href: routes.admin.reports, icon: "FiBarChart" },
  { label: "Cài đặt", href: routes.admin.settings, icon: "FiSettings" },
];

// Branch Manager navigation
export const managerNav: NavItem[] = [
  { label: "Dashboard", href: routes.manager.dashboard, icon: "FiLayout" },
  { label: "Đơn hàng", href: routes.manager.orders, icon: "FiShoppingBag" },
  { label: "Kho hàng", href: routes.manager.inventory, icon: "FiPackage" },
  { label: "Nhân viên", href: routes.manager.employees, icon: "FiUsers" },
  { label: "Shipper", href: routes.manager.shippers, icon: "FiTruck" },
  { label: "Vận chuyển", href: routes.manager.shipping, icon: "FiTruck" },
  { label: "Báo cáo", href: routes.manager.reports, icon: "FiBarChart" },
  { label: "Chat", href: routes.manager.chat, icon: "FiMessageCircle" },
  { label: "Cài đặt", href: routes.manager.settings, icon: "FiSettings" },
];

// Employee navigation
export const employeeNav: NavItem[] = [
  { label: "Dashboard", href: routes.employee.dashboard, icon: "FiLayout" },
  { label: "Đơn hàng", href: routes.employee.orders, icon: "FiShoppingBag" },
  { label: "Kho hàng", href: routes.employee.inventory, icon: "FiPackage" },
  { label: "Sản phẩm", href: routes.employee.products, icon: "FiPackage" },
  { label: "Chat", href: routes.employee.chat, icon: "FiMessageCircle" },
];

// Shipper navigation
export const shipperNav: NavItem[] = [
  { label: "Dashboard", href: routes.shipper.dashboard, icon: "FiLayout" },
  { label: "Giao hàng", href: routes.shipper.deliveries, icon: "FiTruck" },
  { label: "Lịch sử", href: routes.shipper.history, icon: "FiClock" },
];

// Get navigation by role
export const getNavByRole = (role?: string): NavItem[] => {
  switch (role) {
    case "admin":
      return adminNav;
    case "branch_manager":
      return managerNav;
    case "employee":
      return employeeNav;
    case "shipper":
      return shipperNav;
    case "customer":
      return customerNav;
    default:
      return publicNav;
  }
};

// Generate breadcrumbs from route
export const generateBreadcrumbs = (pathname: string): Array<{ label: string; href: string }> => {
  const breadcrumbs: Array<{ label: string; href: string }> = [
    { label: "Trang chủ", href: routes.home },
  ];

  // Match pathname to routes
  if (pathname.startsWith("/admin")) {
    breadcrumbs.push({ label: "Quản trị", href: routes.admin.dashboard });
  } else if (pathname.startsWith("/manager")) {
    breadcrumbs.push({ label: "Quản lý", href: routes.manager.dashboard });
  } else if (pathname.startsWith("/employee")) {
    breadcrumbs.push({ label: "Nhân viên", href: routes.employee.dashboard });
  } else if (pathname.startsWith("/shipper")) {
    breadcrumbs.push({ label: "Shipper", href: routes.shipper.dashboard });
  }

  // Add specific page breadcrumb
  const allNavs = [...adminNav, ...managerNav, ...employeeNav, ...shipperNav, ...customerNav, ...publicNav];
  const navItem = allNavs.find((item) => item.href === pathname);
  if (navItem && navItem.href !== routes.home) {
    breadcrumbs.push({ label: navItem.label, href: navItem.href });
  }

  return breadcrumbs;
};

