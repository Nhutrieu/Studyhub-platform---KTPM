/**
 * Notification utility functions
 * Provides consistent notification messages across the application
 */

import { toast } from "react-toastify";

export const notifications = {
  // Auth notifications
  login: {
    success: (userName: string, role: string) => {
      const roleNames: Record<string, string> = {
        admin: "Quản trị viên",
        branch_manager: "Quản lý chi nhánh",
        employee: "Nhân viên",
        shipper: "Người giao hàng",
        customer: "Khách hàng",
      };
      const roleName = roleNames[role] || role;
              toast.success(
                `Đăng nhập thành công! Chào mừng ${userName} (${roleName})`,
                {
                  autoClose: 3000,
                }
              );
    },
    error: (message?: string) => {
      let errorMessage = message || "Đăng nhập thất bại";
      if (message?.includes("401") || message?.includes("Unauthorized")) {
        errorMessage = "Email hoặc mật khẩu không đúng. Vui lòng thử lại.";
      } else if (message?.includes("403") || message?.includes("Forbidden")) {
        errorMessage = "Tài khoản của bạn không có quyền truy cập.";
      } else if (message?.includes("404") || message?.includes("Not Found")) {
        errorMessage = "Không tìm thấy tài khoản. Vui lòng kiểm tra lại email.";
      } else if (message?.includes("network") || message?.includes("Network")) {
        errorMessage = "Lỗi kết nối. Vui lòng kiểm tra kết nối internet của bạn.";
      }
      // Use unique toastId with timestamp to prevent duplicate prevention
      toast.error(errorMessage, {
        autoClose: 4000,
        toastId: `login-error-${Date.now()}-${Math.random()}`,
      });
    },
  },

  register: {
    success: (userName: string) => {
      toast.success(
        `Đăng ký thành công! Chào mừng ${userName} đến với FurniMart`,
        {
          autoClose: 4000,
        }
      );
    },
    error: (message?: string) => {
      let errorMessage = message || "Đăng ký thất bại";
      if (message?.includes("409") || message?.includes("Conflict") || message?.includes("already exists")) {
        errorMessage = "Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.";
      } else if (message?.includes("400") || message?.includes("Bad Request")) {
        errorMessage = "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.";
      } else if (message?.includes("network") || message?.includes("Network")) {
        errorMessage = "Lỗi kết nối. Vui lòng kiểm tra kết nối internet của bạn.";
      } else if (message?.includes("password") || message?.includes("Password")) {
        errorMessage = "Mật khẩu không đủ mạnh. Vui lòng sử dụng mật khẩu có ít nhất 6 ký tự.";
      }
      toast.error(errorMessage, {
        autoClose: 4000,
      });
    },
  },

  // Order notifications
  order: {
    create: {
      success: (orderId: string) => {
        toast.success(
          `Đặt hàng thành công! Mã đơn hàng: ${orderId.substring(0, 8).toUpperCase()}`,
          {
            autoClose: 5000,
          }
        );
      },
      error: (message?: string) => {
        toast.error(
          message || "Không thể đặt hàng. Vui lòng thử lại sau.",
          {
            autoClose: 4000,
          }
        );
      },
    },
    updateStatus: {
      success: (status: string) => {
        const statusMessages: Record<string, string> = {
          PENDING_CONFIRMATION: "Đơn hàng đang chờ xác nhận",
          CONFIRMED: "Đơn hàng đã được xác nhận",
          PACKING: "Đơn hàng đang được đóng gói",
          READY_TO_SHIP: "Đơn hàng đã sẵn sàng giao",
          SHIPPING: "Đơn hàng đang được giao",
          DELIVERED: "Đơn hàng đã được giao thành công",
          COMPLETED: "Đơn hàng đã hoàn tất",
          CANCELLED: "Đơn hàng đã bị hủy",
          FAILED_DELIVERY: "Giao hàng thất bại",
          // Legacy
          PREPARING: "Đơn hàng đang được chuẩn bị",
          READY: "Đơn hàng đã sẵn sàng",
          OUT_FOR_DELIVERY: "Đơn hàng đang được giao",
        };
        toast.success(statusMessages[status] || "Cập nhật trạng thái thành công", {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể cập nhật trạng thái đơn hàng", {
          autoClose: 3000,
        });
      },
    },
    cancel: {
      success: () => {
        toast.success("Đơn hàng đã được hủy thành công", {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể hủy đơn hàng", {
          autoClose: 3000,
        });
      },
    },
    assignShipper: {
      success: (shipperName: string) => {
        toast.success(`Đã phân công shipper: ${shipperName}`, {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể phân công shipper", {
          autoClose: 3000,
        });
      },
    },
  },

  // Payment notifications
  payment: {
    success: (amount: number, method: string) => {
      toast.success(
        `Thanh toán thành công ${amount.toLocaleString("vi-VN")} VND qua ${method}`,
        {
          autoClose: 4000,
        }
      );
    },
    pending: () => {
      toast.info("Thanh toán đang được xử lý...", {
        autoClose: 3000,
      });
    },
    error: (message?: string) => {
      toast.error(
        message || "Thanh toán thất bại. Vui lòng thử lại.",
        {
          autoClose: 4000,
        }
      );
    },
    vnpayRedirect: () => {
      toast.info("Đang chuyển hướng đến VNPAY...", {
        autoClose: 2000,
      });
    },
  },

  // Product notifications
  product: {
    create: {
      success: (productName: string) => {
        toast.success(`Đã tạo sản phẩm "${productName}" thành công`, {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể tạo sản phẩm", {
          autoClose: 3000,
        });
      },
    },
    update: {
      success: (productName: string) => {
        toast.success(`Đã cập nhật sản phẩm "${productName}" thành công`, {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể cập nhật sản phẩm", {
          autoClose: 3000,
        });
      },
    },
    delete: {
      success: () => {
        toast.success("Đã xóa sản phẩm thành công", {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể xóa sản phẩm", {
          autoClose: 3000,
        });
      },
    },
  },

  // Cart notifications
  cart: {
    add: {
      success: (productName: string) => {
        toast.success(`Đã thêm "${productName}" vào giỏ hàng`, {
          autoClose: 2000,
        });
      },
      error: () => {
        toast.error("Không thể thêm sản phẩm vào giỏ hàng", {
          autoClose: 2000,
        });
      },
    },
    update: {
      success: () => {
        toast.success("Đã cập nhật giỏ hàng", {
          autoClose: 2000,
        });
      },
    },
    remove: {
      success: (productName: string) => {
        toast.success(`Đã xóa "${productName}" khỏi giỏ hàng`, {
          autoClose: 2000,
        });
      },
    },
    clear: {
      success: () => {
        toast.info("Đã xóa toàn bộ giỏ hàng", {
          autoClose: 2000,
        });
      },
    },
  },

  // Warehouse/Inventory notifications
  inventory: {
    update: {
      success: () => {
        toast.success("Đã cập nhật tồn kho thành công", {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể cập nhật tồn kho", {
          autoClose: 3000,
        });
      },
    },
    lowStock: (productName: string) => {
      toast.warning(`Cảnh báo: "${productName}" sắp hết hàng!`, {
        autoClose: 5000,
      });
    },
  },

  // User notifications
  user: {
    create: {
      success: (userName: string) => {
        toast.success(`Đã tạo tài khoản "${userName}" thành công`, {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể tạo tài khoản", {
          autoClose: 3000,
        });
      },
    },
    update: {
      success: () => {
        toast.success("Đã cập nhật thông tin thành công", {
          autoClose: 3000,
        });
      },
      error: () => {
        toast.error("Không thể cập nhật thông tin", {
          autoClose: 3000,
        });
      },
    },
  },

  // Chat notifications
  chat: {
    messageSent: () => {
      toast.success("Đã gửi tin nhắn", {
        autoClose: 2000,

      });
    },
    messageError: () => {
      toast.error("Không thể gửi tin nhắn", {
        autoClose: 2000,
      });
    },
    assigned: () => {
      toast.success("Đã nhận chat", {
        autoClose: 2000,
      });
    },
  },

  // Upload notifications
  upload: {
    success: (fileName: string) => {
      toast.success(`Đã upload "${fileName}" thành công`, {
        autoClose: 3000,
      });
    },
    error: () => {
      toast.error("Upload thất bại. Vui lòng thử lại.", {
        autoClose: 3000,
      });
    },
    multipleSuccess: (count: number) => {
      toast.success(`Đã upload ${count} file thành công`, {
        autoClose: 3000,
      });
    },
  },

  // General notifications
  general: {
    success: (message: string) => {
      toast.success(message, {
        autoClose: 3000,
      });
    },
    error: (message: string) => {
      toast.error(message, {
        autoClose: 4000,
      });
    },
    info: (message: string) => {
      toast.info(message, {
        autoClose: 3000,
      });
    },
    warning: (message: string) => {
      toast.warning(message, {
        autoClose: 4000,
      });
    },
  },
};

