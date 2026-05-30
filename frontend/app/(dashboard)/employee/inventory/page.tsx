"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { branchService } from "@/services/branchService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FiBox } from "react-icons/fi";

interface LocalInventoryItem {
  id: string;
  productId: string;
  product?: { id: string; name: string; [key: string]: unknown };
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

export default function EmployeeInventoryPage() {
  const { user } = useAuthStore();
  const branchId = user?.branchId;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isError, refetch } = useQuery<LocalInventoryItem[]>({
    queryKey: ["employee", "inventory", branchId],
    queryFn: async () => {
      const branchInventory = await branchService.getBranchInventory(branchId || "");
      return branchInventory.map((item: any) => {
        const quantity = item.quantity || 0;
        const reservedQuantity = item.reservedQuantity || 0;
        // Calculate availableQuantity correctly: prefer availableQuantity from API, otherwise calculate from quantity - reservedQuantity
        const availableQuantity = item.availableQuantity !== undefined && item.availableQuantity !== null
          ? item.availableQuantity
          : Math.max(0, quantity - reservedQuantity);
        
        return {
          id: item.id || item._id || "",
          productId: item.productId,
          product: item.product || { id: item.productId, name: "N/A" },
          quantity,
          reservedQuantity,
          availableQuantity,
          minStockLevel: item.minStockLevel || 10,
          maxStockLevel: item.maxStockLevel || 100,
          location: item.location || "Kho chính",
          status: availableQuantity > (item.minStockLevel || 10) 
            ? "in_stock" 
            : availableQuantity > 0 
              ? "low_stock" 
              : "out_of_stock",
          lastUpdated: item.updatedAt || item.createdAt || new Date().toISOString(),
        };
      }) as LocalInventoryItem[];
    },
    enabled: !!branchId,
  });

  const filteredData = data?.filter((item) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const productName = item.product?.name?.toLowerCase() || "";
      if (!productName.includes(searchLower)) return false;
    }
    if (statusFilter !== "all") {
      if (statusFilter === "low_stock" && item.status !== "low_stock") return false;
      if (statusFilter === "out_of_stock" && item.status !== "out_of_stock") return false;
      if (statusFilter === "in_stock" && item.status !== "in_stock") return false;
    }
    return true;
  }) || [];

  const lowStockCount = data?.filter((item) => item.status === "low_stock" || item.status === "out_of_stock").length || 0;
  const totalItems = data?.length || 0;
  const totalQuantity = data?.reduce((sum: number, item) => sum + item.quantity, 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return { label: "Còn hàng", variant: "success" as const };
      case "low_stock":
        return { label: "Sắp hết", variant: "warning" as const };
      case "out_of_stock":
        return { label: "Hết hàng", variant: "danger" as const };
      default:
        return { label: status, variant: "default" as const };
    }
  };

  const columns = [
    {
      key: "product",
      header: "Sản phẩm",
      render: (item: LocalInventoryItem) => (
        <div>
          <p className="font-medium">{item.product?.name || "N/A"}</p>
          <p className="text-xs text-stone-500">ID: {item.productId.slice(-8)}</p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Tồn kho",
      render: (item: LocalInventoryItem) => (
        <div>
          <p className="font-semibold">{item.quantity}</p>
          <p className="text-xs text-stone-500">
            Có sẵn: {item.availableQuantity} | Đã đặt: {item.reservedQuantity}
          </p>
        </div>
      ),
    },
    {
      key: "levels",
      header: "Mức tồn kho",
      render: (item: LocalInventoryItem) => (
        <div className="text-sm">
          <p>Tối thiểu: {item.minStockLevel || "N/A"}</p>
          <p>Tối đa: {item.maxStockLevel || "N/A"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: LocalInventoryItem) => {
        const statusInfo = getStatusBadge(item.status);
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
      },
    },
    {
      key: "location",
      header: "Vị trí",
      render: (item: LocalInventoryItem) => (
        <span className="text-sm">{item.location || "N/A"}</span>
      ),
    },
  ];

  if (!branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Tồn kho"
          breadcrumbs={[{ label: "Dashboard", href: "/employee" }, { label: "Tồn kho" }]}
        />
        <EmptyState
          title="Bạn chưa được gán cho chi nhánh nào"
          description="Vui lòng liên hệ quản lý chi nhánh"
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Tồn kho"
        breadcrumbs={[
          { label: "Dashboard", href: "/employee" },
          { label: "Tồn kho" },
        ]}
      />
      <main className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Tổng sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalItems}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Tổng số lượng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalQuantity}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-stone-500">
                Sản phẩm sắp hết
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <DataTable<LocalInventoryItem>
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: "Tìm kiếm sản phẩm...",
              }}
              filters={
                <Select
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "in_stock", label: "Còn hàng" },
                    { value: "low_stock", label: "Sắp hết" },
                    { value: "out_of_stock", label: "Hết hàng" },
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
              title="Chưa có sản phẩm nào trong kho"
              description="Sản phẩm tồn kho sẽ hiển thị tại đây"
            />
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải tồn kho"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}
      </main>
    </PageShell>
  );
}

