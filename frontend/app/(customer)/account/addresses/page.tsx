"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { userService } from "@/services/userService";
import { addressSchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import PageShell from "@/components/layouts/PageShell";
import PageHeader from "@/components/layouts/PageHeader";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { toast } from "react-toastify";
import { FiMapPin, FiEdit, FiTrash2, FiPlus, FiCheck } from "react-icons/fi";
import { Address, User } from "@/lib/types";
import type { AxiosError } from "axios";

type AddressForm = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const {
    data: addresses,
    isLoading,
    isError,
    refetch,
  } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: async () => {
      try {
        // Try to get addresses from profile endpoint
        const profile = await userService.getProfile();
        return ((profile as User & { addresses?: Address[] })?.addresses ||
          []) as Address[];
      } catch {
        return [];
      }
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      isDefault: false,
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: (
      data: Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">
    ) => userService.addAddress(data),
    onSuccess: (address) => {
      // Only show success if we actually got an address back
      if (address && address.id) {
        queryClient.invalidateQueries({ queryKey: ["addresses"] });
        queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
        toast.success("Thêm địa chỉ thành công");
        setIsModalOpen(false);
        reset();
      } else {
        // If address was added but we couldn't parse it, still invalidate and show success
        queryClient.invalidateQueries({ queryKey: ["addresses"] });
        queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
        toast.success("Thêm địa chỉ thành công");
        setIsModalOpen(false);
        reset();
      }
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      console.error("Create address error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể thêm địa chỉ";
      toast.error(errorMessage);
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Address> }) =>
      userService.updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      toast.success("Cập nhật địa chỉ thành công");
      setIsModalOpen(false);
      setEditingAddress(null);
      reset();
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể cập nhật địa chỉ";
      toast.error(message);
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => userService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      toast.success("Xóa địa chỉ thành công");
    },
    onError: () => {
      toast.error("Không thể xóa địa chỉ");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => userService.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      toast.success("Đặt địa chỉ mặc định thành công");
    },
    onError: () => {
      toast.error("Không thể đặt địa chỉ mặc định");
    },
  });

  const onSubmit = (data: AddressForm) => {
    // Backend AddressDto requires: name, phone, street, ward, district, city, isDefault
    const addressData: Omit<
      Address,
      "id" | "userId" | "createdAt" | "updatedAt"
    > = {
      name: data.fullName,
      phone: data.phone,
      street: data.address,
      ward: data.ward,
      district: data.district,
      city: data.city,
      isDefault: data.isDefault || false,
    };
    if (editingAddress && (editingAddress.id || editingAddress._id)) {
      const addressId = String(editingAddress.id || editingAddress._id);
      if (!addressId) {
        toast.error("Không tìm thấy ID địa chỉ");
        return;
      }
      updateAddressMutation.mutate({
        id: addressId,
        data: addressData,
      });
    } else {
      createAddressMutation.mutate(addressData);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress({
      ...address,
      id: address.id || address._id,
    });
    // Reset form với dữ liệu địa chỉ cũ
    reset({
      fullName: address.fullName || address.name || "",
      phone: address.phone || "",
      address: (address.address || address.street || "") as string,
      ward: address.ward || "",
      district: address.district || "",
      city: address.city || "",
      isDefault: address.isDefault || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
      deleteAddressMutation.mutate(id);
    }
  };

  const handleNew = () => {
    setEditingAddress(null);
    reset({
      fullName: "",
      phone: "",
      address: "",
      ward: "",
      district: "",
      city: "",
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Địa chỉ của tôi"
        breadcrumbs={[
          { label: "Trang chủ", href: "/" },
          { label: "Tài khoản", href: "/account" },
          { label: "Địa chỉ" },
        ]}
        actions={
          <Button variant="primary" onClick={handleNew}>
            <FiPlus className="w-4 h-4 mr-2" />
            Thêm địa chỉ
          </Button>
        }
      />
      <main className="space-y-6 pb-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải địa chỉ"
            description="Vui lòng thử lại sau"
            action={{ label: "Thử lại", onClick: () => refetch() }}
          />
        ) : !addresses || addresses.length === 0 ? (
          <EmptyState
            icon={<FiMapPin className="w-16 h-16 text-secondary-300" />}
            title="Bạn chưa có địa chỉ nào"
            description="Thêm địa chỉ để thuận tiện hơn khi đặt hàng"
            action={{ label: "Thêm địa chỉ", onClick: handleNew }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address: Address, idx: number) => (
              <Card
                key={address.id || address._id || `address-${idx}`}
                className={
                  address.isDefault ? "border-2 border-primary-500" : ""
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {address.fullName}
                        </h3>
                        {address.isDefault && (
                          <Badge variant="success" className="text-xs">
                            <FiCheck className="w-3 h-3 mr-1" />
                            Mặc định
                          </Badge>
                        )}
                      </div>
                      <p className="text-secondary-600 mb-1">{address.phone}</p>
                      <p className="text-secondary-600">
                        {address.address || address.street}, {address.ward},{" "}
                        {address.district}, {address.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const addressId =
                            (address as Address).id || (address as Address)._id;
                          if (addressId && typeof addressId === "string") {
                            setDefaultMutation.mutate(addressId);
                          }
                        }}
                        isLoading={setDefaultMutation.isPending}
                      >
                        Đặt mặc định
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(address)}
                    >
                      <FiEdit className="w-4 h-4 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const addressId =
                          (address as Address).id || (address as Address)._id;
                        if (addressId) handleDelete(addressId);
                      }}
                      isLoading={deleteAddressMutation.isPending}
                    >
                      <FiTrash2 className="w-4 h-4 mr-1" />
                      Xóa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAddress(null);
            reset();
          }}
          title={editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ"}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Họ và tên"
              {...register("fullName")}
              error={errors.fullName?.message}
            />
            <Input
              label="Số điện thoại"
              type="tel"
              {...register("phone")}
              error={errors.phone?.message}
            />
            <Input
              label="Địa chỉ (Số nhà, tên đường)"
              {...register("address")}
              error={errors.address?.message}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phường/Xã"
                {...register("ward")}
                error={errors.ward?.message}
              />
              <Input
                label="Quận/Huyện"
                {...register("district")}
                error={errors.district?.message}
              />
            </div>
            <Input
              label="Thành phố"
              {...register("city")}
              error={errors.city?.message}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                {...register("isDefault")}
                className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="isDefault" className="text-sm text-secondary-700">
                Đặt làm địa chỉ mặc định
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={
                  createAddressMutation.isPending ||
                  updateAddressMutation.isPending
                }
              >
                {editingAddress ? "Cập nhật" : "Thêm"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingAddress(null);
                  reset();
                }}
              >
                Hủy
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}
