"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { branchService } from "@/services/branchService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Branch } from "@/lib/types";
import { toast } from "react-toastify";
import { FiSave } from "react-icons/fi";

export default function ManagerSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const branchId = user?.branchId;

  const { data: branch, isLoading } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: () => branchService.getMyBranch(),
    enabled: !!branchId,
  });

  const [formData, setFormData] = useState<Partial<Branch>>({
    name: branch?.name || "",
    phone: branch?.phone || "",
    email: branch?.email || "",
    address: typeof branch?.address === 'string' ? branch.address : undefined,
  });

  const updateBranchMutation = useMutation({
    mutationFn: (data: Partial<Branch>) => branchService.update(branchId || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch", branchId] });
      toast.success("Cập nhật thông tin chi nhánh thành công");
    },
    onError: () => {
      toast.error("Không thể cập nhật thông tin chi nhánh");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error("Bạn chưa được gán cho chi nhánh nào");
      return;
    }
    updateBranchMutation.mutate(formData);
  };

  if (!branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Cài đặt"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Cài đặt" }]}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-stone-500">
              <p className="text-lg font-medium mb-2">Bạn chưa được gán cho chi nhánh nào</p>
              <p className="text-sm">Vui lòng liên hệ quản trị viên để được gán chi nhánh.</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Cài đặt"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Cài đặt" }]}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-stone-500">Đang tải...</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Cài đặt"
        breadcrumbs={[
          { label: "Dashboard", href: "/manager" },
          { label: "Cài đặt" },
        ]}
      />
      <main className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chi nhánh</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Tên chi nhánh"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên chi nhánh"
                required
              />

              <Input
                label="Số điện thoại"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Nhập số điện thoại"
              />

              <Input
                label="Email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Nhập email"
              />

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Địa chỉ
                </label>
                <textarea
                  value={typeof formData.address === 'string' ? formData.address : ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Nhập địa chỉ chi nhánh"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updateBranchMutation.isPending}
                >
                  <FiSave className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-stone-600">Họ tên</p>
                <p className="font-medium">{user?.fullName || user?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600">Email</p>
                <p className="font-medium">{user?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600">Vai trò</p>
                <p className="font-medium">Quản lý chi nhánh</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

