"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AuthLayout from "@/components/layouts/AuthLayout";
import { toast } from "react-toastify";
import { authService } from "@/services/authService";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setIsSubmitted(true);
      toast.success("Đã gửi link khôi phục mật khẩu đến email của bạn");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra, vui lòng thử lại";
      toast.error(errorMessage);
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle="Nhập email để nhận hướng dẫn đặt lại mật khẩu."
      className="max-w-md"
    >
      {isSubmitted ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-success-100 bg-success-50 p-4 text-sm text-success-700">
            Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến email của bạn. Vui
            lòng kiểm tra hộp thư đến (và cả mục Spam).
          </div>
          <Link href="/auth/login" className="block">
            <Button variant="primary" className="w-full">
              Quay lại đăng nhập
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="name@example.com"
            {...register("email")}
            error={errors.email?.message}
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full text-base font-semibold shadow-md hover:shadow-lg transition-all"
            isLoading={isLoading}
          >
            Gửi yêu cầu
          </Button>
        </form>
      )}

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
