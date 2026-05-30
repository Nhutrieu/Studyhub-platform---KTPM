"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { disputeService } from "@/services/disputeService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/dashboard/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import { FiAlertCircle, FiEye } from "react-icons/fi";
import { toast } from "react-toastify";
import { Dispute } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: disputes, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "disputes", statusFilter],
    queryFn: () => disputeService.getDisputes(statusFilter !== "all" ? statusFilter : undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Dispute> }) => disputeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "disputes"] });
      toast.success("Đã cập nhật khiếu nại thành công");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Không thể cập nhật khiếu nại");
    },
  });

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
      pending: { label: "Chờ xử lý", variant: "warning" },
      processing: { label: "Đang xử lý", variant: "info" },
      resolved: { label: "Đã giải quyết", variant: "success" },
      rejected: { label: "Từ chối", variant: "danger" },
    };
    return statusMap[status] || { label: status, variant: "info" };
  };

  const columns = [
    {
      key: "orderId",
      header: "Mã đơn hàng",
      render: (item: Dispute) => (
        <span className="font-mono text-sm">{item.orderId?.slice(-8) || "N/A"}</span>
      ),
    },
    {
      key: "type",
      header: "Loại",
      render: (item: Dispute) => (
        <span className="text-sm capitalize">{item.type || "N/A"}</span>
      ),
    },
    {
      key: "reason",
      header: "Lý do",
      render: (item: Dispute) => (
        <p className="text-sm line-clamp-2">{item.reason || item.description || "N/A"}</p>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Dispute) => {
        const statusInfo = getStatusBadge(item.status);
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (item: Dispute) => (
        <span className="text-sm">
          {formatDistanceToNow(new Date(item.createdAt), {
            addSuffix: true,
            locale: vi,
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Dispute) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDispute(item);
              setIsModalOpen(true);
            }}
          >
            <FiEye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Quản lý khiếu nại"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Khiếu nại" },
        ]}
      />
      <main className="space-y-6">
        <Card variant="outline">
          <CardContent>
            <div className="mb-4">
              <Select
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "pending", label: "Chờ xử lý" },
                  { value: "processing", label: "Đang xử lý" },
                  { value: "resolved", label: "Đã giải quyết" },
                  { value: "rejected", label: "Từ chối" },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-48"
              />
            </div>
            {isLoading ? (
              <div className="text-center py-12 text-stone-500">Đang tải...</div>
            ) : isError ? (
              <ErrorState
                title="Không thể tải khiếu nại"
                description="Vui lòng thử lại sau"
                action={{ label: "Thử lại", onClick: () => refetch() }}
              />
            ) : !disputes || disputes.length === 0 ? (
              <EmptyState
                icon={<FiAlertCircle className="w-16 h-16 text-stone-300" />}
                title="Chưa có khiếu nại nào"
                description="Khiếu nại sẽ hiển thị tại đây"
              />
            ) : (
              <DataTable<Dispute>
                columns={columns}
                data={disputes || []}
              />
            )}
          </CardContent>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDispute(null);
          }}
          title="Chi tiết khiếu nại"
          size="lg"
        >
          {selectedDispute && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-stone-500">Mã đơn hàng</p>
                <p className="font-medium">{selectedDispute.orderId}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Loại</p>
                <p className="font-medium capitalize">{selectedDispute.type}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Lý do</p>
                <p className="font-medium">{selectedDispute.reason || selectedDispute.description}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Trạng thái</p>
                {(() => {
                  const statusInfo = getStatusBadge(selectedDispute.status);
                  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
                })()}
              </div>
              {selectedDispute.images && selectedDispute.images.length > 0 && (
                <div>
                  <p className="text-sm text-stone-500 mb-2">Hình ảnh</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedDispute.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Evidence ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-stone-500 mb-2">Cập nhật trạng thái</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedDispute.id, "processing")}
                    disabled={selectedDispute.status === "processing"}
                  >
                    Đang xử lý
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedDispute.id, "resolved")}
                    disabled={selectedDispute.status === "resolved"}
                  >
                    Đã giải quyết
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Bạn có chắc muốn từ chối khiếu nại này?")) {
                        handleUpdateStatus(selectedDispute.id, "rejected");
                      }
                    }}
                    disabled={selectedDispute.status === "rejected"}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </PageShell>
  );
}
