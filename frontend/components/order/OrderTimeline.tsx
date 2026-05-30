"use client";

import { Order } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";

interface OrderTimelineProps {
  order: Order;
}

const statusSteps = [
  { key: "pending", label: "Chờ xử lý", icon: FiClock },
  { key: "confirmed", label: "Đã xác nhận", icon: FiCheckCircle },
  { key: "preparing", label: "Đang chuẩn bị", icon: FiClock },
  { key: "ready", label: "Sẵn sàng", icon: FiCheckCircle },
  { key: "shipping", label: "Đang giao", icon: FiClock },
  { key: "delivered", label: "Đã giao", icon: FiCheckCircle },
];

// 0.2: Standardized order status flow
const statusStepsEN = [
  { key: "PENDING_CONFIRMATION", label: "Chờ xác nhận", icon: FiClock },
  { key: "CONFIRMED", label: "Đã xác nhận", icon: FiCheckCircle },
  { key: "PACKING", label: "Đang đóng gói", icon: FiClock },
  { key: "READY_TO_SHIP", label: "Sẵn sàng giao", icon: FiCheckCircle },
  { key: "SHIPPING", label: "Đang giao", icon: FiClock },
  { key: "DELIVERED", label: "Đã giao", icon: FiCheckCircle },
  { key: "COMPLETED", label: "Hoàn tất", icon: FiCheckCircle },
];

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const steps = order.status.includes("_") || order.status === order.status.toUpperCase()
    ? statusStepsEN
    : statusSteps;

  const currentStatus = order.status.toUpperCase();
  const currentIndex = steps.findIndex(
    (step) => step.key.toUpperCase() === currentStatus
  );

  const isCancelled = currentStatus === "CANCELLED" || currentStatus === "cancelled";

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-secondary-900 mb-4 tracking-tight">Trạng thái đơn hàng</h3>
      <div className="relative">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex && !isCancelled;
          const isCurrent = index === currentIndex && !isCancelled;
          const isCancelledStep = isCancelled && index === steps.length - 1;

          const Icon = isCancelledStep ? FiXCircle : step.icon;

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-8 last:pb-0">
              {/* Line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full ${
                    isCompleted ? "bg-primary-600" : "bg-secondary-200"
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 ${
                  isCompleted
                    ? "bg-primary-600 text-white"
                    : isCurrent
                    ? "bg-primary-100 text-primary-700 border-2 border-primary-600"
                    : isCancelledStep
                    ? "bg-error/10 text-error"
                    : "bg-secondary-100 text-secondary-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p
                  className={`font-semibold ${
                    isCompleted || isCurrent
                      ? "text-secondary-900"
                      : isCancelledStep
                      ? "text-error"
                      : "text-secondary-600"
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && order.updatedAt && (
                  <p className="text-xs text-secondary-500 mt-1">
                    {formatDistanceToNow(new Date(order.updatedAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {order.branch && (
        <div className="mt-6 p-4 bg-secondary-50 rounded-md border border-secondary-200">
          <p className="text-sm text-secondary-600 mb-1">Chi nhánh xử lý</p>
          <p className="font-medium text-secondary-900">{order.branch.name}</p>
          {typeof order.branch.address === "string" ? (
            <p className="text-sm text-secondary-600 mt-1">{order.branch.address}</p>
          ) : (
            <p className="text-sm text-secondary-600 mt-1">
              {order.branch.address?.street}, {order.branch.address?.ward}, {order.branch.address?.district}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

