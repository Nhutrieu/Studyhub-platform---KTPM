"use client";

import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { FiUser, FiLogOut, FiBell } from "react-icons/fi";
import { useState } from "react";
import { getDashboardRoute } from "@/lib/auth/roles";

interface TopbarProps {
  notifications?: number;
}

export default function Topbar({ notifications }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const getDashboardLink = () => getDashboardRoute(user?.role);

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-secondary-200 w-full max-w-full overflow-x-hidden">
      <div className="px-6 py-4 flex items-center justify-between w-full max-w-full">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-medium text-secondary-900 tracking-tight lg:hidden">FurniMart</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          {notifications !== undefined && (
            <button className="relative p-2 text-secondary-600 hover:text-secondary-900 transition-colors duration-200">
              <FiBell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-error text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {notifications > 9 ? "9+" : notifications}
                </span>
              )}
            </button>
          )}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary-50 transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center">
                <FiUser className="w-4 h-4 text-secondary-700" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-secondary-900">
                  {user?.fullName || user?.name || "User"}
                </p>
                <p className="text-xs text-secondary-500">{user?.email}</p>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-medium border border-secondary-200 z-20">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        router.push(getDashboardLink());
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary-50 transition-colors duration-200 text-sm text-secondary-700"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        router.push("/account");
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary-50 transition-colors duration-200 text-sm text-secondary-700"
                    >
                      Tài khoản
                    </button>
                    <hr className="my-2 border-secondary-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-red-50 text-error transition-colors duration-200 text-sm flex items-center gap-2"
                    >
                      <FiLogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

