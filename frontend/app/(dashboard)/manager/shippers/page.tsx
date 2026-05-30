"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { User } from "@/lib/types";
import { FiTruck, FiUserPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

export default function ManagerShippersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const branchId = user?.branchId;
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["manager", "shippers", branchId],
    queryFn: () => userService.getUsers("shipper"),
  });

  const filteredData = data?.filter((shipper: User) => {
    if (!shipper.branchId || shipper.branchId !== branchId) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        shipper.fullName?.toLowerCase().includes(searchLower) ||
        shipper.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const createShipperMutation = useMutation({
    mutationFn: (data: typeof formData) => authService.register(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      "shipper",
      branchId
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "shippers"] });
      toast.success("Tạo shipper thành công");
      setModalOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể tạo shipper";
      toast.error(message);
    },
  });

  const updateShipperMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "shippers"] });
      toast.success("Cập nhật shipper thành công");
      setModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể cập nhật shipper");
    },
  });

  const deleteShipperMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "shippers"] });
      toast.success("Xóa shipper thành công");
      setDeleteModalOpen(false);
      setSelectedShipper(null);
    },
    onError: () => {
      toast.error("Không thể xóa shipper");
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      fullName: "",
      phone: "",
    });
    setSelectedShipper(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (shipper: User) => {
    setSelectedShipper(shipper);
    setFormData({
      email: shipper.email,
      password: "",
      fullName: shipper.fullName || shipper.name || "",
      phone: shipper.phone || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShipper) {
      updateShipperMutation.mutate({
        id: selectedShipper.id,
        data: {
          fullName: formData.fullName,
          phone: formData.phone,
        },
      });
    } else {
      if (!formData.password) {
        toast.error("Vui lòng nhập mật khẩu");
        return;
      }
      createShipperMutation.mutate(formData);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Họ tên",
      render: (shipper: User) => (
        <div>
          <p className="font-medium">{shipper.fullName || shipper.name}</p>
          <p className="text-xs text-stone-500">{shipper.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (shipper: User) => <span className="text-sm">{shipper.phone || "N/A"}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (shipper: User) => (
        <Badge variant={shipper.isActive ? "success" : "danger"}>
          {shipper.isActive ? "Hoạt động" : "Không hoạt động"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (shipper: User) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditModal(shipper)}
          >
            <FiEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedShipper(shipper);
              setDeleteModalOpen(true);
            }}
          >
            <FiTrash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  if (!user?.branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Quản lý shipper"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Shipper" }]}
        />
        <EmptyState
          title="Bạn chưa được gán cho chi nhánh nào"
          description="Vui lòng liên hệ quản trị viên"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Quản lý shipper"
        breadcrumbs={[
          { label: "Dashboard", href: "/manager" },
          { label: "Shipper" },
        ]}
        actions={
          <Button 
            variant="primary"
            onClick={handleOpenCreateModal}
          >
            <FiUserPlus className="w-4 h-4 mr-2" />
            Thêm shipper
          </Button>
        }
      />
      <main className="space-y-6">
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Tìm kiếm shipper...",
              }}
            />
          }
          emptyState={
            <EmptyState
              icon={<FiTruck className="w-16 h-16 text-stone-300" />}
              title="Chưa có shipper nào"
              description="Thêm shipper mới cho chi nhánh của bạn"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải shipper"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}

        {/* Create/Edit Shipper Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={selectedShipper ? "Chỉnh sửa shipper" : "Thêm shipper"}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Nhập email"
              required
              disabled={!!selectedShipper}
            />
            {!selectedShipper && (
              <Input
                label="Mật khẩu"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Nhập mật khẩu"
                required
              />
            )}
            <Input
              label="Họ tên"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Nhập họ tên"
              required
            />
            <Input
              label="Số điện thoại"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Nhập số điện thoại"
            />
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createShipperMutation.isPending || updateShipperMutation.isPending}
              >
                {selectedShipper ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedShipper(null);
          }}
          title="Xác nhận xóa"
        >
          {selectedShipper && (
            <div className="space-y-4">
              <p>
                Bạn có chắc chắn muốn xóa shipper <strong>{selectedShipper.fullName || selectedShipper.name}</strong>?
              </p>
              <p className="text-sm text-stone-600">
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedShipper(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (selectedShipper) {
                      deleteShipperMutation.mutate(selectedShipper.id);
                    }
                  }}
                  isLoading={deleteShipperMutation.isPending}
                >
                  Xóa
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </PageShell>
  );
}

