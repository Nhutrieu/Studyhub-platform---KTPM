"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: "left" | "right";
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = "right",
  size = "md",
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "w-full sm:w-80",
    md: "w-full sm:w-96",
    lg: "w-full sm:w-[28rem]",
    xl: "w-full sm:w-[32rem]",
  };

  const positions = {
    left: "left-0",
    right: "right-0",
  };

  const content = (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "relative bg-white shadow-xl z-50 h-full flex flex-col",
          sizes[size],
          positions[position],
          "transform transition-transform duration-300 ease-in-out"
        )}
      >
        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between p-6 border-b border-secondary-200">
            {title && (
              <h2 className="text-lg font-semibold text-secondary-900 tracking-tight">{title}</h2>
            )}
            <button
              onClick={onClose}
              className="text-secondary-500 hover:text-secondary-700 transition-colors p-1 rounded-md hover:bg-secondary-50"
              aria-label="Đóng"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 w-full max-w-full">{children}</div>
      </div>
    </div>
  );

  if (typeof window !== "undefined") {
    return createPortal(content, document.body);
  }

  return null;
}

