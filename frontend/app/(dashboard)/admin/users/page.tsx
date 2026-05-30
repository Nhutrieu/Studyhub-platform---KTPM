"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { branchService } from "@/services/branchService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { User, UserRole } from "@/lib/types";
import { FiUserPlus, FiUsers, FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

const getRoleBadge = (role: string) => {
  const roleMap: Record<string, { label: string; variant: "success" | "warning" | "info" | "danger" | "default" }> = {
    admin: { label: "Quản trị viên", variant: "danger" },
    branch_manager: { label: "Quản lý chi nhánh", variant: "warning" },
    employee: { label: "Nhân viên", variant: "info" },
    shipper: { label: "Shipper", variant: "info" },
    customer: { label: "Khách hàng", variant: "default" },
  };
  return roleMap[role] || { label: role, variant: "default" };
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: "customer",
    branchId: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "users", search, roleFilter],
    queryFn: () => userService.getUsers(roleFilter !== "all" ? roleFilter : undefined),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => branchService.getBranches(),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: typeof formData) => authService.register(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      data.role,
      data.branchId || undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Tạo người dùng thành công");
      setModalOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể tạo người dùng";
      toast.error(message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Cập nhật người dùng thành công");
      setModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể cập nhật người dùng");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Xóa người dùng thành công");
      setDeleteModalOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error("Không thể xóa người dùng");
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      role: "customer",
      branchId: "",
    });
    setSelectedUser(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      fullName: user.fullName || user.name || "",
      phone: user.phone || "",
      role: user.role,
      branchId: user.branchId || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        data: {
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role as UserRole,
          branchId: formData.branchId || undefined,
        },
      });
    } else {
      if (!formData.password) {
        toast.error("Vui lòng nhập mật khẩu");
        return;
      }
      createUserMutation.mutate(formData);
    }
  };

  const filteredData = data?.filter((user: User) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const columns = [
    {
      key: "name",
      header: "Họ tên",
      render: (user: User) => (
        <div>
          <p className="font-medium">{user.fullName || user.name}</p>
          <p className="text-xs text-stone-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (user: User) => <span className="text-sm">{user.phone || "N/A"}</span>,
    },
    {
      key: "role",
      header: "Vai trò",
      render: (user: User) => {
        const roleInfo = getRoleBadge(user.role);
        return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
      },
    },
    {
      key: "branch",
      header: "Chi nhánh",
      render: (user: User) => (
        <span className="text-sm text-stone-600">
          {user.branchId ? `Chi nhánh ${user.branchId.slice(-6)}` : "N/A"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (user: User) => (
        <span className="text-sm text-stone-600">
          {new Date(user.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (user: User) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditModal(user)}
          >
            <FiEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedUser(user);
              setDeleteModalOpen(true);
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
        title="Quản lý người dùng"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Người dùng" },
        ]}
        actions={
          <Button 
            variant="primary"
            onClick={handleOpenCreateModal}
          >
            <FiUserPlus className="w-4 h-4 mr-2" />
            Thêm người dùng
          </Button>
        }
      />
      <main className="space-y-6">
        <DataTable<User>
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Tìm kiếm người dùng...",
              }}
              filters={
                <Select
                  options={[
                    { value: "all", label: "Tất cả vai trò" },
                    { value: "admin", label: "Quản trị viên" },
                    { value: "branch_manager", label: "Quản lý chi nhánh" },
                    { value: "employee", label: "Nhân viên" },
                    { value: "shipper", label: "Shipper" },
                    { value: "customer", label: "Khách hàng" },
                  ]}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-48"
                />
              }
            />
          }
          emptyState={
            <EmptyState
              icon={<FiUsers className="w-16 h-16 text-stone-300" />}
              title="Chưa có người dùng nào"
              description="Người dùng sẽ hiển thị tại đây"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải người dùng"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}

        {/* Create/Edit User Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={selectedUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
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
              disabled={!!selectedUser}
            />
            {!selectedUser && (
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
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Vai trò
              </label>
              <Select
                options={[
                  { value: "customer", label: "Khách hàng" },
                  { value: "employee", label: "Nhân viên" },
                  { value: "branch_manager", label: "Quản lý chi nhánh" },
                  { value: "shipper", label: "Shipper" },
                  { value: "admin", label: "Quản trị viên" },
                ]}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
            {(formData.role === "employee" || formData.role === "branch_manager" || formData.role === "shipper") && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Chi nhánh
                </label>
                <Select
                  options={[
                    { value: "", label: "Chọn chi nhánh..." },
                    ...(branches || []).map((branch) => ({
                      value: branch.id,
                      label: branch.name,
                    })),
                  ]}
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  required
                />
              </div>
            )}
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
                isLoading={createUserMutation.isPending || updateUserMutation.isPending}
              >
                {selectedUser ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedUser(null);
          }}
          title="Xác nhận xóa"
        >
          {selectedUser && (
            <div className="space-y-4">
              <p>
                Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser.fullName || selectedUser.name}</strong>?
              </p>
              <p className="text-sm text-stone-600">
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (selectedUser) {
                      deleteUserMutation.mutate(selectedUser.id);
                    }
                  }}
                  isLoading={deleteUserMutation.isPending}
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

