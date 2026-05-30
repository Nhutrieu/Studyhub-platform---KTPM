"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { productService } from "@/services/productService";
import { categoryService } from "@/services/categoryService";
import PageShell from "@/components/layouts/PageShell";
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
import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { FiPackage, FiPlus, FiUpload, FiX, FiImage, FiFile, FiEdit, FiTrash2 } from "react-icons/fi";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { toast } from "react-toastify";
import { uploadService } from "@/services/uploadService";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    discount: 0,
    // ADMIN: Không có stock - Product chỉ mô tả, không chứa kho
    categoryId: "",
    category: "",
    materials: [] as string[],
    colors: [] as string[],
    images: [] as string[],
    model3d: "",
    isActive: true,
    isFeatured: false,
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploading3D, setUploading3D] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [model3DFile, setModel3DFile] = useState<File | null>(null);
  const limit = 10;

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getCategories(),
    enabled: !!accessToken && isAuthenticated,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "products", page, search, statusFilter],
    queryFn: () => productService.getProducts({
      page,
      limit,
      ...(search && { search }),
      // For admin, send status filter (including "all" to see all products)
      status: statusFilter === "all" ? "all" : statusFilter,
    }),
    enabled: !!accessToken && isAuthenticated,
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Product>) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Đã tạo sản phẩm thành công");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      logger.apiError(error, "Create Product");
      
      let errorMessage = "Không thể tạo sản phẩm";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string | string[]; error?: string | string[] } } };
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          if (data.message) {
            errorMessage = Array.isArray(data.message) ? data.message.join(", ") : data.message;
          } else if (data.error) {
            errorMessage = Array.isArray(data.error) ? data.error.join(", ") : data.error;
          }
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Đã cập nhật sản phẩm thành công");
      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: unknown) => {
      logger.apiError(error, "Update Product");
      let errorMessage = "Không thể cập nhật sản phẩm";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string | string[]; error?: string | string[] } } };
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          if (data.message) {
            errorMessage = Array.isArray(data.message) ? data.message.join(", ") : data.message;
          } else if (data.error) {
            errorMessage = Array.isArray(data.error) ? data.error.join(", ") : data.error;
          }
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Đã xóa sản phẩm thành công");
    },
    onError: (error: unknown) => {
      logger.apiError(error, "Delete Product");
      let errorMessage = "Không thể xóa sản phẩm";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string | string[]; error?: string | string[] } } };
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          if (data.message) {
            errorMessage = Array.isArray(data.message) ? data.message.join(", ") : data.message;
          } else if (data.error) {
            errorMessage = Array.isArray(data.error) ? data.error.join(", ") : data.error;
          }
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      discount: 0,
      // ADMIN: Không có stock
      categoryId: "",
      category: "",
      materials: [],
      colors: [],
      images: [],
      model3d: "",
      isActive: true,
      isFeatured: false,
    });
    setImageFiles([]);
    setModel3DFile(null);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadingImages(true);
    try {
      const results = await uploadService.uploadImages(fileArray);
      const urls = results.map((r) => {
        // Convert relative URL to full URL if needed
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";
        return r.url.startsWith("http") ? r.url : `${baseUrl}${r.url}`;
      });
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...urls],
      }));
      setImageFiles((prev) => [...prev, ...fileArray]);
      toast.success(`Đã upload ${urls.length} ảnh thành công`);
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string; response?: { data?: { message?: string } } })?.message || 
                           (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 
                           "Không thể upload ảnh";
      toast.error(errorMessage);
      logger.error("Upload images error:", error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handle3DUpload = async (file: File | null) => {
    if (!file) return;

    setUploading3D(true);
    try {
      const result = await uploadService.uploadFile(file);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";
      const url = result.url.startsWith("http") ? result.url : `${baseUrl}${result.url}`;
      setFormData((prev) => ({
        ...prev,
        model3d: url,
      }));
      setModel3DFile(file);
      toast.success("Đã upload file 3D thành công");
    } catch (error: unknown) {
      const errorMessage = (error as { message?: string; response?: { data?: { message?: string } } })?.message || 
                           (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 
                           "Không thể upload file 3D";
      toast.error(errorMessage);
      logger.error("Upload 3D file error:", error);
    } finally {
      setUploading3D(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      discount: product.discount || 0,
      // ADMIN: Không có stock - Product chỉ mô tả, không chứa kho
      categoryId: typeof product.category === 'string' ? '' : (product.category?.id || product.categoryId || ''),
      category: typeof product.category === 'string' ? product.category : (product.category?.name || ''),
      materials: product.materials || [],
      colors: product.colors || [],
      images: product.images || [],
      model3d: product.model3d || "",
      isActive: product.status === "active",
      isFeatured: product.isFeatured || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || formData.name.trim() === "") {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (!formData.description || formData.description.trim() === "") {
      toast.error("Vui lòng nhập mô tả sản phẩm");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toast.error("Vui lòng nhập giá sản phẩm hợp lệ");
      return;
    }
    // ADMIN: Không validate stock - Product chỉ mô tả, không chứa kho
    if (!formData.categoryId || formData.categoryId.trim() === "") {
      toast.error("Vui lòng chọn danh mục");
      return;
    }
    
    const selectedCategory = categories?.find((c) => c.id === formData.categoryId);
    if (!selectedCategory) {
      toast.error("Danh mục không hợp lệ");
      return;
    }
    
    // Build submit data according to CreateProductDto
    // ADMIN: Không gửi stock - Product chỉ mô tả, không chứa kho
    const submitData: Partial<Product> & {
      categoryId: string;
      category: string;
      status?: string;
    } = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      // ADMIN: Không gửi stock - Product chỉ mô tả, không chứa kho
      categoryId: formData.categoryId,
      category: selectedCategory.name,
      images: formData.images.filter((img) => img.trim() !== ""),
      isFeatured: formData.isFeatured || false,
      status: formData.isActive ? "active" : "inactive",
    };
    
    // Optional fields - only include if they have values
    if (formData.discount && formData.discount > 0) {
      submitData.discount = Number(formData.discount);
    }
    if (formData.materials && formData.materials.length > 0) {
      submitData.materials = formData.materials.filter((m) => m.trim() !== "");
    }
    if (formData.colors && formData.colors.length > 0) {
      submitData.colors = formData.colors.filter((c) => c.trim() !== "");
    }
    // Only include model3d if it has a value
    if (formData.model3d && formData.model3d.trim() !== "") {
      submitData.model3d = formData.model3d.trim();
    }
    
    logger.log("Submitting product data:", submitData);
    
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const columns = [
    {
      key: "image",
      header: "Hình ảnh",
      render: (item: Record<string, unknown>) => {
        const product = item as unknown as Product;
        return (
          <div className="w-16 h-16 bg-secondary-50 rounded-md overflow-hidden">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-secondary-400 text-xs">
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
            <p className="font-medium text-secondary-900">{product.name}</p>
            <p className="text-xs text-secondary-500 line-clamp-1">{product.description}</p>
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
              : (product.category as { name?: string })?.name || "N/A"}
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
          <span className="font-medium text-secondary-900">
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
        // Check both status and isActive for compatibility
        const isActive = product.status === "active" || (product.isActive !== false && product.status !== "inactive");
        return (
          <Badge variant={isActive ? "success" : "danger"}>
            {isActive ? "Hoạt động" : "Không hoạt động"}
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(product)}
              className="text-primary-600 hover:text-primary-700"
            >
              <FiEdit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(product)}
              className="text-error-600 hover:text-error-700"
            >
              <FiTrash2 className="w-4 h-4" />
            </Button>
            <Link href={`/admin/products/${product.id}`} prefetch={false}>
              <Button variant="ghost" size="sm">
                Xem chi tiết
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Quản lý sản phẩm"
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Sản phẩm" },
        ]}
        actions={
          <Button 
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Thêm sản phẩm
          </Button>
        }
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
              icon={<FiPackage className="w-16 h-16 text-secondary-300" />}
              title="Chưa có sản phẩm nào"
              description="Thêm sản phẩm mới để bắt đầu"
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

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
            resetForm();
          }}
          title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tên sản phẩm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Mô tả"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Giá (₫)"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
                min={0}
              />
              <Input
                label="Giảm giá (₫)"
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                min={0}
              />
            </div>
            {/* ADMIN: KHÔNG có field số lượng - Product chỉ mô tả, không chứa kho */}
            <div>
                <label className="block text-sm font-medium mb-1">Danh mục</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => {
                    const selected = categories?.find((c) => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      categoryId: e.target.value,
                      category: selected?.name || "",
                    });
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hình ảnh sản phẩm</label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="image-upload"
                    className="flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <FiUpload className="w-4 h-4" />
                    <span className="text-sm">Chọn ảnh</span>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                  {uploadingImages && (
                    <span className="text-sm text-stone-500">Đang upload...</span>
                  )}
                </div>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border border-stone-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-stone-500">
                  Hoặc nhập URL (mỗi URL một dòng):
                </div>
                <textarea
                  value={formData.images.join("\n")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      images: e.target.value.split("\n").filter((url) => url.trim() !== ""),
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mô hình 3D</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="3d-upload"
                    className="flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <FiFile className="w-4 h-4" />
                    <span className="text-sm">Chọn file 3D (GLB, GLTF, OBJ...)</span>
                  </label>
                  <input
                    id="3d-upload"
                    type="file"
                    accept=".glb,.gltf,.obj,.fbx,.dae,.3ds,.blend,.stl"
                    onChange={(e) => handle3DUpload(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={uploading3D}
                  />
                  {uploading3D && (
                    <span className="text-sm text-stone-500">Đang upload...</span>
                  )}
                </div>
                {formData.model3d && (
                  <div className="flex items-center gap-2 p-2 bg-stone-50 rounded">
                    <FiFile className="w-4 h-4 text-stone-600" />
                    <span className="text-sm flex-1 truncate">{model3DFile?.name || formData.model3d}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, model3d: "" }));
                        setModel3DFile(null);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="text-xs text-stone-500">
                  Hoặc nhập URL file 3D:
                </div>
                <Input
                  value={formData.model3d}
                  onChange={(e) => setFormData({ ...formData, model3d: e.target.value })}
                  placeholder="https://example.com/model.glb"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isFeatured" className="text-sm">
                  Sản phẩm nổi bật
                </label>
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
                isLoading={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {editingProduct ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}

