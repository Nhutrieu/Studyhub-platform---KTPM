"use client";

import { useState } from "react";
import Image from "next/image";
import { OrderItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { FiPlus, FiMinus } from "react-icons/fi";
import { orderService } from "@/services/orderService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";

interface OrderItemsTableProps {
  items: OrderItem[];
  showImage?: boolean;
  orderId?: string;
  orderStatus?: string;
  canEdit?: boolean; // Allow editing quantity
  onReviewClick?: (productId: string, productName: string) => void; // Callback for review button
  unreviewedProductIds?: Set<string>; // Set of product IDs that haven't been reviewed
  isLoadingUnreviewed?: boolean; // Whether the unreviewed products query is loading
  unreviewedProductsData?: Array<{ productId: string; productName: string; quantity: number; image?: string }>; // The actual data from query to check if query completed successfully
}

export default function OrderItemsTable({ 
  items, 
  showImage = true, 
  orderId, 
  orderStatus, 
  canEdit,
  onReviewClick,
  unreviewedProductIds,
  isLoadingUnreviewed = false,
  unreviewedProductsData,
}: OrderItemsTableProps) {
  const queryClient = useQueryClient();
  
  // Check if order can be edited (PENDING_CONFIRMATION or CONFIRMED)
  const canEditQuantity = canEdit !== false && orderId && orderStatus && (
    orderStatus === "PENDING_CONFIRMATION" || 
    orderStatus === "pending" || 
    orderStatus === "CONFIRMED" || 
    orderStatus === "confirmed"
  );

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => 
      orderService.updateItemQuantity(orderId!, productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      toast.success("Đã cập nhật số lượng");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể cập nhật số lượng");
    },
  });
  // Filter valid items - must have quantity and price at minimum
  const validItems = items?.filter(item =>
    item &&
    typeof item.quantity === 'number' &&
    typeof item.price === 'number' &&
    (item.productId || item.product || item.productName)
  ) || [];

  if (!items || items.length === 0 || validItems.length === 0) {
    return <div className="text-center py-8 text-secondary-500">Không có sản phẩm nào</div>;
  }

  return (
    <div className="w-full max-w-full">
      <table className="w-full">
        <thead>
          <tr className="border-b border-secondary-200">
            {showImage && <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Hình ảnh</th>}
            <th className="text-left py-3 px-4 text-sm font-medium text-secondary-600">Sản phẩm</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-600">Số lượng</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-600">Giá</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-secondary-600">Tổng</th>
            {onReviewClick && orderStatus && (orderStatus.toUpperCase() === "DELIVERED" || orderStatus.toUpperCase() === "COMPLETED") && (
              <th className="text-center py-3 px-4 text-sm font-medium text-secondary-600">Thao tác</th>
            )}
          </tr>
        </thead>
        <tbody>
          {validItems.map((item, index) => (
            <tr key={item.id || `item-${index}-${item.productId || item.productName || index}`} className="border-b border-secondary-100 hover:bg-secondary-50 transition-colors duration-200">
              {showImage && (
                <td className="py-3 px-4">
                  <div className="w-16 h-16 relative bg-secondary-50 rounded-md overflow-hidden">
                    {item.product?.images?.[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product?.name || item.productName || "Product"}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                </td>
              )}
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-secondary-900">{item.product?.name || item.productName || "N/A"}</p>
                  {item.product?.category && (
                    <p className="text-xs text-secondary-500 mt-1">
                      {typeof item.product.category === "string"
                        ? item.product.category
                        : (item.product.category && typeof item.product.category === "object" && "name" in item.product.category)
                          ? (item.product.category as { name: string }).name
                          : "N/A"}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                {canEditQuantity ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateQuantityMutation.mutate({
                            productId: item.productId?.toString() || "",
                            quantity: item.quantity - 1,
                          });
                        }
                      }}
                      disabled={updateQuantityMutation.isPending || item.quantity <= 1}
                    >
                      <FiMinus className="w-4 h-4" />
                    </Button>
                    <span className="text-secondary-900 font-medium min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        updateQuantityMutation.mutate({
                          productId: item.productId?.toString() || "",
                          quantity: item.quantity + 1,
                        });
                      }}
                      disabled={updateQuantityMutation.isPending}
                    >
                      <FiPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-secondary-900">{item.quantity}</span>
                )}
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-secondary-600">{formatCurrency(item.price)}</span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="font-medium text-secondary-900">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </td>
              {onReviewClick && orderStatus && (orderStatus.toUpperCase() === "DELIVERED" || orderStatus.toUpperCase() === "COMPLETED") && (
                <td className="py-3 px-4 text-center">
                  {(() => {
                    // Normalize productId to string for consistent comparison
                    const productId = String(
                      item.productId?.toString() 
                      || item.productId 
                      || item.product?.id?.toString()
                      || item.product?.id
                      || item.product?._id?.toString()
                      || item.product?._id
                      || ""
                    );
                    
                    if (!productId || productId === "undefined" || productId === "null" || productId === "") {
                      return null; // Don't show button if we can't identify the product
                    }
                    
                    // IMPORTANT: Only mark as reviewed if:
                    // 1. Query is done (not loading)
                    // 2. Query returned data (successful query, not error) AND is an array
                    // 3. We have a valid productId
                    // 4. Query returned a non-empty array (meaning query succeeded and has data)
                    // 5. productId is NOT in the unreviewed list (this specific product was reviewed)
                    // 
                    // NOTE: We do NOT mark as reviewed if query returns empty array []
                    // because empty array could mean:
                    // - All products are reviewed (correct case)
                    // - Query failed or order not DELIVERED (wrong case - would show false "Đã đánh giá")
                    // To be safe, we only mark as reviewed when we have explicit confirmation
                    // that the product is NOT in the unreviewed list
                    const hasValidProductId = productId && productId !== "undefined" && productId !== "null" && productId !== "";
                    const queryHasData = unreviewedProductsData !== undefined && unreviewedProductsData !== null;
                    const querySucceeded = !isLoadingUnreviewed 
                      && queryHasData
                      && Array.isArray(unreviewedProductsData);
                    
                    // Only mark as reviewed if:
                    // - Query succeeded
                    // - Query returned non-empty array (has data to compare)
                    // - productId is valid
                    // - productId is NOT in unreviewed list (explicitly reviewed)
                    const isReviewed = querySucceeded
                      && hasValidProductId
                      && unreviewedProductIds
                      && unreviewedProductsData.length > 0 // Must have data to compare (non-empty array)
                      && !unreviewedProductIds.has(productId); // Product explicitly not in unreviewed list
                    
                    if (isReviewed) {
                      return (
                        <span className="text-xs text-secondary-500">Đã đánh giá</span>
                      );
                    }
                    
                    return (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const productName = item.product?.name || item.productName || "Sản phẩm";
                          onReviewClick(productId, productName);
                        }}
                      >
                        Đánh giá
                      </Button>
                    );
                  })()}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

