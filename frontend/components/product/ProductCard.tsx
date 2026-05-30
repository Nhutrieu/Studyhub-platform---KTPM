"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button"; // Use new Button component
import { FiShoppingCart, FiHeart } from "react-icons/fi";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { cartService } from "@/services/cartService";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/imageUtils";

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  showActions?: boolean;
  index?: number;
}

export default function ProductCard({
  product,
  onClick,
  showActions = true,
  index = 0,
}: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
      router.push(`/auth/login?redirect=/products/${product.id}`);
      return;
    }

    try {
      addItem({
        productId: product.id,
        product,
        quantity: 1,
        price: discountedPrice,
      });
      await cartService.addToCart(product.id, 1);
      toast.success("Đã thêm vào giỏ hàng");
    } catch (error) {
      toast.error("Không thể thêm vào giỏ hàng");
      console.error("Add to cart error:", error);
    }
  };

  const images = (product.images || []).map(
    (img) => normalizeImageUrl(img) || img
  );
  const hasMultipleImages = images.length > 1;

  const hasDiscount = Boolean(
    product.discount && product.discount > 0 && product.price > 0
  );
  const discountedPrice = hasDiscount
    ? Math.max(product.price - (product.discount || 0), 0)
    : product.price;
  // Calculate discount percentage based on original price
  const discountPercent = hasDiscount
    ? Math.round(((product.discount || 0) / product.price) * 100)
    : 0;

  return (
    <Link
      href={`/products/${product.id}`}
      onClick={onClick}
      className="group block h-full isolate"
      onMouseEnter={() => {
        setIsHovered(true);
        if (hasMultipleImages && imageIndex === 0) {
          setImageIndex(1);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setImageIndex(0);
      }}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div
        className={cn(
          "bg-white rounded-2xl overflow-hidden h-full flex flex-col",
          "transition-all duration-300 ease-out",
          "hover:shadow-float hover:-translate-y-2",
          "border border-secondary-200/60 hover:border-primary-300/60",
          "hover:ring-1 hover:ring-primary-100",
          "card-hover-lift animate-fade-in"
        )}
      >
        {/* Image Container */}
        <div className="relative w-full aspect-[4/5] bg-gradient-to-br from-secondary-50 to-secondary-100 overflow-hidden">
          {images[imageIndex] && !imageErrors.has(images[imageIndex]) ? (
            <Image
              src={images[imageIndex]}
              alt={product.name}
              fill
              className={cn(
                "object-cover transition-transform duration-700 ease-out",
                isHovered ? "scale-110" : "scale-100"
              )}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => {
                setImageErrors((prev) => new Set(prev).add(images[imageIndex]));
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-secondary-400 bg-secondary-100">
              <span className="text-sm font-medium">Chưa có ảnh</span>
              <span className="text-xs text-secondary-300">FurniMart</span>
            </div>
          )}

          {/* Overlay Actions (Desktop) */}
          {showActions && (
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 via-black/50 to-transparent",
                "translate-y-full group-hover:translate-y-0 transition-all duration-350 ease-out",
                "flex gap-2 justify-center opacity-0 group-hover:opacity-100"
              )}
            >
              <Button
                variant="primary"
                size="sm"
                className="w-full shadow-lg shadow-primary-500/30 rounded-full font-semibold"
                onClick={handleAddToCart}
              >
                <FiShoppingCart className="mr-2" /> Thêm vào giỏ
              </Button>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {discountPercent > 0 && (
              <Badge
                variant="danger"
                className="bg-gradient-to-br from-error to-red-700 text-white font-bold shadow-md shadow-error/30 rounded-full px-3.5 py-1.5 text-xs ring-2 ring-white/20"
              >
                -{discountPercent}%
              </Badge>
            )}
            {product.isFeatured && (
              <Badge
                variant="success"
                className="bg-gradient-to-br from-accent-500 to-accent-600 text-white font-semibold shadow-md shadow-accent-500/30 rounded-full px-3.5 py-1.5 text-xs ring-2 ring-white/20"
              >
                HOT
              </Badge>
            )}
          </div>

          {showActions && (
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm text-secondary-600 shadow-md transition-all duration-300 hover:text-red-500 hover:bg-white hover:scale-110 hover:shadow-lg"
              aria-label="Yêu thích"
            >
              <FiHeart className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col bg-white">
          <div className="mb-3">
            {product.category && typeof product.category === "object" && (
              <p className="text-xs text-primary-600 mb-2 font-semibold tracking-wider uppercase">
                {product.category.name}
              </p>
            )}
            <h3
              className={cn(
                "font-bold text-secondary-900 text-base leading-snug line-clamp-2 mb-2",
                "group-hover:text-primary-700 transition-colors duration-300"
              )}
            >
              {product.name}
            </h3>
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-secondary-900">
                {formatCurrency(discountedPrice)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-secondary-500 line-through font-semibold">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>

            {/* Rating & Colors */}
            <div className="flex items-center justify-between pt-2 border-t border-secondary-100">
              {product.rating ? (
                <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-sm text-secondary-900 border border-yellow-200">
                  <span className="text-yellow-500 text-base font-bold">★</span>
                  <span className="font-bold text-secondary-900">
                    {product.rating.toFixed(1)}
                  </span>
                  <span className="text-secondary-600 text-xs font-medium">
                    ({product.reviewCount || 0})
                  </span>
                </div>
              ) : (
                <div />
              )}

              {product.colors && product.colors.length > 0 && (
                <div className="flex -space-x-1.5 overflow-hidden">
                  {product.colors.slice(0, 3).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-secondary-100"
                      style={{
                        backgroundColor:
                          color.toLowerCase() === "đen"
                            ? "#000"
                            : color.toLowerCase() === "trắng"
                            ? "#fff"
                            : "#888",
                      }} // Simplified color logic
                      title={color}
                    />
                  ))}
                  {product.colors.length > 3 && (
                    <div className="w-4 h-4 rounded-full bg-secondary-100 border border-white flex items-center justify-center text-[8px] text-secondary-600 font-medium">
                      +
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
