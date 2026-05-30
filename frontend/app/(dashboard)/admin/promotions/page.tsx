"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promotionService } from "@/services/promotionService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/dashboard/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { FiTag, FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { Promotion } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "percentage" as "percentage" | "fixed",
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    startDate: "",
    endDate: "",
    isActive: true,
    usageLimit: 0,
  });

  const { data: promotions, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "promotions"],
    queryFn: () => promotionService.getPromotions(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Promotion>) => promotionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      toast.success("Đã tạo khuyến mãi thành công");
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể tạo khuyến mãi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Promotion> }) =>
      promotionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      toast.success("Đã cập nhật khuyến mãi thành công");
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể cập nhật khuyến mãi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      toast.success("Đã xóa khuyến mãi thành công");
    },
    onError: () => {
      toast.error("Không thể xóa khuyến mãi");
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      type: "percentage",
      value: 0,
      minOrderAmount: 0,
      maxDiscountAmount: 0,
      startDate: "",
      endDate: "",
      isActive: true,
      usageLimit: 0,
    });
    setEditingPromotion(null);
  };

  const handleOpenModal = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        code: promotion.code || "",
        name: promotion.name,
        description: promotion.description || "",
        type: (promotion.type as "percentage" | "fixed") || "percentage",
        value: promotion.value,
        minOrderAmount: promotion.minPurchaseAmount || promotion.minOrderAmount || 0,
        maxDiscountAmount: promotion.maxDiscountAmount || 0,
        startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().split("T")[0] : "",
        endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().split("T")[0] : "",
        isActive: promotion.isActive ?? true,
        usageLimit: promotion.usageLimit || 0,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Transform data to match backend CreatePromotionDto
    // Backend requires: name, type, value, startDate (ISO date-time), endDate (ISO date-time)
    // Backend optional: description, applicableProducts, applicableCategories, minPurchaseAmount, maxDiscountAmount, usageLimit, code, isCodeRequired
    const submitData: Partial<Promotion> = {
      name: formData.name,
      type: formData.type,
      value: Number(formData.value),
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date().toISOString(),
      ...(formData.description && { description: formData.description }),
      ...(formData.minOrderAmount && formData.minOrderAmount > 0 && { minPurchaseAmount: Number(formData.minOrderAmount) }),
      ...(formData.maxDiscountAmount && formData.maxDiscountAmount > 0 && { maxDiscountAmount: Number(formData.maxDiscountAmount) }),
      ...(formData.usageLimit && formData.usageLimit > 0 && { usageLimit: Number(formData.usageLimit) }),
      ...(formData.code && { code: formData.code }),
    };

    if (editingPromotion) {
      // For update, only send fields that can be updated
      const updateData: Partial<Promotion> = {
        ...(formData.name && { name: formData.name }),
        ...(formData.description && { description: formData.description }),
        ...(formData.startDate && { startDate: new Date(formData.startDate).toISOString() }),
        ...(formData.endDate && { endDate: new Date(formData.endDate).toISOString() }),
        isActive: formData.isActive,
      };
      updateMutation.mutate({ id: editingPromotion.id, data: updateData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const columns = [
    {
      key: "code",
      header: "Mã",
      render: (item: Promotion) => (
        <span className="font-mono font-medium">{item.code || "-"}</span>
      ),
    },
    {
      key: "name",
      header: "Tên",
      render: (item: Promotion) => (
        <div>
          <p className="font-medium">{item.name}</p>
          {item.description && (
            <p className="text-xs text-stone-500 line-clamp-1">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "discount",
      header: "Giảm giá",
      render: (item: Promotion) => (
        <span className="font-medium text-emerald-600">
          {item.type === "percentage" ? `${item.value}%` : formatCurrency(item.value)}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Thời gian",
      render: (item: Promotion) => (
        <div className="text-sm">
          <p>{new Date(item.startDate).toLocaleDateString("vi-VN")}</p>
          <p className="text-stone-500">→ {new Date(item.endDate).toLocaleDateString("vi-VN")}</p>
        </div>
      ),
    },
    {
      key: "usage",
      header: "Sử dụng",
      render: (item: Promotion) => (
        <span className="text-sm">
          {item.usedCount || item.usageCount || 0} / {item.usageLimit || "∞"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Promotion) => {
        const now = new Date();
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const isActive = item.isActive && now >= start && now <= end;
        return (
          <Badge variant={isActive ? "success" : "danger"}>
            {isActive ? "Đang hoạt động" : "Không hoạt động"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (item: Promotion) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>
            <FiEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Bạn có chắc muốn xóa khuyến mãi này?")) {
                deleteMutation.mutate(item.id);
              }
            }}
          >
            <FiTrash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Quản lý khuyến mãi"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Khuyến mãi" },
        ]}
        actions={
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <FiPlus className="w-4 h-4 mr-2" />
            Thêm khuyến mãi
          </Button>
        }
      />
      <main className="space-y-6">
        <Card variant="outline">
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-stone-500">Đang tải...</div>
            ) : isError ? (
              <ErrorState
                title="Không thể tải khuyến mãi"
                description="Vui lòng thử lại sau"
                action={{ label: "Thử lại", onClick: () => refetch() }}
              />
            ) : !promotions || promotions.length === 0 ? (
              <EmptyState
                icon={<FiTag className="w-16 h-16 text-stone-300" />}
                title="Chưa có khuyến mãi nào"
                description="Thêm khuyến mãi mới để bắt đầu"
              />
            ) : (
              <DataTable<Promotion>
                columns={columns}
                data={promotions || []}
              />
            )}
          </CardContent>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingPromotion ? "Chỉnh sửa khuyến mãi" : "Thêm khuyến mãi mới"}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Mã khuyến mãi"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <Input
                label="Tên"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <Input
              label="Mô tả"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loại giảm giá</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "percentage" | "fixed" })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  required
                >
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định</option>
                </select>
              </div>
              <Input
                label={formData.type === "percentage" ? "Giá trị (%)" : "Số tiền (₫)"}
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                required
                min={0}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Đơn hàng tối thiểu (₫)"
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 })}
                min={0}
              />
              <Input
                label="Giảm tối đa (₫)"
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ngày bắt đầu"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
              <Input
                label="Ngày kết thúc"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <Input
              label="Giới hạn sử dụng (0 = không giới hạn)"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm">
                Hoạt động
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {editingPromotion ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}
