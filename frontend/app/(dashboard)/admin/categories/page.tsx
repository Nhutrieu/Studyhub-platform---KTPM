"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "@/services/categoryService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/dashboard/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { Category } from "@/lib/types";
import { FiTag, FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    parentId: "",
    isActive: true,
  });

  const { data: categories, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => categoryService.getCategories(true),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Category>) => categoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Đã tạo danh mục thành công");
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể tạo danh mục");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      categoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Đã cập nhật danh mục thành công");
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể cập nhật danh mục");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Đã xóa danh mục thành công");
    },
    onError: () => {
      toast.error("Không thể xóa danh mục");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      image: "",
      parentId: "",
      isActive: true,
    });
    setEditingCategory(null);
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image: category.image || "",
        parentId: category.parentId || "",
        isActive: category.isActive ?? true,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend CreateCategoryDto requires: name, slug
    // Backend optional: description, image, parentId, sortOrder
    // Backend UpdateCategoryDto: all fields optional, plus isActive
    const submitData: Partial<Category> = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), // Auto-generate slug if empty
      ...(formData.description && { description: formData.description.trim() }),
      ...(formData.image && { image: formData.image.trim() }),
      ...(formData.parentId && { parentId: formData.parentId }),
    };
    
    if (editingCategory) {
      // For update, include isActive
      const updateData: Partial<Category> = {
        ...submitData,
        ...(formData.isActive !== undefined && { isActive: formData.isActive }),
      };
      updateMutation.mutate({ id: editingCategory.id, data: updateData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Tên danh mục",
      render: (item: Record<string, unknown>) => {
        const category = item as unknown as Category;
        return (
          <div className="flex items-center gap-3">
            {category.image && (
              <img src={category.image} alt={category.name} className="w-10 h-10 rounded object-cover" />
            )}
            <div>
              <p className="font-medium">{category.name}</p>
              {category.description && (
                <p className="text-xs text-stone-500 line-clamp-1">{category.description}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "slug",
      header: "Slug",
      render: (item: Record<string, unknown>) => (
        <span className="text-sm font-mono text-stone-600">{(item as unknown as Category).slug}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Record<string, unknown>) => {
        const category = item as unknown as Category;
        return (
          <Badge variant={category.isActive ? "success" : "danger"}>
            {category.isActive ? "Hoạt động" : "Không hoạt động"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (item: Record<string, unknown>) => {
        const category = item as unknown as Category;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenModal(category)}
            >
              <FiEdit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Bạn có chắc muốn xóa danh mục này?")) {
                  deleteMutation.mutate(category.id);
                }
              }}
            >
              <FiTrash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Quản lý danh mục"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Danh mục" },
        ]}
        actions={
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <FiPlus className="w-4 h-4 mr-2" />
            Thêm danh mục
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
                title="Không thể tải danh mục"
                description="Vui lòng thử lại sau"
                action={{ label: "Thử lại", onClick: () => refetch() }}
              />
            ) : !categories || categories.length === 0 ? (
              <EmptyState
                icon={<FiTag className="w-16 h-16 text-stone-300" />}
                title="Chưa có danh mục nào"
                description="Thêm danh mục mới để bắt đầu"
              />
            ) : (
              <DataTable
                columns={columns}
                data={categories as unknown as Record<string, unknown>[]}
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
          title={editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tên danh mục"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (!editingCategory) {
                  setFormData((prev) => ({
                    ...prev,
                    slug: e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/đ/g, "d")
                      .replace(/Đ/g, "D")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, ""),
                  }));
                }
              }}
              required
            />
            <Input
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
            <Input
              label="Mô tả"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />
            <Input
              label="URL hình ảnh"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
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
                {editingCategory ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}
