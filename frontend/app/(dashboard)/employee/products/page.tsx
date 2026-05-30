"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { productService } from "@/services/productService";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import DataTable from "@/components/dashboard/DataTable";
import FilterBar from "@/components/dashboard/FilterBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Badge from "@/components/ui/Badge";
import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { FiPackage } from "react-icons/fi";
import Link from "next/link";

export default function EmployeeProductsPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const limit = 10;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["employee", "products", page, search, statusFilter],
    queryFn: () => productService.getProducts({
      page,
      limit,
      ...(search && { search }),
      ...(statusFilter !== "all" && { status: statusFilter }),
    }),
  });

  const columns = [
    {
      key: "image",
      header: "Hình ảnh",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <div className="w-16 h-16 bg-stone-100 rounded-lg overflow-hidden">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                No Image
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "name",
      header: "Tên sản phẩm",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-xs text-stone-500 line-clamp-1">{product.description}</p>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Danh mục",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <span className="text-sm">
            {typeof product.category === "string"
              ? product.category
              : (product.category && typeof product.category === "object" && "name" in product.category)
                ? (product.category as { name: string }).name
                : "N/A"}
          </span>
        );
      },
    },
    {
      key: "price",
      header: "Giá",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <span className="font-semibold text-emerald-600">
            {formatCurrency(product.price)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <Badge variant={product.isActive ? "success" : "danger"}>
            {product.isActive ? "Hoạt động" : "Không hoạt động"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <Link href={`/products/${product.id}`}>
            <Button variant="ghost" size="sm">
              Xem chi tiết
            </Button>
          </Link>
        );
      },
    },
  ];

  if (!user?.branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Sản phẩm"
          breadcrumbs={[{ label: "Dashboard", href: "/employee" }, { label: "Sản phẩm" }]}
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
        title="Sản phẩm"
        breadcrumbs={[
          { label: "Dashboard", href: "/employee" },
          { label: "Sản phẩm" },
        ]}
      />
      <main className="space-y-6">
        <DataTable
          columns={columns}
          data={(data?.items || []) as unknown as Record<string, unknown>[]}
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
                    { value: "active", label: "Hoạt động" },
                    { value: "inactive", label: "Không hoạt động" },
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
              icon={<FiPackage className="w-16 h-16 text-stone-300" />}
              title="Chưa có sản phẩm nào"
              description="Sản phẩm sẽ hiển thị tại đây"
            />
          }
          pagination={
            data
              ? {
                currentPage: page,
                totalPages: data.totalPages || 1,
                onPageChange: setPage,
              }
              : undefined
          }
        />
        {isError && (
          <ErrorState
            title="Không thể tải sản phẩm"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        )}
      </main>
    </PageShell>
  );
}

