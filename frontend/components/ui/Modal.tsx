"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-white rounded-md shadow-xl z-50 w-full max-w-full mx-4",
          "overflow-y-auto max-h-[90vh]",
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-secondary-200">
            {title && (
              <h2 className="text-xl font-semibold text-secondary-900 tracking-tight">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-secondary-500 hover:text-secondary-700 transition-colors duration-200 p-1 rounded-md hover:bg-secondary-50"
                aria-label="Đóng"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  if (typeof window !== "undefined") {
    return createPortal(content, document.body);
  }

  return null;
}

