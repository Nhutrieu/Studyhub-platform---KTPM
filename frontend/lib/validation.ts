import { z } from "zod";

const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu."),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "Tên không được để trống"),
  lastName: z.string().min(1, "Họ không được để trống"),
  email: z
    .string()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
  phone: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Allow empty
      return phoneRegex.test(val) && val.length === 10;
    }, "Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số."),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
    .regex(/[a-zA-Z]/, "Mật khẩu phải chứa chữ.")
    .regex(/[0-9]/, "Mật khẩu phải chứa số."),
  confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  gender: z.enum(["male", "female"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu nhập lại không khớp.",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
});

// --- Keeping existing schemas below for compatibility ---

export const addressSchema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(10, "Số điện thoại không hợp lệ"),
  address: z.string().min(5, "Địa chỉ phải có ít nhất 5 ký tự"),
  ward: z.string().min(1, "Phường/Xã không được để trống"),
  district: z.string().min(1, "Quận/Huyện không được để trống"),
  city: z.string().min(1, "Thành phố không được để trống"),
  isDefault: z.boolean(),
});

export const checkoutSchema = z.object({
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(10, "Số điện thoại không hợp lệ"),
  street: z.string().min(5, "Địa chỉ phải có ít nhất 5 ký tự"),
  ward: z.string().min(1, "Phường/Xã không được để trống"),
  district: z.string().min(1, "Quận/Huyện không được để trống"),
  city: z.string().min(1, "Thành phố không được để trống"),
  paymentMethod: z.enum(["COD", "WALLET", "VNPAY", "MOMO", "ZALOPAY", "STRIPE", "cod", "stripe", "momo", "vnpay"]),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm không được để trống"),
  description: z.string().min(10, "Mô tả phải có ít nhất 10 ký tự"),
  price: z.number().min(0, "Giá phải lớn hơn 0"),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  material: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.number().optional(),
  images: z.array(z.string()).min(1, "Vui lòng thêm ít nhất 1 hình ảnh"),
  modelUrl: z.string().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  rating: z.number().min(1).max(5),
  comment: z.string()
    .min(10, "Nhận xét phải có ít nhất 10 ký tự")
    .max(100, "Nhận xét không được vượt quá 100 ký tự")
    .refine((val) => val.trim().length >= 10, {
      message: "Nhận xét phải có ít nhất 10 ký tự",
    }),
});

export const disputeSchema = z.object({
  orderId: z.string().min(1, "Vui lòng chọn đơn hàng").refine((val) => val.trim() !== "", {
    message: "Vui lòng chọn đơn hàng",
  }),
  type: z.enum([
    // Backend types
    "quality", "damage", "missing", "wrong_item", "delivery", "payment", "other",
    // Legacy types for compatibility
    "return", "warranty", "assembly"
  ], {
    errorMap: () => ({ message: "Vui lòng chọn loại yêu cầu" }),
  }),
  reason: z.string().optional(), // Optional in form, will be filled from description if empty
  description: z.string()
    .min(20, "Mô tả chi tiết phải có ít nhất 20 ký tự")
    .max(100, "Mô tả không được vượt quá 100 ký tự")
    .refine((val) => val.trim().length >= 20, {
      message: "Mô tả chi tiết phải có ít nhất 20 ký tự",
    }),
  images: z.array(z.string().url()).optional(), // Evidence images
});

