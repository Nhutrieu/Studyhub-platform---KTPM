"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { loginSchema } from "@/lib/validation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { notifications } from "@/lib/notifications";
import type { z } from "zod";
import AuthLayout from "@/components/layouts/AuthLayout";
import { getDashboardRoute } from "@/lib/auth/roles";

// Remove AUTH_BG_IMAGE as it's in AuthLayout

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur"
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data.email, data.password);
      setAuth(response);

      // Don't set cookies - everything is stored in sessionStorage (tab-specific)
      // This ensures each tab has its own independent session

      notifications.login.success(
        response.user.name || response.user.fullName || "bạn",
        response.user.role
      );

      const dashboardLink = redirect !== "/" ? redirect : getDashboardRoute(response.user.role);

      setTimeout(() => {
        router.push(dashboardLink);
      }, 300);
    } catch (error: unknown) {
      let errorMessage = "Đăng nhập thất bại. Vui lòng thử lại.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number, data?: { message?: string } } };
        const status = axiosError.response?.status;

        if (status === 401 || status === 400 || status === 404) {
          errorMessage = "Email hoặc mật khẩu không đúng.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      notifications.login.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay trở lại FurniMart"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="text"
          {...register("email")}
          error={errors.email?.message}
          placeholder="vd: tenban@gmail.com"
        />
        <div className="space-y-1">
          <PasswordInput
            label="Mật khẩu"
            {...register("password")}
            error={errors.password?.message}
            placeholder="Nhập mật khẩu của bạn"
          />
          <div className="flex justify-end pt-1">
            <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full text-base font-semibold shadow-md hover:shadow-lg transition-all mt-2"
          isLoading={isLoading}
        >
          Đăng nhập
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-secondary-100 bg-secondary-50/70 p-4 text-sm text-secondary-600">
        <p className="font-semibold text-secondary-800">Tài khoản FurniMart giúp bạn</p>
        <ul className="mt-2 space-y-1">
          <li>• Theo dõi đơn hàng & lịch sử mua sắm</li>
          <li>• Nhận ưu đãi thành viên và quà tặng</li>
          <li>• Lưu địa chỉ giao hàng nhanh hơn</li>
        </ul>
      </div>

      <div className="text-center text-sm mt-6 border-t border-secondary-100 pt-4">
        <span className="text-secondary-500">Khách hàng mới? </span>
        <Link href="/auth/register" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline underline-offset-2 transition-colors">
          Tạo tài khoản
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
