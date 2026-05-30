"use client";

import Badge from "@/components/ui/Badge";
import { Order } from "@/lib/types";

interface OrderStatusBadgeProps {
  status: Order["status"];
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    // 0.2: Standardized order status flow
    PENDING_CONFIRMATION: { label: "Chờ xác nhận", variant: "warning" },
    CONFIRMED: { label: "Đã xác nhận", variant: "success" },
    PACKING: { label: "Đang đóng gói", variant: "warning" },
    READY_TO_SHIP: { label: "Sẵn sàng giao", variant: "info" },
    SHIPPING: { label: "Đang giao", variant: "info" },
    DELIVERED: { label: "Đã giao", variant: "success" },
    COMPLETED: { label: "Hoàn tất", variant: "success" },
    CANCELLED: { label: "Đã hủy", variant: "danger" },
    FAILED_DELIVERY: { label: "Giao thất bại", variant: "danger" },
    RETURNING: { label: "Đang hoàn", variant: "warning" },
    RETURNED: { label: "Đã hoàn", variant: "info" },
    // Legacy statuses for backward compatibility
    pending: { label: "Chờ xử lý", variant: "info" },
    confirmed: { label: "Đã xác nhận", variant: "success" },
    preparing: { label: "Đang chuẩn bị", variant: "warning" },
    ready: { label: "Sẵn sàng", variant: "info" },
    shipping: { label: "Đang giao", variant: "info" },
    delivered: { label: "Đã giao", variant: "success" },
    cancelled: { label: "Đã hủy", variant: "danger" },
    NEW: { label: "Mới", variant: "info" },
    OUT_FOR_DELIVERY: { label: "Đang giao", variant: "info" },
    DELIVERY_FAILED: { label: "Giao thất bại", variant: "danger" },
  };

  const normalized = status.toUpperCase();
  const statusInfo = statusMap[normalized] || statusMap[status] || { label: status, variant: "default" as const };

  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
}

