"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { productService } from "@/services/productService";
import { warehouseService } from "@/services/warehouseService";
import { branchService } from "@/services/branchService";
import { formatCurrency } from "@/lib/format";
import Image from "next/image";
import { FiArrowLeft } from "react-icons/fi";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/dashboard/DataTable";
import type { Branch } from "@/lib/types";

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { accessToken, isAuthenticated } = useAuthStore();

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productService.getProduct(productId),
    enabled: !!productId && productId !== "undefined" && !!accessToken && isAuthenticated,
  });

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết sản phẩm"
          breadcrumbs={[
            { label: "Dashboard", href: "/admin" },
            { label: "Sản phẩm", href: "/admin/products" },
            { label: "Chi tiết" },
          ]}
        />
        <main className="space-y-6">
          <Card>
            <CardContent className="py-12">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </main>
      </PageShell>
    );
  }

  if (isError || !product) {
    return (
      <PageShell>
        <PageHeader
          title="Chi tiết sản phẩm"
          breadcrumbs={[
            { label: "Dashboard", href: "/admin" },
            { label: "Sản phẩm", href: "/admin/products" },
            { label: "Chi tiết" },
          ]}
        />
        <main className="space-y-6">
          <ErrorState
            title="Không tìm thấy sản phẩm"
            description="Sản phẩm không tồn tại hoặc đã bị xóa"
            action={{ label: "Quay lại", onClick: () => router.push("/admin/products") }}
          />
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Chi tiết sản phẩm"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Sản phẩm", href: "/admin/products" },
          { label: product.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/products")}
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </div>
        }
      />
      <main className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {product.images.map((img: string, index: number) => (
                    <div
                      key={index}
                      className="relative aspect-square bg-secondary-50 rounded-lg overflow-hidden"
                    >
                      <Image
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-square bg-secondary-50 rounded-lg flex items-center justify-center">
                  <span className="text-secondary-400">Không có hình ảnh</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-500">Tên sản phẩm</label>
                <p className="text-lg font-semibold text-secondary-900 mt-1">{product.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-500">Mô tả</label>
                <p className="text-secondary-700 mt-1 whitespace-pre-wrap">{product.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Giá</label>
                  <p className="text-xl font-semibold text-secondary-900 mt-1">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                {product.discount && product.discount > 0 && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Giảm giá</label>
                    <p className="text-xl font-semibold text-red-600 mt-1">
                      -{formatCurrency(product.discount)}
                    </p>
                  </div>
                )}
              </div>

              {/* ADMIN: KHÔNG hiển thị field "Tồn kho" - Product chỉ mô tả, không chứa kho */}
              <div>
                <label className="text-sm font-medium text-secondary-500">Danh mục</label>
                <p className="text-lg font-medium text-secondary-900 mt-1">
                  {typeof product.category === "string"
                    ? product.category
                    : (product.category && typeof product.category === "object" && "name" in product.category)
                      ? (product.category as { name: string }).name
                      : "N/A"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-secondary-500">Trạng thái</label>
                  <div className="mt-1">
                    {product.isActive !== false ? (
                      <Badge variant="success">Hoạt động</Badge>
                    ) : (
                      <Badge variant="danger">Không hoạt động</Badge>
                    )}
                  </div>
                </div>
                {product.isFeatured && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Nổi bật</label>
                    <div className="mt-1">
                      <Badge variant="success">Sản phẩm nổi bật</Badge>
                    </div>
                  </div>
                )}
              </div>

              {product.materials && product.materials.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-secondary-500">Chất liệu</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.materials.map((material: string, index: number) => (
                      <Badge key={index} variant="default">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.colors && product.colors.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-secondary-500">Màu sắc</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {product.colors.map((color: string, index: number) => (
                      <Badge key={index} variant="default">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.model3d && (
                <div>
                  <label className="text-sm font-medium text-secondary-500">Mô hình 3D</label>
                  <p className="text-sm text-secondary-700 mt-1 break-all">{product.model3d}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        {product.dimensions && typeof product.dimensions === 'object' && !Array.isArray(product.dimensions) && (
          <Card>
            <CardHeader>
              <CardTitle>Kích thước & Trọng lượng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {product.dimensions.length && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Chiều dài</label>
                    <p className="text-lg font-medium text-secondary-900 mt-1">
                      {product.dimensions.length} {product.dimensions.unit || "cm"}
                    </p>
                  </div>
                )}
                {product.dimensions.width && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Chiều rộng</label>
                    <p className="text-lg font-medium text-secondary-900 mt-1">
                      {product.dimensions.width} {product.dimensions.unit || "cm"}
                    </p>
                  </div>
                )}
                {product.dimensions.height && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Chiều cao</label>
                    <p className="text-lg font-medium text-secondary-900 mt-1">
                      {product.dimensions.height} {product.dimensions.unit || "cm"}
                    </p>
                  </div>
                )}
                {product.dimensions.weight && (
                  <div>
                    <label className="text-sm font-medium text-secondary-500">Trọng lượng</label>
                    <p className="text-lg font-medium text-secondary-900 mt-1">
                      {product.dimensions.weight} {product.dimensions.unit || "kg"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ADMIN: Tab "Tồn kho theo chi nhánh" - read-only */}
        <Card>
          <CardHeader>
            <CardTitle>Tồn kho theo chi nhánh</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductInventoryByBranch productId={productId} />
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

// Component hiển thị tồn kho theo chi nhánh (read-only)
function ProductInventoryByBranch({ productId }: { productId: string }) {
  type InventoryByBranchItem = Awaited<
    ReturnType<typeof warehouseService.getInventory>
  >[number] & {
    branchId?: string;
    branchName?: string;
  };

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => branchService.getBranches(),
  });

  const { data: allInventory, isLoading } = useQuery<InventoryByBranchItem[]>({
    queryKey: ["product", "inventory", "all-branches", productId],
    queryFn: async () => {
      if (!branches || branches.length === 0) return [];
      // Lấy inventory từ tất cả chi nhánh
      const inventoryPromises = branches.map(async (branch) => {
        try {
          const inventory = await warehouseService.getInventory(branch.id, productId);
          return inventory.map((inv) => ({
            ...inv,
            branchId: branch.id,
            branchName: branch.name,
          }));
        } catch (error) {
          return [];
        }
      });
      const results = await Promise.all(inventoryPromises);
      return results.flat();
    },
    enabled: !!branches && branches.length > 0,
  });

  const columns = [
    {
      key: "branch",
      header: "Chi nhánh",
      render: (item: InventoryByBranchItem) => (
        <span className="font-medium">{item.branchName || "N/A"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Tồn kho",
      render: (item: InventoryByBranchItem) => (
        <div>
          <p className="font-semibold">{item.quantity || 0}</p>
          <p className="text-xs text-secondary-500">
            Có sẵn: {item.availableQuantity || 0} | Đã đặt: {item.reservedQuantity || 0}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Vị trí",
      render: (item: InventoryByBranchItem) => (
        <span className="text-sm">{item.location || "N/A"}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: InventoryByBranchItem) => {
        const available = item.availableQuantity || 0;
        const minLevel = item.minStockLevel || 10;
        const variant = available > minLevel ? "success" : available > 0 ? "warning" : "danger";
        const label = available > minLevel ? "Còn hàng" : available > 0 ? "Sắp hết" : "Hết hàng";
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!allInventory || allInventory.length === 0) {
    return (
      <div className="text-center py-8 text-secondary-500">
        <p>Sản phẩm chưa có tồn kho tại chi nhánh nào</p>
        <p className="text-sm mt-2">💡 Manager sẽ nhập kho khi cần</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary-600">
        📋 <strong>Read-only:</strong> Admin chỉ xem tồn kho, không thể chỉnh sửa. Manager chi nhánh sẽ quản lý tồn kho.
      </p>
      <DataTable<InventoryByBranchItem>
        columns={columns}
        data={allInventory}
        isLoading={isLoading}
      />
    </div>
  );
}

