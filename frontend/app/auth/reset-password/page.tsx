"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AuthLayout from "@/components/layouts/AuthLayout";
import { toast } from "react-toastify";
import { authService } from "@/services/authService";
import PasswordInput from "@/components/ui/PasswordInput";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  confirmPassword: z.string().min(6, "Xác nhận mật khẩu phải có ít nhất 6 ký tự"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      toast.error("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!token) {
      toast.error("Link đặt lại mật khẩu không hợp lệ");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, data.password);
      setIsSuccess(true);
      toast.success("Đặt lại mật khẩu thành công!");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra, vui lòng thử lại";
      toast.error(errorMessage);
      console.error("Reset password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid || !token) {
    return (
      <AuthLayout
        title="Link không hợp lệ"
        subtitle="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-error-100 bg-error-50 p-4 text-sm text-error-700">
            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.
          </div>
          <Link href="/auth/forgot-password" className="block">
            <Button variant="primary" className="w-full">
              Yêu cầu link mới
            </Button>
          </Link>
          <Link href="/auth/login" className="block">
            <Button variant="outline" className="w-full">
              Quay lại đăng nhập
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Đặt lại mật khẩu thành công"
        subtitle="Mật khẩu của bạn đã được đặt lại thành công."
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-success-100 bg-success-50 p-4 text-sm text-success-700">
            Mật khẩu của bạn đã được đặt lại thành công. Bạn sẽ được chuyển đến trang đăng nhập trong giây lát.
          </div>
          <Link href="/auth/login" className="block">
            <Button variant="primary" className="w-full">
              Đăng nhập ngay
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới của bạn"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <PasswordInput
          label="Mật khẩu mới"
          placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
          {...register("password")}
          error={errors.password?.message}
          autoFocus
        />

        <PasswordInput
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu mới"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full text-base font-semibold shadow-md hover:shadow-lg transition-all"
          isLoading={isLoading}
        >
          Đặt lại mật khẩu
        </Button>
      </form>

      <div className="text-center text-sm mt-6 border-t border-secondary-100 pt-4">
        <span className="text-secondary-500">Nhớ mật khẩu rồi? </span>
        <Link
          href="/auth/login"
          className="text-primary-600 font-semibold hover:text-primary-700 hover:underline underline-offset-2 transition-colors"
        >
          Đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthLayout
        title="Đang tải..."
        subtitle="Vui lòng đợi trong giây lát"
        className="max-w-md"
      >
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AuthLayout>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
