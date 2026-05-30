"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import PageShell from "@/components/layouts/PageShell";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { disputeService } from "@/services/disputeService";
import { FiAlertTriangle } from "react-icons/fi";
import type { AxiosError } from "axios";

const disputeSchema = z.object({
    reason: z.string().min(1, "Vui lòng chọn lý do"),
    description: z.string().min(10, "Mô tả chi tiết ít nhất 10 ký tự"),
});

type DisputeForm = z.infer<typeof disputeSchema>;

export default function DisputePage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const { register, handleSubmit, formState: { errors } } = useForm<DisputeForm>({
        resolver: zodResolver(disputeSchema),
    });

    const createDisputeMutation = useMutation({
        mutationFn: (data: DisputeForm) => disputeService.create({ ...data, orderId, type: "other" }), // Default type
        onSuccess: () => {
            toast.success("Đã gửi yêu cầu khiếu nại");
            router.push(`/orders/${orderId}`);
        },
        onError: (err: AxiosError<{ message?: string }>) => {
            toast.error(err?.response?.data?.message || "Lỗi khi gửi yêu cầu");
        }
    });

    const onSubmit = (data: DisputeForm) => {
        createDisputeMutation.mutate(data);
    };

    return (
        <PageShell className="py-12 max-w-2xl">
            <Card>
                <CardHeader className="bg-error-50 border-b border-error-100">
                    <div className="flex items-center gap-3 text-error-700">
                        <FiAlertTriangle className="w-6 h-6" />
                        <CardTitle>Báo cáo vấn đề đơn hàng</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <p className="text-secondary-600 mb-6">
                        Chúng tôi rất tiếc về trải nghiệm không tốt của bạn. Vui lòng cho chúng tôi biết chi tiết vấn đề để được hỗ trợ nhanh nhất.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-secondary-900 mb-2">Lý do khiếu nại</label>
                            <select
                                {...register("reason")}
                                className="w-full p-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                            >
                                <option value="">-- Chọn lý do --</option>
                                <option value="item_missing">Thiếu sản phẩm</option>
                                <option value="item_damaged">Sản phẩm bị hư hỏng</option>
                                <option value="wrong_item">Giao sai sản phẩm</option>
                                <option value="not_received">Chưa nhận được hàng</option>
                                <option value="other">Khác</option>
                            </select>
                            {errors.reason && <p className="text-xs text-error-600 mt-1">{errors.reason.message}</p>}
                        </div>

                        <Textarea
                            label="Mô tả chi tiết"
                            {...register("description")}
                            error={errors.description?.message}
                            placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải..."
                            rows={5}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>Hủy bỏ</Button>
                            <Button type="submit" variant="danger" isLoading={createDisputeMutation.isPending}>
                                Gửi khiếu nại
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </PageShell>
    );
}
