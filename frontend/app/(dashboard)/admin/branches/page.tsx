"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { branchService } from "@/services/branchService";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { Branch } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { FiBox, FiPlus } from "react-icons/fi";
import Link from "next/link";
import { toast } from "react-toastify";

const getStatusBadge = (status?: string) => {
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    active: { label: "Hoạt động", variant: "success" },
    inactive: { label: "Không hoạt động", variant: "danger" },
    pending: { label: "Chờ duyệt", variant: "warning" },
    approved: { label: "Đã duyệt", variant: "info" },
    rejected: { label: "Từ chối", variant: "danger" },
  };
  return statusMap[status || ""] || { label: status || "N/A", variant: "default" };
};

export default function AdminBranchesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: {
      street: "",
      ward: "",
      district: "",
      city: "",
      coordinates: {
        lat: 0,
        lng: 0,
      },
    },
    phone: "",
    email: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "branches", search, statusFilter],
    queryFn: () => branchService.getBranches(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Branch>) => branchService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });
      toast.success("Đã tạo chi nhánh thành công");
      setIsModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Không thể tạo chi nhánh");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      address: {
        street: "",
        ward: "",
        district: "",
        city: "",
        coordinates: {
          lat: 0,
          lng: 0,
        },
      },
      phone: "",
      email: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend CreateBranchDto requires: name, address (nested object), phone
    // Backend optional: description, email, registrationData
    const submitData = {
      name: formData.name,
      address: {
        street: formData.address.street,
        ward: formData.address.ward,
        district: formData.address.district,
        city: formData.address.city,
        ...(formData.address.coordinates.lat !== 0 && formData.address.coordinates.lng !== 0 && {
          coordinates: {
            lat: formData.address.coordinates.lat,
            lng: formData.address.coordinates.lng,
          }
        }),
      },
      phone: formData.phone,
      ...(formData.description && { description: formData.description }),
      ...(formData.email && { email: formData.email }),
    };
    createMutation.mutate(submitData);
  };

  const filteredData = data?.filter((branch: Branch) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return branch.name.toLowerCase().includes(searchLower);
    }
    if (statusFilter !== "all") {
      return branch.status === statusFilter;
    }
    return true;
  }) || [];

  const columns = [
    {
      key: "name",
      header: "Tên chi nhánh",
      render: (item: Record<string, unknown>) => {
        const branch = item as unknown as Branch;
        return (
          <div>
            <p className="font-medium">{branch.name}</p>
            <p className="text-xs text-stone-500">
              {typeof branch.address === 'string'
                ? branch.address
                : `${branch.address?.street || ''}, ${branch.address?.ward || ''}, ${branch.address?.district || ''}`}
            </p>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (item: Record<string, unknown>) => {
        const branch = item as unknown as Branch;
        return <span className="text-sm">{branch.phone}</span>;
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Record<string, unknown>) => {
        const branch = item as unknown as Branch;
        const statusInfo = getStatusBadge(branch.status);
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
    },
    {
      key: "revenue",
      header: "Doanh thu",
      render: (item: Record<string, unknown>) => (
        <span className="font-semibold text-emerald-600">
          {formatCurrency((item as unknown as Branch).totalRevenue || 0)}
        </span>
      ),
    },
    {
      key: "orders",
      header: "Đơn hàng",
      render: (item: Record<string, unknown>) => (
        <span className="text-sm">{(item as unknown as Branch).totalOrders || 0}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: Record<string, unknown>) => {
        const branch = item as unknown as Branch;
        if (!branch || !branch.id) return null;
        return (
          <Link href={`/admin/branches/${branch.id}`} prefetch={false}>
            <Button variant="ghost" size="sm">
              Xem chi tiết
            </Button>
          </Link>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý chi nhánh"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Chi nhánh" },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Thêm chi nhánh
          </Button>
        }
      />

      <div className="space-y-6">
        <DataTable
          columns={columns}
          data={filteredData as unknown as Record<string, unknown>[]}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Tìm kiếm chi nhánh...",
              }}
              filters={
                <Select
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "active", label: "Hoạt động" },
                    { value: "inactive", label: "Không hoạt động" },
                    { value: "pending", label: "Chờ duyệt" },
                  ]}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-48"
                />
              }
            />
          }
          emptyState={
            <EmptyState
              icon={<FiBox className="w-16 h-16 text-stone-300" />}
              title="Chưa có chi nhánh nào"
              description="Thêm chi nhánh mới để bắt đầu"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải chi nhánh"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title="Thêm chi nhánh mới"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tên chi nhánh"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Mô tả"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Số điện thoại"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Địa chỉ</label>
              <div className="space-y-2">
                <Input
                  placeholder="Số nhà, tên đường"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Phường/Xã"
                    value={formData.address.ward}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, ward: e.target.value },
                      })
                    }
                    required
                  />
                  <Input
                    placeholder="Quận/Huyện"
                    value={formData.address.district}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, district: e.target.value },
                      })
                    }
                    required
                  />
                </div>
                <Input
                  placeholder="Thành phố"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Vĩ độ (Latitude)"
                    type="number"
                    step="any"
                    value={formData.address.coordinates.lat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          coordinates: {
                            ...formData.address.coordinates,
                            lat: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                  />
                  <Input
                    placeholder="Kinh độ (Longitude)"
                    type="number"
                    step="any"
                    value={formData.address.coordinates.lng}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          coordinates: {
                            ...formData.address.coordinates,
                            lng: parseFloat(e.target.value) || 0,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
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
                isLoading={createMutation.isPending}
                className="flex-1"
              >
                Tạo chi nhánh
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

