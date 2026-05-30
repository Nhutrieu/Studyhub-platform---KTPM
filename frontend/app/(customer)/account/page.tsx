"use client";

import { useAuthStore } from "@/store/authStore";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { toast } from "react-toastify";
import Link from "next/link";
import type { AxiosError } from "axios";
import {
  FiEdit,
  FiMapPin,
  FiCreditCard,
  FiAlertCircle,
  FiMessageSquare,
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";
import { routes } from "@/lib/config/routes";

export default function AccountPage() {
  const { user, setUser, isAuthenticated, accessToken, role, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || "",
    phone: user?.phone || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => userService.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      setUser(updatedUser);
      toast.success("Cập nhật thông tin thành công");
      setIsEditing(false);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      console.error("Update profile error:", error);
      toast.error(
        error.response?.data?.message || "Không thể cập nhật thông tin"
      );
    },
  });

  // Wait for hydration before checking auth
  useEffect(() => {
    if (!_hasHydrated) {
      return; // Wait for state to be restored
    }
    
    if (!isAuthenticated || !accessToken || !user) {
      router.push("/auth/login?redirect=/account");
      return;
    }
    // Only allow customer role
    if (role && role !== "customer") {
      router.push("/");
      return;
    }
  }, [_hasHydrated, isAuthenticated, accessToken, user, role, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user?.fullName || user?.name || "",
        phone: user?.phone || "",
      });
    }
  }, [user]);

  // Don't render if not hydrated or not authenticated
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken || !user || role !== "customer") {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const quickActions = [
    {
      title: "Địa chỉ giao hàng",
      description: "Quản lý địa chỉ nhận hàng",
      href: routes.customer.addresses,
      icon: FiMapPin,
      cta: "Quản lý địa chỉ",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Đánh giá",
      description: "Theo dõi đánh giá của bạn",
      href: routes.customer.reviews,
      icon: FiEdit,
      cta: "Xem đánh giá",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Hỗ trợ trực tuyến",
      description: "Chat với nhân viên hỗ trợ",
      href: routes.customer.chat,
      icon: FiMessageSquare,
      cta: "Mở chat",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Thanh toán",
      description: "Xem lịch sử thanh toán",
      href: routes.customer.payments,
      icon: FiCreditCard,
      cta: "Xem thanh toán",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Yêu cầu hỗ trợ",
      description: "Đổi trả, bảo hành, lắp ráp",
      href: routes.customer.disputes,
      icon: FiAlertCircle,
      cta: "Tạo yêu cầu",
      color: "from-red-500 to-red-600",
    },
  ];

  const userInitial = (user.fullName || user.name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-secondary-50 border-b border-secondary-200">
        <PageShell className="pt-8 md:pt-12 pb-12">
      <PageHeader
        title="Tài khoản"
            description="Quản lý thông tin cá nhân, địa chỉ giao hàng và các tiện ích khác"
        breadcrumbs={[
          { label: "Trang chủ", href: routes.home },
          { label: "Tài khoản" },
        ]}
            className="mb-8"
          />
          
          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl border-2 border-secondary-200 shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 px-8 py-8 text-white`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {userInitial}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
                    <FiShield className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/80 mb-1 font-medium">Trung tâm tài khoản</p>
                  <h2 className="text-3xl font-bold mb-2">
              Xin chào, {user.fullName || user.name}
            </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FiMail className="w-4 h-4 text-white/80" />
                      <span className="text-white/90">{user.email}</span>
          </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <FiPhone className="w-4 h-4 text-white/80" />
                        <span className="text-white/90">{user.phone}</span>
                </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-white/80" />
                      <span className="text-white/90 capitalize">{user.role}</span>
                    </div>
                </div>
              </div>
              <Button
                variant="outline"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                    setFormData({
                      fullName: user?.fullName || user?.name || "",
                      phone: user?.phone || "",
                    });
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                <FiEdit className="w-4 h-4 mr-2" />
                  {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa"}
              </Button>
            </div>
            </div>
          </div>
        </PageShell>
      </div>

      {/* Main Content */}
      <PageShell className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-8">
          {/* Profile Information Card */}
          <div className="bg-white rounded-2xl border-2 border-secondary-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-secondary-50 to-primary-50 p-6 border-b border-secondary-200">
              <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                  <FiUser className="w-6 h-6 text-white" />
                </div>
                Thông tin cá nhân
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 mb-2">
                      Họ và tên
                    </label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    required
                      className="w-full"
                  />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-secondary-700 mb-2">
                      Số điện thoại
                    </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                      className="w-full"
                  />
                  </div>
                  <div className="pt-4 border-t border-secondary-100">
                    <div className="flex gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={updateProfileMutation.isPending}
                      className="flex-1"
                    >
                        Lưu thay đổi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          fullName: user?.fullName || user?.name || "",
                          phone: user?.phone || "",
                        });
                      }}
                        className="flex-1"
                    >
                      Hủy
                    </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                      Họ và tên
                    </p>
                    <p className="text-lg font-bold text-secondary-900">
                      {user.fullName || user.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-lg font-bold text-secondary-900">
                      {user.email}
                    </p>
                  </div>
                  {user.phone && (
                    <div>
                      <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                        Số điện thoại
                      </p>
                      <p className="text-lg font-bold text-secondary-900">
                        {user.phone}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-secondary-600 mb-2 uppercase tracking-wide">
                      Vai trò
                    </p>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-primary-100 text-primary-700 capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl border-2 border-secondary-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-primary-50 to-secondary-50 p-6 border-b border-secondary-200">
              <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                  <FiCreditCard className="w-6 h-6 text-white" />
                </div>
                Tiện ích nhanh
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="group block"
                    >
                      <div className="relative bg-white rounded-xl border-2 border-secondary-200 hover:border-primary-400 p-5 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-secondary-900 mb-1 group-hover:text-primary-700 transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-sm text-secondary-600">
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto pt-4 border-t border-secondary-100">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700 transition-colors">
                              {action.cta}
                            </span>
                            <FiArrowRight className="w-4 h-4 text-primary-600 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                      </Link>
                  );
                })}
              </div>
            </CardContent>
          </div>
        </div>
    </PageShell>
    </div>
  );
}
