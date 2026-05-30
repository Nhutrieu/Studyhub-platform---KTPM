"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { disputeService } from "@/services/disputeService";
import { orderService } from "@/services/orderService";
import { disputeSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { toast } from "react-toastify";
import { formatDateTime } from "@/lib/format";
import { FiAlertCircle, FiPlus, FiPackage, FiMessageSquare } from "react-icons/fi";
import { Dispute } from "@/lib/types";
import Link from "next/link";

type DisputeForm = z.infer<typeof disputeSchema>;

export default function DisputesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: disputes, isLoading, isError, refetch } = useQuery({
    queryKey: ["disputes", "my"],
    queryFn: () => disputeService.getMyDisputes(),
  });

  const { data: orders } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => orderService.getMyOrders(),
  });

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<DisputeForm>({
    resolver: zodResolver(disputeSchema),
  });

  const createDisputeMutation = useMutation({
    mutationFn: (data: DisputeForm) => {
      // Ensure reason is always provided
      const reason = (data.reason && data.reason.trim().length >= 10) 
        ? data.reason.trim() 
        : data.description.trim().substring(0, 100);
      
      return disputeService.create({
        ...data,
        reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes", "my"] });
      toast.success("Tạo yêu cầu hỗ trợ thành công");
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể tạo yêu cầu hỗ trợ";
      toast.error(errorMessage);
      console.error("Create dispute error:", error);
    },
  });

  const onSubmit = (data: DisputeForm) => {
    // Validate required fields
    if (!data.orderId || data.orderId.trim() === "") {
      toast.error("Vui lòng chọn đơn hàng liên quan");
      return;
    }
    if (!data.type || data.type.trim() === "") {
      toast.error("Vui lòng chọn loại yêu cầu");
      return;
    }
    if (!data.description || data.description.trim().length < 20) {
      toast.error("Mô tả chi tiết phải có ít nhất 20 ký tự");
      return;
    }
    // Reason is optional in form but required in backend, use description if empty
    const reason = (data.reason && data.reason.trim().length >= 10) 
      ? data.reason.trim() 
      : data.description.trim().substring(0, 100);
    
    createDisputeMutation.mutate({
      ...data,
      reason: reason,
    });
  };

  const getDisputeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      return: "Đổi trả",
      warranty: "Bảo hành",
      assembly: "Lắp ráp",
      other: "Khác",
    };
    return labels[type] || type;
  };

  const getDisputeStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
      PENDING: { label: "Chờ xử lý", variant: "warning" },
      IN_PROGRESS: { label: "Đang xử lý", variant: "info" },
      RESOLVED: { label: "Đã giải quyết", variant: "success" },
      REJECTED: { label: "Từ chối", variant: "danger" },
      CANCELLED: { label: "Đã hủy", variant: "default" },
    };
    const info = statusMap[status] || { label: status, variant: "default" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <PageShell>
      <PageHeader
        title="Yêu cầu hỗ trợ"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Tài khoản", href: "/account" },
          { label: "Yêu cầu hỗ trợ" },
        ]}
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <FiPlus className="w-4 h-4 mr-2" />
            Tạo yêu cầu
          </Button>
        }
      />
      <main className="space-y-6 pb-12">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton className="h-6 w-1/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải yêu cầu hỗ trợ"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : !disputes || disputes.length === 0 ? (
          <EmptyState
            icon={<FiAlertCircle className="w-16 h-16 text-secondary-300" />}
            title="Bạn chưa có yêu cầu hỗ trợ nào"
            description="Tạo yêu cầu mới để được hỗ trợ về đổi trả, bảo hành, lắp ráp..."
            action={{ label: "Tạo yêu cầu", onClick: () => setIsModalOpen(true) }}
          />
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute: Dispute) => (
              <Card key={dispute.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {getDisputeTypeLabel(dispute.type)}
                        </h3>
                        {getDisputeStatusBadge(dispute.status)}
                      </div>
                      {dispute.orderId && (
                        <div className="flex items-center gap-2 text-sm text-secondary-600 mb-2">
                          <FiPackage className="w-4 h-4" />
                          <span>Đơn hàng: </span>
                          <Link
                            href={`/orders/${dispute.orderId}`}
                            className="text-primary-600 hover:underline font-mono"
                          >
                            #{dispute.orderId.slice(-8).toUpperCase()}
                          </Link>
                        </div>
                      )}
                      <p className="text-secondary-600 mb-2">{dispute.reason}</p>
                      <p className="text-xs text-secondary-500">
                        {formatDateTime(dispute.createdAt)}
                      </p>
                    </div>
                  </div>
                  {dispute.response && (
                    <div className="mt-4 p-4 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FiMessageSquare className="w-4 h-4 text-primary-600" />
                        <p className="font-semibold text-sm">Phản hồi từ hệ thống:</p>
                      </div>
                      <p className="text-sm text-secondary-700">{dispute.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dispute Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            reset();
          }}
          title="Tạo yêu cầu hỗ trợ"
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Đơn hàng liên quan
              </label>
              <Select
                {...register("orderId")}
                error={errors.orderId?.message}
                options={[
                  { value: "", label: "Chọn đơn hàng" },
                  ...(orders?.map((order) => ({
                    value: order.id,
                    label: `Đơn hàng #${order.id.slice(-8).toUpperCase()} - ${formatDateTime(order.createdAt)}`,
                  })) || []),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Loại yêu cầu
              </label>
              <Select
                {...register("type")}
                error={errors.type?.message}
                options={[
                  { value: "", label: "Chọn loại yêu cầu" },
                  { value: "return", label: "Đổi trả" },
                  { value: "warranty", label: "Bảo hành" },
                  { value: "assembly", label: "Lắp ráp" },
                  { value: "other", label: "Khác" },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Lý do
              </label>
              <Textarea
                {...register("reason")}
                error={errors.reason?.message}
                placeholder="Lý do yêu cầu hỗ trợ..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Mô tả chi tiết <span className="text-red-500">*</span>
              </label>
              <Textarea
                {...register("description")}
                error={errors.description?.message}
                placeholder="Mô tả chi tiết vấn đề, tình huống cụ thể... (tối đa 100 ký tự)"
                rows={5}
                maxLength={100}
              />
              <div className="flex justify-end mt-1">
                <p className="text-xs text-secondary-500">
                  {(() => {
                    const text = watch("description") || "";
                    const charCount = text.length;
                    return `${charCount}/100 ký tự`;
                  })()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={createDisputeMutation.isPending}
              >
                Gửi yêu cầu
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  reset();
                }}
              >
                Hủy
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}

