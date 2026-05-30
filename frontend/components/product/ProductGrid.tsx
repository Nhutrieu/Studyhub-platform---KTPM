"use client";

import { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { FiPackage } from "react-icons/fi";

interface ProductGridProps {
  products?: Product[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
  showActions?: boolean;
}

export default function ProductGrid({
  products,
  isLoading,
  columns = 4,
  showActions = true,
}: ProductGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-6 w-full max-w-full`}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-md" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={<FiPackage className="w-16 h-16 text-secondary-300" />}
        title="Không tìm thấy sản phẩm"
        description="Thử thay đổi bộ lọc hoặc tìm kiếm khác"
      />
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-7 w-full max-w-full`}>
      {products.map((product, index) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          showActions={showActions}
          index={index}
        />
      ))}
    </div>
  );
}

