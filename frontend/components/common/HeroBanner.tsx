"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/imageUtils";

interface HeroBannerProps {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  className?: string;
}

export default function HeroBanner({
  imageUrl,
  title = "Bảo Hành Dài Nhất",
  subtitle = "Ngành Nội Thất Việt",
  description = "5 Năm An Tâm, Đồng Hành Cùng Bạn",
  buttonText = "Xem Chi Tiết",
  buttonLink = "/products",
  className,
}: HeroBannerProps) {
  const [errorUrl, setErrorUrl] = useState<string | null>(null);

  const normalizedImageUrl = useMemo(
    () => normalizeImageUrl(imageUrl) || undefined,
    [imageUrl]
  );

  const imageError = normalizedImageUrl ? errorUrl === normalizedImageUrl : false;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden animate-fade-in",
        // Warm gradient background - subtle stone/beige tones
        "bg-gradient-to-br from-stone-50 via-stone-100/50 to-amber-50/30",
        className
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[550px] lg:min-h-[650px]">
        {/* Left Content */}
        <div className="flex flex-col justify-center px-6 md:px-16 lg:px-28 py-20 order-2 lg:order-1 relative z-10">
          <div
            className={cn(
              "space-y-8 max-w-xl transition-all duration-700 transform translate-y-0 opacity-100"
            )}
          >
            {/* Editorial Headline */}
            <div className="space-y-5">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-stone-900 leading-[1.05] tracking-[-0.02em]">
                {title}
              </h1>
              <p className="text-2xl md:text-3xl text-stone-500 font-light leading-[1.3] tracking-wide">
                {subtitle}
              </p>
            </div>

            {/* Subtle description */}
            <p className="text-base md:text-lg text-stone-600 leading-relaxed font-normal max-w-md pt-2">
              {description}
            </p>

            {/* Single focused CTA */}
            <div className="pt-4">
              <Link href={buttonLink}>
                <Button
                  variant="primary"
                  size="lg"
                  className="px-8 py-6 text-base font-medium tracking-wide shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {buttonText}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="relative w-full h-[450px] lg:h-auto order-1 lg:order-2">
          {normalizedImageUrl && !imageError ? (
            <>
              <Image
                src={normalizedImageUrl}
                alt={title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={() => setErrorUrl(normalizedImageUrl)}
              />
              {/* Warm overlay for cohesion */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-50/80 via-transparent to-transparent lg:bg-gradient-to-l lg:from-stone-50/60 lg:via-transparent lg:to-transparent opacity-90" />
            </>
          ) : (
            <div className="w-full h-full bg-stone-200 flex items-center justify-center">
              <span className="text-6xl opacity-20">🛋️</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
