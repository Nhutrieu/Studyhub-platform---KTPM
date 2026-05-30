"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { branchService } from "@/services/branchService";
import { warehouseService } from "@/services/warehouseService";
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
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FiBox, FiAlertTriangle, FiPlus, FiEdit } from "react-icons/fi";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Product } from "@/lib/types";

interface LocalInventoryItem {
  id: string;
  productId: string;
  product?: { id: string; name: string;[key: string]: unknown };
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  location?: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

export default function ManagerInventoryPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const branchId = user?.branchId;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LocalInventoryItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Get all inventory items (warehouse doesn't have branchId, so show all)
  const { data, isLoading, isError, refetch } = useQuery<LocalInventoryItem[]>({
    queryKey: ["manager", "inventory", branchId],
    queryFn: async () => {
      let inventoryItems: LocalInventoryItem[] = [];

      // Try to get inventory from branch service first
      try {
        const branchInventory = await branchService.getBranchInventory(branchId || "");
        if (branchInventory && branchInventory.length > 0) {
          inventoryItems = branchInventory.map((item: any) => {
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
        }
      } catch (error) {
        console.log("Branch inventory not available, trying warehouse service", error);
      }

      // If no branch inventory, try warehouse service
      if (inventoryItems.length === 0) {
        try {
          const warehouseInventory = await warehouseService.getInventory(branchId || undefined);
          inventoryItems = warehouseInventory.map((item) => {
            const quantity = item.quantity || 0;
            const reservedQuantity = item.reservedQuantity || 0;
            // Calculate availableQuantity correctly: prefer availableQuantity from API, otherwise calculate from quantity - reservedQuantity
            const availableQuantity = item.availableQuantity !== undefined && item.availableQuantity !== null
              ? item.availableQuantity
              : Math.max(0, quantity - reservedQuantity);
            
            return {
              id: item.id,
              productId: item.productId,
              product: item.product || { id: item.productId, name: (item as any).productName || "N/A" },
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
              lastUpdated: (item as { updatedAt?: string }).updatedAt || new Date().toISOString(),
            };
          }) as LocalInventoryItem[];
        } catch (error) {
          console.error("Error fetching inventory:", error);
          return [];
        }
      }

      // Encode/Enrich data: If name is "N/A" or missing, try to fetch from product service
      if (inventoryItems.length > 0) {
        const enrichedItems = await Promise.all(
          inventoryItems.map(async (item) => {
            if (!item.product?.name || item.product.name === "N/A") {
              try {
                // Fetch product details to get the name
                const product = await productService.getProduct(item.productId);
                return {
                  ...item,
                  product: { ...item.product, id: product.id, name: product.name },
                };
              } catch (err) {
                // If fetch fails, keep original item
                return item;
              }
            }
            return item;
          })
        );
        return enrichedItems;
      }

      return inventoryItems;
    },
    enabled: !!branchId,
  });

  // Get products for adding to inventory
  const { data: productsData, refetch: refetchProducts } = useQuery({
    queryKey: ["products", "for-inventory"],
    queryFn: () => productService.getProducts({ page: 1, limit: 100, status: "active" }),
    enabled: addProductModalOpen,
  });

  const availableProducts = productsData?.items || [];

  const adjustStockMutation = useMutation({
    mutationFn: ({ itemId, quantity, reason }: { itemId: string; quantity: number; reason?: string }) =>
      warehouseService.adjustStock(itemId, { quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "inventory"] });
      toast.success("Điều chỉnh tồn kho thành công");
      setAdjustModalOpen(false);
      setSelectedItem(null);
      setAdjustQuantity("");
      setAdjustReason("");
    },
    onError: () => {
      toast.error("Không thể điều chỉnh tồn kho");
    },
  });

  const addProductMutation = useMutation({
    mutationFn: ({ productId, productName, quantity, location, minStockLevel, maxStockLevel }: { productId: string; productName: string; quantity: number; location?: string; minStockLevel?: number; maxStockLevel?: number }) =>
      warehouseService.create({
        productId,
        productName,
        quantity,
        location,
        minStockLevel,
        maxStockLevel,
        branchId: branchId || undefined, // CRITICAL: Pass branchId for branch inventory
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "inventory"] });
      toast.success("Đã thêm sản phẩm vào kho");
      setAddProductModalOpen(false);
      setSelectedProduct(null);
      setNewQuantity("");
      setNewLocation("");
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage =
        error?.response?.data?.message || "Không thể thêm sản phẩm vào kho";
      toast.error(errorMessage);
    },
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

  const handleAdjustStock = () => {
    if (!selectedItem || !adjustQuantity) {
      toast.error("Vui lòng nhập số lượng");
      return;
    }
    const quantity = parseInt(adjustQuantity);
    if (isNaN(quantity)) {
      toast.error("Số lượng không hợp lệ");
      return;
    }
    adjustStockMutation.mutate({
      itemId: selectedItem.id,
      quantity,
      reason: adjustReason || undefined,
    });
  };

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
    {
      key: "actions",
      header: "Thao tác",
      render: (item: LocalInventoryItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedItem(item);
            setAdjustQuantity(item.quantity.toString());
            setAdjustModalOpen(true);
          }}
        >
          <FiEdit className="w-4 h-4 mr-1" />
          Điều chỉnh
        </Button>
      ),
    },
  ];

  if (!branchId) {
    return (
      <PageShell>
        <PageHeader
          title="Quản lý tồn kho"
          breadcrumbs={[{ label: "Dashboard", href: "/manager" }, { label: "Tồn kho" }]}
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
        title="Quản lý tồn kho"
        breadcrumbs={[
          { label: "Dashboard", href: "/manager" },
          { label: "Tồn kho" },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={async () => {
              setAddProductModalOpen(true);
              await refetchProducts();
            }}
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Thêm sản phẩm vào kho
          </Button>
        }
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

        {/* Adjust Stock Modal */}
        <Modal
          isOpen={adjustModalOpen}
          onClose={() => {
            setAdjustModalOpen(false);
            setSelectedItem(null);
            setAdjustQuantity("");
            setAdjustReason("");
          }}
          title="Điều chỉnh tồn kho"
        >
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-stone-600 mb-1">Sản phẩm</p>
                <p className="font-medium">{selectedItem.product?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600 mb-1">Tồn kho hiện tại</p>
                <p className="font-semibold text-lg">{selectedItem.quantity}</p>
              </div>
              <Input
                label="Số lượng mới"
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Nhập số lượng"
              />
              <Textarea
                label="Lý do điều chỉnh"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Nhập lý do điều chỉnh (tùy chọn)"
                rows={3}
              />
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdjustModalOpen(false);
                    setSelectedItem(null);
                    setAdjustQuantity("");
                    setAdjustReason("");
                  }}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAdjustStock}
                  isLoading={adjustStockMutation.isPending}
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Product to Inventory Modal */}
        <Modal
          isOpen={addProductModalOpen}
          onClose={() => {
            setAddProductModalOpen(false);
            setSelectedProduct(null);
            setNewQuantity("");
            setNewLocation("");
          }}
          title="Thêm sản phẩm vào kho"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chọn sản phẩm</label>
              <select
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                value={selectedProduct?.id || ""}
                onChange={(e) => {
                  const product = availableProducts.find((p) => p.id === e.target.value);
                  setSelectedProduct(product || null);
                }}
              >
                <option value="">Chọn sản phẩm...</option>
                {availableProducts
                  .filter((p) => !data?.some((item) => item.productId === p.id))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.price?.toLocaleString("vi-VN")} ₫
                    </option>
                  ))}
              </select>
              {productsData && availableProducts.filter((p) => !data?.some((item) => item.productId === p.id)).length === 0 && (
                <p className="text-sm text-stone-500 mt-2">Tất cả sản phẩm đã có trong kho</p>
              )}
            </div>

            {selectedProduct && (
              <>
                {/* MANAGER: Chỉ chọn product để nhập kho, không sửa giá/tên/mô tả */}
                <div className="p-3 bg-secondary-50 rounded-md border border-secondary-200">
                  <p className="text-sm text-stone-600 mb-1">Sản phẩm đã chọn</p>
                  <p className="font-medium text-secondary-900">{selectedProduct.name}</p>
                  <div className="mt-2 text-xs text-secondary-500 space-y-1">
                    <p>Giá: {selectedProduct.price?.toLocaleString("vi-VN")} ₫</p>
                    <p className="text-xs text-secondary-400 italic">
                      💡 Manager chỉ chọn sản phẩm để nhập kho, không thể sửa thông tin sản phẩm
                    </p>
                  </div>
                </div>
                <Input
                  label="Số lượng"
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="Nhập số lượng"
                  min={0}
                  required
                />
                <Input
                  label="Vị trí kho (tùy chọn)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ví dụ: Kho A, Kệ 1"
                />
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddProductModalOpen(false);
                      setSelectedProduct(null);
                      setNewQuantity("");
                      setNewLocation("");
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!selectedProduct || !newQuantity) {
                        toast.error("Vui lòng nhập đầy đủ thông tin");
                        return;
                      }
                      const quantity = parseInt(newQuantity);
                      if (isNaN(quantity) || quantity < 0) {
                        toast.error("Số lượng không hợp lệ");
                        return;
                      }
                      addProductMutation.mutate({
                        productId: selectedProduct.id,
                        productName: selectedProduct.name,
                        quantity,
                        location: newLocation || undefined,
                        minStockLevel: 10, // Default min stock level
                        maxStockLevel: 100, // Default max stock level
                      });
                    }}
                    isLoading={addProductMutation.isPending}
                  >
                    Thêm vào kho
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </main>
    </PageShell>
  );
}

