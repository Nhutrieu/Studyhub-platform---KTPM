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
import { FiUserPlus, FiUsers, FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

export default function ManagerEmployeesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const branchId = user?.branchId;
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["manager", "employees", branchId],
    queryFn: () => userService.getUsers("employee"),
  });

  const filteredData = data?.filter((emp: User) => {
    if (!emp.branchId || emp.branchId !== branchId) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        emp.fullName?.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  const createEmployeeMutation = useMutation({
    mutationFn: (data: typeof formData) => authService.register(
      data.email,
      data.password,
      data.fullName,
      data.phone,
      "employee",
      branchId
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "employees"] });
      toast.success("Tạo nhân viên thành công");
      setModalOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể tạo nhân viên";
      toast.error(message);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "employees"] });
      toast.success("Cập nhật nhân viên thành công");
      setModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể cập nhật nhân viên");
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "employees"] });
      toast.success("Xóa nhân viên thành công");
      setDeleteModalOpen(false);
      setSelectedEmployee(null);
    },
    onError: () => {
      toast.error("Không thể xóa nhân viên");
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      fullName: "",
      phone: "",
    });
    setSelectedEmployee(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (employee: User) => {
    setSelectedEmployee(employee);
    setFormData({
      email: employee.email,
      password: "",
      fullName: employee.fullName || employee.name || "",
      phone: employee.phone || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({
        id: selectedEmployee.id,
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
      createEmployeeMutation.mutate(formData);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Họ tên",
      render: (employee: User) => (
        <div>
          <p className="font-medium">{employee.fullName || employee.name}</p>
          <p className="text-xs text-stone-500">{employee.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (employee: User) => <span className="text-sm">{employee.phone || "N/A"}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (employee: User) => (
        <Badge variant={employee.isActive ? "success" : "danger"}>
          {employee.isActive ? "Hoạt động" : "Không hoạt động"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (employee: User) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditModal(employee)}
          >
            <FiEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedEmployee(employee);
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
          title="Quản lý nhân viên"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Nhân viên" }]}
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
        title="Quản lý nhân viên"
        breadcrumbs={[
          { label: "Dashboard", href: "/manager" },
          { label: "Nhân viên" },
        ]}
        actions={
          <Button 
            variant="primary"
            onClick={handleOpenCreateModal}
          >
            <FiUserPlus className="w-4 h-4 mr-2" />
            Thêm nhân viên
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
                placeholder: "Tìm kiếm nhân viên...",
              }}
            />
          }
          emptyState={
            <EmptyState
              icon={<FiUsers className="w-16 h-16 text-stone-300" />}
              title="Chưa có nhân viên nào"
              description="Thêm nhân viên mới cho chi nhánh của bạn"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải nhân viên"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}

        {/* Create/Edit Employee Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={selectedEmployee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên"}
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
              disabled={!!selectedEmployee}
            />
            {!selectedEmployee && (
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
                isLoading={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
              >
                {selectedEmployee ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedEmployee(null);
          }}
          title="Xác nhận xóa"
        >
          {selectedEmployee && (
            <div className="space-y-4">
              <p>
                Bạn có chắc chắn muốn xóa nhân viên <strong>{selectedEmployee.fullName || selectedEmployee.name}</strong>?
              </p>
              <p className="text-sm text-stone-600">
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedEmployee(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (selectedEmployee) {
                      deleteEmployeeMutation.mutate(selectedEmployee.id);
                    }
                  }}
                  isLoading={deleteEmployeeMutation.isPending}
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

