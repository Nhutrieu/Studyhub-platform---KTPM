"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiMapPin, FiTruck, FiCreditCard, FiCheckCircle, FiTag, FiX } from "react-icons/fi";

import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { branchService } from "@/services/branchService";
import { orderService } from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import { userService } from "@/services/userService";
import { promotionService } from "@/services/promotionService";
import { formatCurrency } from "@/lib/format";
import { notifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { Address } from "@/lib/types";
import type { AxiosError } from "axios";

// Schema for shipping info
const shippingSchema = z.object({
  fullName: z.string().min(2, "Vui lòng nhập họ tên"),
  phone: z.string().min(10, "Số điện thoại không hợp lệ"),
  address: z.string().min(5, "Địa chỉ quá ngắn"),
  city: z.string().min(2, "Vui lòng nhập thành phố"),
  district: z.string().min(2, "Vui lòng nhập quận/huyện"),
  note: z.string().optional(),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;
type AddressWithId = Address & { _id?: string; id?: string };

type StepIndicatorProps = {
  num: number;
  title: string;
  active: boolean;
};

const StepIndicator = ({ num, title, active }: StepIndicatorProps) => (
  <div
    className={cn(
      "flex items-center gap-2",
      active ? "text-primary-600" : "text-secondary-400"
    )}
  >
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2",
        active
          ? "border-primary-600 bg-primary-50"
          : "border-secondary-200 bg-transparent"
      )}
    >
      {num}
    </div>
    <span
      className={cn("font-medium hidden md:inline", active && "font-bold")}
    >
      {title}
    </span>
    {num < 3 && <div className="w-12 h-px bg-secondary-200 hidden md:block" />}
  </div>
);

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, totalAmount, totalItems, clearCart } = useCartStore();
  const { user, isAuthenticated, accessToken, role, _hasHydrated } = useAuthStore();
  const [hasCheckedCart, setHasCheckedCart] = useState(false);

  // Check authentication - redirect to login if not authenticated
  // Wait for hydration before checking
  useEffect(() => {
    if (!_hasHydrated) {
      return; // Wait for state to be restored
    }
    
    if (!isAuthenticated || !accessToken || !user) {
      router.push("/auth/login?redirect=/checkout");
      return;
    }
    // Only allow customer role
    if (role && role !== "customer") {
      router.push("/");
      return;
    }
  }, [_hasHydrated, isAuthenticated, accessToken, user, role, router]);

  // Redirect if cart is empty - only check once on mount, after checking localStorage and store
  useEffect(() => {
    if (hasCheckedCart) return; // Already checked, don't check again
    
    // Check localStorage first (fastest check)
    if (typeof window !== "undefined") {
      try {
        const cartStorage = localStorage.getItem("cart-storage");
        if (cartStorage) {
          const parsed = JSON.parse(cartStorage);
          const storedItems = parsed?.state?.items || [];
          if (storedItems.length > 0) {
            // Cart has items in localStorage, don't redirect
            setHasCheckedCart(true);
            return;
          }
        }
      } catch (error) {
        console.error("Error reading cart from localStorage:", error);
      }
    }
    
    // If no items in localStorage, check store state (may be loading from backend)
    if (items.length > 0) {
      // Cart has items in store, don't redirect
      setHasCheckedCart(true);
      return;
    }
    
    // If still no items, wait a bit for cart to load from backend
    setHasCheckedCart(true);
    const timer = setTimeout(() => {
      // Final check: if still no items, redirect
      if (items.length === 0) {
        toast.info("Giỏ hàng trống, chuyển về trang chủ");
        router.push("/");
      }
    }, 2000); // Wait 2 seconds to allow cart to load from backend
    return () => clearTimeout(timer);
  }, [hasCheckedCart, items.length, router]);

  // Don't render if not hydrated or not authenticated
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken || !user || role !== "customer") {
    return null;
  }

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "pickup">(
    "shipping"
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "COD" | "VNPAY" | "MOMO" | "WALLET"
  >("COD");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedPromotionId, setAppliedPromotionId] = useState<string | undefined>(undefined);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset: resetForm,
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: user?.fullName || user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchService.getBranches(),
  });

  // Lấy danh sách địa chỉ đã lưu
  const { data: savedAddresses } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: async () => {
      try {
        const profile = await userService.getProfile();
        return (profile.addresses || []).map((address) => {
          const typedAddress = address as AddressWithId;
          return {
            ...typedAddress,
            id:
              typedAddress.id ||
              typedAddress._id ||
              `${typedAddress.street}-${typedAddress.district}-${typedAddress.city}`,
          };
        });
      } catch {
        return [];
      }
    },
  });

  // Redirect if cart empty
  // Stock validation is handled by backend during order creation
  const createOrderMutation = useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: async (data) => {
      clearCart();

      // Invalidate promotion queries to refresh usage count
      if (appliedPromotionId) {
        queryClient.invalidateQueries({ queryKey: ["promotions"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      }

      if (paymentMethod === "VNPAY") {
        const orderId = data.id || data._id;
        const amount = data.totalPrice || totalAmount;

        if (!orderId) {
          toast.error("Không thể tạo thanh toán: Thiếu mã đơn hàng");
          router.push("/orders");
          return;
        }

        try {
          notifications.payment.vnpayRedirect();
          const response = await paymentService.createVnpayUrl({
            orderId,
            amount,
            orderDescription: `Thanh toan don hang ${orderId}`,
          });
          window.location.href = response.paymentUrl;
          return;
        } catch (error) {
          const err = error as AxiosError<{ message?: string }>;
          toast.error(
            err?.response?.data?.message ||
            "Không thể tạo thanh toán VNPay, vui lòng thử lại"
          );
        }
      }

      toast.success("Đặt hàng thành công!");
      router.push(`/orders/${data.id || data._id}`);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(
        err?.response?.data?.message || "Đặt hàng thất bại, vui lòng thử lại"
      );
    },
  });

  // Handle apply promotion code
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error("Vui lòng nhập mã giảm giá");
      return;
    }

    setIsApplyingPromo(true);
    try {
      const result = await promotionService.apply({
        code: promoCode.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: totalAmount,
      });

      setAppliedDiscount(result.discount);
      setAppliedPromotionId(result.promotionId);
      toast.success(
        `Áp dụng mã giảm giá thành công! Giảm ${formatCurrency(result.discount)}`
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Mã giảm giá không hợp lệ hoặc đã hết hạn";
      toast.error(errorMessage);
      setPromoCode("");
      setAppliedDiscount(0);
      setAppliedPromotionId(undefined);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const onSubmit = (data: ShippingFormValues) => {
    // Validate Branch Selection if Pickup
    if (deliveryMethod === "pickup" && !selectedBranch) {
      toast.error("Vui lòng chọn chi nhánh nhận hàng");
      return;
    }

    const formattedAddress =
      deliveryMethod === "shipping"
        ? `${data.address}, ${data.district}, ${data.city}`
        : "Nhận tại cửa hàng";

    createOrderMutation.mutate({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        productName: item.product.name,
      })),
      shippingAddress: formattedAddress,
      phone: data.phone || user?.phone || "",
      paymentMethod,
      notes: data.note,
      promotionId: appliedPromotionId,
      promotionCode: appliedPromotionId ? promoCode : undefined,
      discount: appliedDiscount > 0 ? appliedDiscount : undefined, // Send discount amount
    });
  };

  return (
    <div className="min-h-screen bg-secondary-50 pb-20">
      <Section size="sm" className="py-8 md:py-12">
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="flex gap-4 md:gap-8 items-center bg-white px-6 py-3 rounded-full shadow-sm border border-secondary-100">
            <StepIndicator num={1} title="Thông tin" active={step >= 1} />
            <div className="w-8 md:w-16 h-px bg-secondary-200" />
            <StepIndicator num={2} title="Vận chuyển" active={step >= 2} />
            <div className="w-8 md:w-16 h-px bg-secondary-200" />
            <StepIndicator num={3} title="Thanh toán" active={step >= 3} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Form Steps */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* STEP 1: Info & Delivery Method */}
              <Card
                className={cn(
                  "transition-opacity duration-300",
                  step !== 1 && "opacity-60 pointer-events-none grayscale"
                )}
                variant={step === 1 ? "elevated" : "outline"}
              >
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-secondary-900 border-b border-secondary-100 pb-4">
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                      <FiMapPin className="w-5 h-5" />
                    </div>
                    Thông tin giao hàng
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("shipping")}
                      className={cn(
                        "p-4 border-2 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]",
                        deliveryMethod === "shipping"
                          ? "border-primary-600 bg-primary-50 shadow-md ring-1 ring-primary-500/20"
                          : "border-secondary-100 hover:border-secondary-300 bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          deliveryMethod === "shipping"
                            ? "bg-primary-100/50 text-primary-700"
                            : "bg-secondary-50 text-secondary-500"
                        )}
                      >
                        <FiTruck className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <span
                          className={cn(
                            "block font-bold text-sm mb-0.5",
                            deliveryMethod === "shipping"
                              ? "text-primary-900"
                              : "text-secondary-900"
                          )}
                        >
                          Giao hàng tận nơi
                        </span>
                        <span className="text-xs text-secondary-500">
                          Phí vận chuyển tính sau
                        </span>
                      </div>
                      {deliveryMethod === "shipping" && (
                        <FiCheckCircle className="text-primary-600 w-5 h-5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod("pickup")}
                      className={cn(
                        "p-4 border-2 rounded-xl flex items-center gap-4 transition-all hover:scale-[1.02]",
                        deliveryMethod === "pickup"
                          ? "border-primary-600 bg-primary-50 shadow-md ring-1 ring-primary-500/20"
                          : "border-secondary-100 hover:border-secondary-300 bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          deliveryMethod === "pickup"
                            ? "bg-primary-100/50 text-primary-700"
                            : "bg-secondary-50 text-secondary-500"
                        )}
                      >
                        <FiMapPin className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <span
                          className={cn(
                            "block font-bold text-sm mb-0.5",
                            deliveryMethod === "pickup"
                              ? "text-primary-900"
                              : "text-secondary-900"
                          )}
                        >
                          Nhận tại cửa hàng
                        </span>
                        <span className="text-xs text-secondary-500">
                          Miễn phí vận chuyển
                        </span>
                      </div>
                      {deliveryMethod === "pickup" && (
                        <FiCheckCircle className="text-primary-600 w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {deliveryMethod === "pickup" ? (
                    <div className="mb-6 animate-fade-in bg-secondary-50 p-6 rounded-xl border border-secondary-200">
                      <label className="block text-sm font-bold text-secondary-700 mb-3">
                        Chọn chi nhánh nhận hàng
                      </label>
                      <div className="relative">
                        <select
                          className="w-full pl-4 pr-10 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white transition-shadow"
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                          <option value="">-- Chọn chi nhánh gần bạn --</option>
                          {branches?.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} -{" "}
                              {typeof b.address === "string"
                                ? b.address
                                : `${b.address?.street || ""}, ${b.address?.city || ""
                                }`}
                            </option>
                          ))}
                        </select>
                        <FiMapPin className="absolute right-3 top-3.5 text-secondary-400 pointer-events-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fade-in">
                      {/* Hiển thị địa chỉ đã lưu */}
                      {savedAddresses && savedAddresses.length > 0 && (
                        <div className="bg-secondary-50 p-6 rounded-xl border border-secondary-200">
                          <label className="block text-sm font-bold text-secondary-700 mb-4">
                            Địa chỉ đã lưu
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {savedAddresses.map((addr) => (
                              <button
                                key={addr.id || addr._id}
                                type="button"
                                onClick={() => {
                                  setSelectedAddressId(
                                    addr.id || addr._id || ""
                                  );
                                  // Điền dữ liệu địa chỉ vào form
                                  resetForm({
                                    fullName: addr.fullName || addr.name || "",
                                    phone: addr.phone || "",
                                    address: addr.address || addr.street || "",
                                    city: addr.city || "",
                                    district: addr.district || "",
                                    note: "",
                                  });
                                }}
                                className={cn(
                                  "p-4 border-2 rounded-lg text-left transition-all hover:border-primary-500 hover:bg-white",
                                  selectedAddressId === (addr.id || addr._id)
                                    ? "border-primary-600 bg-primary-50 shadow-md"
                                    : "border-secondary-300 bg-white"
                                )}
                              >
                                <div className="font-medium text-secondary-900 mb-1 flex items-center justify-between">
                                  {addr.fullName || addr.name}
                                  {addr.isDefault && (
                                    <Badge
                                      variant="success"
                                      className="text-xs"
                                    >
                                      Mặc định
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-secondary-600">
                                  {addr.phone}
                                </div>
                                <div className="text-xs text-secondary-600 line-clamp-2">
                                  {addr.address || addr.street}, {addr.ward},{" "}
                                  {addr.district}, {addr.city}
                                </div>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedAddressId("")}
                            className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Nhập địa chỉ khác
                          </button>
                        </div>
                      )}

                      {/* Form nhập địa chỉ mới */}
                      {selectedAddressId === "" && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                              label="Họ tên người nhận"
                              placeholder="Nhập họ tên"
                              {...register("fullName")}
                              error={errors.fullName?.message}
                            />
                            <Input
                              label="Số điện thoại"
                              placeholder="VD: 0912345678"
                              {...register("phone")}
                              error={errors.phone?.message}
                            />
                          </div>
                          <Input
                            label="Địa chỉ nhận hàng"
                            placeholder="VD: 123 Nguyễn Văn Linh, Phường..."
                            {...register("address")}
                            error={errors.address?.message}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                              label="Thành phố / Tỉnh"
                              placeholder="VD: Hà Nội"
                              {...register("city")}
                              error={errors.city?.message}
                            />
                            <Input
                              label="Quận / Huyện"
                              placeholder="VD: Cầu Giấy"
                              {...register("district")}
                              error={errors.district?.message}
                            />
                          </div>
                        </>
                      )}

                      <div className="mt-6 pt-6 border-t border-secondary-100">
                        <Input
                          label="Ghi chú đơn hàng (nếu có)"
                          placeholder="Lời nhắn cho shipper..."
                          {...register("note")}
                        />
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="mt-8 text-right">
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        onClick={() => setStep(2)}
                        className="px-8 shadow-lg shadow-primary-500/20"
                      >
                        Tiếp tục thanh toán
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* STEP 2: Payment Method */}
              {step >= 2 && (
                <Card
                  className={cn(
                    "mt-6 transition-all duration-300",
                    step !== 2 && "opacity-60"
                  )}
                  variant={step === 2 ? "elevated" : "outline"}
                >
                  <CardContent className="p-6 md:p-8">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-secondary-900 border-b border-secondary-100 pb-4">
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                        <FiCreditCard className="w-5 h-5" />
                      </div>
                      Phương thức thanh toán
                    </h3>
                    <div className="space-y-3">
                      {[
                        {
                          id: "COD",
                          label: "Thanh toán khi nhận hàng (COD)",
                          icon: "💵",
                        },
                        { id: "VNPAY", label: "VNPay QR (VNPAY)", icon: "🏧" },
                        { id: "MOMO", label: "Ví MoMo", icon: "📱" },
                        {
                          id: "WALLET",
                          label: "Ví điện tử FurniMart",
                          icon: "💳",
                        },
                      ].map((method) => (
                        <label
                          key={method.id}
                          className={cn(
                            "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all hover:bg-secondary-50 relative overflow-hidden",
                            paymentMethod === method.id
                              ? "border-primary-600 bg-primary-50/30 ring-1 ring-primary-500/20"
                              : "border-secondary-200"
                          )}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={method.id}
                            checked={paymentMethod === method.id}
                            onChange={() =>
                              setPaymentMethod(
                                method.id as "COD" | "VNPAY" | "MOMO" | "WALLET"
                              )
                            }
                            className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-2xl">{method.icon}</span>
                          <span className="font-medium text-secondary-900 flex-1">
                            {method.label}
                          </span>
                          {paymentMethod === method.id && (
                            <FiCheckCircle className="text-primary-600 w-6 h-6 animate-scale-in" />
                          )}
                        </label>
                      ))}
                    </div>
                    {step === 2 && (
                      <div className="mt-8 flex justify-between items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setStep(1)}
                          className="text-secondary-500 hover:text-secondary-900"
                        >
                          Quay lại
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          isLoading={createOrderMutation.isPending}
                          className="px-12 shadow-xl shadow-primary-500/30 text-lg py-6 h-auto"
                        >
                          Hoàn tất đặt hàng
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <Card
                variant="elevated"
                className="border-none shadow-2xl shadow-secondary-900/5 overflow-hidden"
              >
                <div className="bg-secondary-900 p-6 text-white">
                  <h3 className="text-lg font-bold text-white">Đơn hàng của bạn</h3>
                  <p className="text-white/90 text-sm font-medium">
                    {items.length} sản phẩm
                  </p>
                </div>
                <CardContent className="p-0">
                  <div className="space-y-0 max-h-100 overflow-y-auto custom-scrollbar">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex gap-4 p-4 hover:bg-secondary-50 transition-colors",
                          idx !== items.length - 1 &&
                          "border-b border-secondary-100"
                        )}
                      >
                        <div className="w-16 h-16 bg-secondary-100 rounded-lg relative shrink-0 border border-secondary-200">
                          {item.product.images?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          )}
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-secondary-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <h4 className="text-sm font-medium line-clamp-2 text-secondary-900 mb-1">
                            {item.product.name}
                          </h4>
                          <p className="text-xs font-bold text-primary-700 bg-primary-50 inline-block px-1.5 py-0.5 rounded">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <div className="p-6 bg-secondary-50 border-t border-secondary-100 space-y-3">
                  {/* Mã giảm giá */}
                  <div className="border-b border-secondary-200 pb-4 mb-3">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Mã giảm giá
                    </label>
                    {appliedDiscount > 0 ? (
                      <div className="flex items-center justify-between gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <FiTag className="text-success w-4 h-4" />
                          <span className="text-sm font-medium text-success">
                            Đã áp dụng mã giảm giá
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoCode("");
                            setAppliedDiscount(0);
                            setAppliedPromotionId(undefined);
                            toast.info("Đã xóa mã giảm giá");
                          }}
                          className="text-secondary-400 hover:text-secondary-600 transition-colors"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập mã giảm giá"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          className="flex-1 text-sm"
                          disabled={isApplyingPromo}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && promoCode.trim()) {
                              handleApplyPromoCode();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleApplyPromoCode}
                          disabled={!promoCode.trim() || isApplyingPromo}
                          isLoading={isApplyingPromo}
                          className="shrink-0"
                        >
                          Áp dụng
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Tạm tính</span>
                    <span className="font-medium text-secondary-900">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-600">Giảm giá</span>
                      <span className="font-medium text-success">
                        -{formatCurrency(appliedDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Vận chuyển</span>
                    <span
                      className={cn(
                        "font-medium",
                        deliveryMethod === "pickup"
                          ? "text-success"
                          : "text-secondary-900"
                      )}
                    >
                      {deliveryMethod === "pickup" ? "Miễn phí" : "Tính sau"}
                    </span>
                  </div>
                  <div className="border-t border-secondary-200 pt-3 mt-2">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-lg text-secondary-900">
                        Tổng cộng
                      </span>
                      <span className="font-bold text-2xl text-primary-600">
                        {formatCurrency(Math.max(0, totalAmount - appliedDiscount))}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="mt-6 flex items-center justify-center gap-2 text-secondary-400 text-xs">
                <FiCheckCircle /> Đảm bảo thanh toán an toàn
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
