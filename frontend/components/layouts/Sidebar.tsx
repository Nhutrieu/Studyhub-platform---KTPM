"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { dashboardMenuGroups } from "@/lib/design-system/layout-config";
import { FiLogOut } from "react-icons/fi";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Sidebar
 * 
 * Enhanced dashboard sidebar navigation component with grouped menus.
 * Automatically shows menu items based on user role.
 * Collapses to drawer on mobile.
 */
export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, logout } = useAuthStore();

  const menuGroups = role ? dashboardMenuGroups[role] || [] : [];
  
  // Flatten all items from all groups into a single array
  const allMenuItems = menuGroups.flatMap((group) => group.items);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-40",
        "transform transition-transform duration-300",
        "flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-secondary-200 flex-shrink-0">
        <Link href="/" className="text-2xl font-semibold text-secondary-900 tracking-tight">
          FurniMart
        </Link>
        <p className="text-xs text-secondary-500 mt-1">Hệ thống quản lý</p>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1">
        {allMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200",
                "text-sm font-medium group",
                isActive
                  ? "bg-secondary-900 text-white shadow-sm"
                  : "text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900"
              )}
              title={item.description}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-secondary-500 group-hover:text-secondary-700"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "text-xs rounded-full px-2 py-0.5 font-medium",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-secondary-200 text-secondary-700"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-secondary-200 flex-shrink-0 space-y-2">
        <div className="px-4 py-2 text-xs text-secondary-500">
          <p className="font-medium text-secondary-700">
            {useAuthStore.getState().user?.name || "User"}
          </p>
          <p className="text-xs mt-0.5">{useAuthStore.getState().user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-md text-error hover:bg-red-50 w-full transition-colors duration-200 text-sm font-medium"
        >
          <FiLogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
